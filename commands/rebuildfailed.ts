import { CommandInteraction } from 'discord.js';
import { createDatabase } from '../services/buildService';
import { getFailedIds } from '../services/settingsService';
import { replyToInteraction } from './manager';
import { isOwner, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const failedIds = getFailedIds();
  if (failedIds.length === 0) {
    await replyToInteraction(interaction, 'Nothing to rebuild');
    return;
  }

  await replyToInteraction(interaction, 'Rebuild started', { ephemeral: true });
  createDatabase(failedIds.slice(0), 0, true).catch((error) => console.error(error));
}
