import { Message } from 'discord.js';
import { getProgressMessage } from '../services/buildService';
import { send } from '../services/discordService';

export default async function run(message: Message): Promise<void> {
  const progressMessage = getProgressMessage(message.channel.id);
  if (!progressMessage) {
    await send(message.channel, 'Currently not rebuilding.');
    return;
  }

  const guildId = progressMessage.guild?.id;
  if (!guildId) {
    await send(message.channel, 'Could not find server belonging to progress message.');
    return;
  }

  await send(
    message.channel,
    `https://discordapp.com/channels/${guildId}/${progressMessage.channel.id}/${progressMessage.id}`
  );
}
