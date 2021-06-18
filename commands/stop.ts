import { CommandInteraction } from 'discord.js';
import { stopBuilding } from '../services/buildService';
import { replyToInteraction } from './manager';
import { isOwner, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  stopBuilding();
  await replyToInteraction(interaction, 'Rebuild stopped', { ephemeral: true });
}
