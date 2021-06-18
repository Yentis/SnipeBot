import { CommandInteraction } from 'discord.js';
import { getCountryScores, handleCountryScores } from '../services/buildService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const beatmapId = interaction.options[0].value as number;
  const scores = await getCountryScores(beatmapId.toString());

  if (scores === null || scores.length === 0) {
    await replyToInteraction(interaction, 'No scores found');
    return;
  }

  const result = await handleCountryScores(scores);
  if (result) await replyToInteraction(interaction, result.content, result.embed);
  else await replyToInteraction(interaction, 'Done!', { ephemeral: true });
}
