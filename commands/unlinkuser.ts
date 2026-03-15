import { CommandInteraction } from 'discord.js';
import userLinkingService from '../services/userLinkingService';
import { replyToInteraction } from './manager';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const unlinked = userLinkingService.unlinkUser(interaction.user.id);

  if (unlinked) await replyToInteraction(interaction, { content: 'You have been unlinked' });
  else await replyToInteraction(interaction, { content: 'You are not currently linked' });
}
