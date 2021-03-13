import { DMChannel, Message } from 'discord.js';
import { send } from '../services/discordService';
import { removeLinkedChannel } from '../services/settingsService';
import { isMod, sendNoPermissionMessage } from './utils';

export default async function run(message: Message): Promise<void> {
  if (message.channel instanceof DMChannel) return;
  if (!isMod(message)) {
    await sendNoPermissionMessage(message);
    return;
  }

  const removed = removeLinkedChannel(message.channel.id);
  if (removed) await send(message.channel, 'This channel was unlinked.');
}
