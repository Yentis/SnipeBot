import { CommandInteraction } from 'discord.js';
import { getMapIds } from '../services/databaseService';
import { clearFailedIds, setCurrentMapIndex } from '../services/settingsService';
import { isMod, isOwner, replyWithNoPermission } from './utils';
import { createDatabase } from '../services/buildService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isMod(interaction.member) && !isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  setCurrentMapIndex(0);
  clearFailedIds();
  const mapIds = await getMapIds();

  await replyToInteraction(interaction, { content: 'Rebuild started', ephemeral: true });
  createDatabase(mapIds).catch(console.error);
}
