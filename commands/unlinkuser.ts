import { CommandInteraction } from 'discord.js';
import { unlinkUser } from '../services/userLinkingService';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const unlinked = unlinkUser(interaction.user.id);

  if (unlinked) await interaction.reply('You have been unlinked');
  else await interaction.reply('You are not currently linked');
}
