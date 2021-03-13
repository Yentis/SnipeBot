import { Message } from 'discord.js';
import { getCountryScores, handleCountryScores } from '../services/buildService';
import { send } from '../services/discordService';

export default async function run(message: Message): Promise<void> {
  const split = message.content.split(' ');
  if (split.length < 2 || !Number.isInteger(parseInt(split[1], 10))) {
    await send(message.channel, 'Please enter a valid map ID');
    return;
  }

  const beatmapId = split[1];
  const data = await getCountryScores(beatmapId);
  if (!data || data.scores.length === 0) {
    await send(message.channel, 'No scores found.');
    return;
  }

  const result = await handleCountryScores(data);
  if (result) await send(message.channel, result);
}
