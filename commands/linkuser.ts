import { Message } from 'discord.js';
import { send } from '../services/discordService';
import { getUser } from '../services/osuApiService';
import { linkUser } from '../services/userLinkingService';
import { getParamsFromMessage } from './utils';

export default async function run(message: Message): Promise<void> {
  const params = await getParamsFromMessage(message);
  if (!params.username) {
    await send(message.channel, 'Please enter a valid username.');
    return;
  }

  const user = await getUser(params.username);
  if (!user) {
    await send(message.channel, 'User was not found.');
    return;
  }

  const linked = linkUser(message.author.id, parseInt(user.userId, 10));
  if (linked) await send(message.channel, `Linked <@${message.author.id}> to osu! user ${user.username}`);
  else await send(message.channel, 'You are already linked to this osu! user.');
}
