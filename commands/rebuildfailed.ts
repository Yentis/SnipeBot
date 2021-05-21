import { CommandInteraction } from 'discord.js';
import { createDatabase } from '../services/buildService';
import { getFailedIds } from '../services/settingsService';
import { isOwner, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const failedIds = getFailedIds();
  if (failedIds.length === 0) {
    await interaction.reply('Nothing to rebuild');
    return;
  }

  await interaction.reply('Rebuild started', { ephemeral: true });
  await createDatabase(failedIds.slice(0), 0, true);
}
