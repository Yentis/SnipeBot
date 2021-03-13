import { Message } from 'discord.js';
import Command from '../enums/command';
import { send } from '../services/discordService';
import { COMMAND_PREFIX } from '../services/settingsService';

export default async function run(message: Message): Promise<void> {
  const echoContent = message.content.substring(
    COMMAND_PREFIX.length + Command[Command.DELETE].length,
    message.content.length
  );

  await send(
    message.channel,
    `${echoContent} has been DELETED!`
  );

  try {
    await message.delete();
  } catch (error) {
    // Don't care if we can't delete it
  }
}
