import { CommandInteraction } from 'discord.js';
import { getCountryScores, handleCountryScores } from '../services/buildService';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const beatmapId = interaction.options[0].value as number;
  const scores = await getCountryScores(beatmapId.toString());

  if (scores === null || scores.length === 0) {
    await interaction.reply('No scores found');
    return;
  }

  const result = await handleCountryScores(scores);
  if (result) await interaction.reply(result.content, result.embed);
  else await interaction.reply('Done!', { ephemeral: true });
}
