import { Message } from 'discord.js';
import { send } from '../services/discordService';
import { unlinkUser } from '../services/userLinkingService';

export default async function run(message: Message): Promise<void> {
  const unlinked = unlinkUser(message.author.id);

  if (unlinked) await send(message.channel, 'You have been unlinked.');
  else await send(message.channel, 'You are not currently linked.');
}
