import { CommandInteraction } from 'discord.js';
import { getMapIds } from '../services/databaseService';
import { clearFailedIds, setCurrentMapIndex } from '../services/settingsService';
import { isOwner, replyWithNoPermission } from './utils';
import { createDatabase } from '../services/buildService';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  setCurrentMapIndex(0);
  clearFailedIds();
  const mapIds = await getMapIds();

  await interaction.reply('Rebuild started', { ephemeral: true });
  await createDatabase(mapIds);
}
