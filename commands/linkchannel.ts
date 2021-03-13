import { DMChannel, Message } from 'discord.js';
import { send } from '../services/discordService';
import { addLinkedChannel } from '../services/settingsService';
import { isMod } from './utils';

export default async function run(message: Message): Promise<void> {
  if (message.channel instanceof DMChannel || !isMod(message)) return;

  const added = addLinkedChannel(message.channel.id);
  if (added) await send(message.channel, 'This channel can now be used by the bot.');
}
