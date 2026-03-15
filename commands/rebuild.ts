import { CommandInteraction } from 'discord.js';
import databaseService from '../services/databaseService';
import settingsService from '../services/settingsService';
import { isOwner, replyWithNoPermission } from './utils';
import { createDatabase } from '../services/buildService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  settingsService.setCurrentMapIndex(0);
  settingsService.clearFailedIds();
  const mapIds = await databaseService.getMapIds();

  await replyToInteraction(interaction, { content: 'Rebuild started', ephemeral: true });
  createDatabase(mapIds).catch(console.error);
}
