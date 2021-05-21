import { CommandInteraction } from 'discord.js';
import { getCountryScores, handleCountryScores } from '../services/buildService';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const beatmapId = interaction.options[0].value as number;
  const data = await getCountryScores(beatmapId.toString());

  if (data === null || data.scores.length === 0) {
    await interaction.reply('No scores found');
    return;
  }

  const result = await handleCountryScores(data);
  if (result) await interaction.reply(result);
  else await interaction.reply('Done!', { ephemeral: true });
}
