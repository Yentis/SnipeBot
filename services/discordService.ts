import {
  Channel,
  Client, DMChannel, Message, NewsChannel, TextChannel, User
} from 'discord.js';
import RawEvent from '../interfaces/rawEvent';
import { getLinkedChannels, getCurrentMapIndex, COMMAND_PREFIX } from './settingsService';
import handleCommand from '../commands/manager';
import Command from '../enums/command';
import { tryGetBeatmapFromMessage } from '../commands/utils';
import { createDatabase, getCountryScores, handleCountryScores } from './buildService';
import { getMapIds } from './databaseService';

const bot = new Client();

bot.on('raw', (event: RawEvent) => {
  if (event.t !== 'MESSAGE_REACTION_ADD') return;
  handleCommand(Command.REACTION, undefined, event).catch((error) => console.error(error));
});

bot.on('message', (message) => {
  const beatmapId = tryGetBeatmapFromMessage(message, bot.user?.id || null);
  if (beatmapId) {
    getCountryScores(beatmapId)
      .then((data) => {
        if (!data) return;
        handleCountryScores(data).catch((error) => console.error(error));
      })
      .catch((error) => console.error(error));
    return;
  }
  if (!message.content.startsWith(COMMAND_PREFIX)) return;

  // Remove the command prefix and any digits (for the top command)
  const commandText = message.content.split(' ')[0].replace(COMMAND_PREFIX, '').replace(/[0-9]/g, '');
  const command: Command | undefined = Command[commandText.toUpperCase() as keyof typeof Command];
  if (!command) return;

  message.channel.startTyping().catch((error) => console.error(error));
  handleCommand(command, message)
    .catch((error) => console.error(error))
    .finally(() => message.channel.stopTyping());
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
  content: string,
  attachment?: string,
  attachmentName?: string
): Promise<Message> {
  if (!attachment || !attachmentName) {
    return channel.send(content, {
      split: false,
      disableMentions: 'everyone'
    });
  }

  return channel.send(
    content,
    {
      split: false,
      disableMentions: 'everyone',
      files: [{ attachment: Buffer.from(attachment), name: attachmentName }]
    }
  );
}

export function publish(message: string): Promise<Message[]> {
  const promises = getLinkedChannels().reduce((result, channelId) => {
    const channel = bot.channels.cache.get(channelId);
    if (
      !(channel instanceof TextChannel)
      && !(channel instanceof DMChannel)
      && !(channel instanceof NewsChannel)
    ) return result;

    result.push(send(channel, message));
    return result;
  }, [] as Promise<Message>[]);

  return Promise.all(promises);
}

export function getUser(userId: string): User | undefined {
  return bot.users.cache.get(userId);
}

export function getChannel(channelId: string): Channel | undefined {
  return bot.channels.cache.get(channelId);
}

export async function login(): Promise<void> {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) throw Error('BOT_TOKEN environment variable not defined!');

  await bot.login(botToken);
}
