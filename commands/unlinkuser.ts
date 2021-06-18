import { CommandInteraction } from 'discord.js';
import { unlinkUser } from '../services/userLinkingService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const unlinked = unlinkUser(interaction.user.id);

  if (unlinked) await replyToInteraction(interaction, 'You have been unlinked');
  else await replyToInteraction(interaction, 'You are not currently linked');
}
