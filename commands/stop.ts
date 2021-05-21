import { CommandInteraction } from 'discord.js';
import { stopBuilding } from '../services/buildService';
import { isOwner, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  stopBuilding();
  await interaction.reply('Rebuild stopped', { ephemeral: true });
}
