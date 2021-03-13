import { Message } from 'discord.js';
import { getFirstPlaceTop } from '../services/databaseService';
import { send } from '../services/discordService';
import { COMMAND_PREFIX } from '../services/settingsService';
import { getParamsFromMessage } from './utils';

async function getRankings(size: number, mode: number) {
  const rows = await getFirstPlaceTop(mode, size);
  const results = rows.map((row, i) => `${i + 1}. ${row.playerName} - ${row.count}`);

  return results.join('\n');
}

export default async function run(message: Message): Promise<void> {
  const command = message.content.split(' ')[0];
  const amount = parseInt(command.replace(`${COMMAND_PREFIX}top`, ''), 10);

  if (!Number.isInteger(amount)) {
    await send(message.channel, 'Invalid top count');
    return;
  }

  const params = await getParamsFromMessage(message);
  const topCount = Math.min(100, Math.max(1, amount));

  const results = await getRankings(topCount, params.mode);
  await send(message.channel, results);
}
