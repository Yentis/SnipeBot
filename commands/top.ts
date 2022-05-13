import { CommandInteraction } from 'discord.js';
import { TopOptions } from '../enums/command';
import { getFirstPlaceTop } from '../services/databaseService';
import { replyToInteraction } from './manager';
import { getModeFromOptions } from './utils';

async function getRankings(size: number, mode: number) {
  const rows = await getFirstPlaceTop(mode, size);
  const results = rows.map((row, i) => `${i + 1}. ${row.playerName} - ${row.count}`);

  return results.join('\n');
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const amount = interaction.options.getInteger(TopOptions.count.name, true);
  const topCount = Math.min(100, Math.max(1, amount));

  const mode = getModeFromOptions(interaction);
  const results = await getRankings(topCount, mode);

  if (results !== '') await replyToInteraction(interaction, { content: results });
  else await replyToInteraction(interaction, { content: 'No users found' });
}
