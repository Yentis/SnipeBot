import {
  ActivitiesOptions,
  ActivityOptions,
  AnyChannel,
  Client,
  DMChannel,
  Intents,
  Message,
  MessageOptions,
  NewsChannel,
  Options,
  TextChannel,
  User,
} from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import settingsService from './settingsService';
import handleCommand, { getCommandData, replyToInteraction } from '../commands/manager';
import Command from '../enums/command';
import { tryGetBeatmapFromMessage } from '../commands/utils';
import { createDatabase, getCountryScores, handleCountryScores } from './buildService';
import databaseService from './databaseService';
import { Service } from '../interfaces/service';

const DEFAULT_ACTIVITY: ActivitiesOptions = {
  type: 'WATCHING',
  name: 'you miss',
};

class DiscordService extends Service {
  private bot?: Client;

  async start(): Promise<void> {
    this.bot = new Client({
      allowedMentions: {
        parse: ['roles', 'users'],
      },
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
      ],
      presence: {
        activities: [DEFAULT_ACTIVITY],
      },
      makeCache: Options.cacheWithLimits({
        ...Options.defaultMakeCacheSettings,
        MessageManager: 0,
      }),
    });

    this.bot.on('raw', (event: RawEvent) => {
      if (event.t !== 'MESSAGE_REACTION_ADD') return;
      handleCommand(Command.REACTION, undefined, event).catch(console.error);
    });

    this.bot.on('messageCreate', (message) => {
      const beatmapId = tryGetBeatmapFromMessage(message, this.bot?.user?.id || null);
      if (!beatmapId) return;

      getCountryScores(beatmapId)
        .then((scores) => {
          if (!scores) return;
          return handleCountryScores(scores);
        })
        .catch(console.error);
    });

    this.bot.on('interactionCreate', (interaction) => {
      if (!interaction.isCommand()) return;

      const { commandName } = interaction;
      const command: Command | undefined = Command[commandName.toUpperCase() as keyof typeof Command];
      if (command === undefined) return;

      handleCommand(command, interaction).catch((error) => {
        console.error(error);
        replyToInteraction(interaction, { content: 'Something went wrong' }).catch(console.error);
      });
    });

    this.bot.once('ready', () => {
      this.createCommands().catch(console.error);
    });

    this.bot.on('ready', () => {
      console.info('Bot running');
      const curIndex = settingsService.getCurrentMapIndex();
      if (curIndex === 0) return;

      // Continue rebuilding from the last saved index
      databaseService.getMapIds()
        .then((rows) => createDatabase(rows, curIndex))
        .catch(console.error);
    });

    this.bot.on('error', (error) => {
      console.error(error);
    });

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw Error('BOT_TOKEN environment variable not defined!');

    await this.bot?.login(botToken);
  }

  private async createCommands(): Promise<void> {
    const createPromises = getCommandData().map((command) => {
      return this.bot?.application?.commands?.create(command);
    });

    await Promise.all(createPromises);
  }

  getBotId(): string | undefined {
    return this.bot?.user?.id;
  }

  async publish(message: MessageOptions): Promise<(Message | Message[])[]> {
    const channels = await Promise.all(settingsService.getLinkedChannels().map((channelId) => this.bot?.channels.cache.get(channelId)));

    const sendableChannels = channels.filter((channel) => {
      return channel instanceof TextChannel || channel instanceof DMChannel || channel instanceof NewsChannel;
    });

    const messages: (Message | Message[])[] = [];

    for (const channel of sendableChannels) {
      try {
        const result = await (channel as TextChannel).send(message);
        messages.push(result);
      } catch (ignored) {
      }
    }

    return messages;
  }

  async getUser(userId: string): Promise<User | null> {
    const user = this.bot?.users.cache.get(userId);
    if (user) return user;

    return await this.bot?.users.fetch(userId) ?? null;
  }

  async getChannel(channelId: string): Promise<AnyChannel | null> {
    const channel = this.bot?.channels.cache.get(channelId);
    if (channel) return channel;

    return await this.bot?.channels.fetch(channelId) ?? null;
  }

  setActivity(options: ActivityOptions = DEFAULT_ACTIVITY): void {
    this.bot?.user?.setActivity(options);
  }

  override stop(): void {
    this.bot?.destroy();
    this.bot = undefined;
  }
}

const discordService = new DiscordService();
export default discordService;
