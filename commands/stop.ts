import { CommandInteraction } from 'discord.js';
import { stopBuilding } from '../services/buildService';
import { replyToInteraction } from './manager';
import { isMod, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isMod(interaction.member)) {
    await replyWithNoPermission(interaction);
    return;
  }

  stopBuilding();
  await replyToInteraction(interaction, { content: 'Rebuild stopped', ephemeral: true });
}
