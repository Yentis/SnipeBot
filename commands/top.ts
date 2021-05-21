import { CommandInteraction } from 'discord.js';
import { getFirstPlaceTop } from '../services/databaseService';
import { getModeFromOptions } from './utils';

async function getRankings(size: number, mode: number) {
  const rows = await getFirstPlaceTop(mode, size);
  const results = rows.map((row, i) => `${i + 1}. ${row.playerName} - ${row.count}`);

  return results.join('\n');
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const amount = interaction.options[0].value as number;
  const topCount = Math.min(100, Math.max(1, amount));

  const mode = getModeFromOptions(interaction.options);
  const results = await getRankings(topCount, mode);

  if (results !== '') await interaction.reply(results);
  else await interaction.reply('No users found');
}
