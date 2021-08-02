import {
  ActivitiesOptions,
  ActivityOptions,
  Channel,
  Client, DMChannel, Intents, Message, MessageOptions, NewsChannel, TextChannel, User
} from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import { getLinkedChannels, getCurrentMapIndex } from './settingsService';
import handleCommand, { getCommandData } from '../commands/manager';
import Command from '../enums/command';
import { tryGetBeatmapFromMessage } from '../commands/utils';
import { createDatabase, getCountryScores, handleCountryScores } from './buildService';
import { getMapIds } from './databaseService';

const DEFAULT_ACTIVITY: ActivitiesOptions = {
  type: 'WATCHING',
  name: 'you miss'
};

const bot = new Client({
  allowedMentions: {
    parse: ['roles', 'users']
  },
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
  ],
  presence: {
    activities: [DEFAULT_ACTIVITY]
  }
});

bot.on('raw', (event: RawEvent) => {
  if (event.t !== 'MESSAGE_REACTION_ADD') return;
  handleCommand(Command.REACTION, undefined, event).catch((error) => console.error(error));
});

bot.on('message', (message) => {
  const beatmapId = tryGetBeatmapFromMessage(message, bot.user?.id || null);
  if (!beatmapId) return;

  getCountryScores(beatmapId)
    .then((data) => {
      if (!data) return;
      handleCountryScores(data).catch((error) => console.error(error));
    })
    .catch((error) => console.error(error));
});

bot.on('interaction', (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;
  const command: Command | undefined = Command[commandName.toUpperCase() as keyof typeof Command];
  if (!command) return;

  handleCommand(command, interaction).catch((error) => console.error(error));
});

bot.once('ready', () => {
  getCommandData().forEach((command) => {
    bot.application?.commands?.create(command)
      .catch((error) => console.error(error));
  });
});

bot.on('ready', () => {
  console.info('Bot running');
  const curIndex = getCurrentMapIndex();
  if (curIndex === 0) return;

  // Continue rebuilding from the last saved index
  getMapIds().then((rows) => {
    createDatabase(rows, curIndex)
      .catch((error) => console.error(error));
  }).catch((error) => console.error(error));
});

export function getBotId(): string | undefined {
  return bot.user?.id;
}

export async function send(
  channel: TextChannel | DMChannel | NewsChannel,
  content: MessageOptions
): Promise<Message | Message[]> {
  return channel.send(content);
}

export function publish(message: MessageOptions): Promise<(Message | Message[])[]> {
  const promises = getLinkedChannels().reduce((result, channelId) => {
    const channel = bot.channels.cache.get(channelId);
    if (
      !(channel instanceof TextChannel)
      && !(channel instanceof DMChannel)
      && !(channel instanceof NewsChannel)
    ) return result;

    result.push(send(channel, message));
    return result;
  }, [] as Promise<Message | Message[]>[]);

  return Promise.all(promises);
}

export function getUser(userId: string): Promise<User | null> {
  const user = bot.users.cache.get(userId);
  if (user) return Promise.resolve(user);

  return bot.users.fetch(userId);
}

export function getChannel(channelId: string): Promise<Channel | null> {
  const channel = bot.channels.cache.get(channelId);
  if (channel) return Promise.resolve(channel);

  return bot.channels.fetch(channelId);
}

export async function login(): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) throw Error('BOT_TOKEN environment variable not defined!');

  await bot.login(botToken);
}

export function setActivity(options: ActivityOptions = DEFAULT_ACTIVITY): void {
  bot.user?.setActivity(options);
}
