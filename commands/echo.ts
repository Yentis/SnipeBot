import { Message } from 'discord.js';
import Command from '../enums/command';
import { send } from '../services/discordService';
import { COMMAND_PREFIX } from '../services/settingsService';
import { isMod, isOwner } from './utils';

export default async function run(message: Message): Promise<void> {
  if (!isMod(message) && !isOwner(message)) return;
  const echoContent = message.content.substring(
    COMMAND_PREFIX.length + Command[Command.ECHO].length,
    message.content.length
  );

  await send(
    message.channel,
    echoContent
  );

  try {
    await message.delete();
  } catch (error) {
    // Don't care if we can't delete it
  }
}
