import { CommandInteraction } from 'discord.js';
import { SnipeOptions } from '../enums/command';
import { getCountryScores, handleCountryScores } from '../services/buildService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const beatmapId = interaction.options.getInteger(SnipeOptions.beatmap.name, true);
  const scores = await getCountryScores(beatmapId.toString());

  if (scores === null || scores.length === 0) {
    await replyToInteraction(interaction, { content: 'No scores found' });
    return;
  }

  const result = await handleCountryScores(scores);
  if (result) {
    await replyToInteraction(interaction, { content: result.content, embeds: result.embeds });
  } else await replyToInteraction(interaction, { content: 'Done!', ephemeral: true });
}
