import { Message } from 'discord.js';
import { getParamsFromMessage } from './utils';
import { getUser } from '../services/osuApiService';
import { getFirstPlacesForPlayer, getMapsWithNoScores } from '../services/databaseService';
import { send } from '../services/discordService';
import User from '../classes/user';

async function countThroughMapIds(user: User | null, mode: number) {
  const userId = user ? parseInt(user.userId, 10) : null;

  let rows;
  if (userId) {
    rows = await getFirstPlacesForPlayer(userId, mode);
  } else {
    rows = await getMapsWithNoScores(mode);
  }

  return rows.length;
}

export default async function run(message: Message): Promise<void> {
  const params = await getParamsFromMessage(message);
  if (!params.username) {
    await send(message.channel, 'Please enter a valid username.');
    return;
  }

  const user = params.username === 'unclaimed' ? null : await getUser(params.username);
  const username = user?.username;

  const count = await countThroughMapIds(user, params.mode);
  if (count === 0) {
    await send(
      message.channel,
      !username ? 'All maps have a #1 score.' : `${username} does not have any #1 scores.`
    );
    return;
  }

  if (!username) {
    await send(message.channel, `There are ${count} maps with no #1 score.`);
    return;
  }

  await send(message.channel, `${username} is first place on ${count} maps.`);
}
