import { CommandInteraction, DMChannel } from 'discord.js';
import { addLinkedChannel } from '../services/settingsService';
import { isMod, replyWithNoPermission, replyWithNotAvailableDM } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (interaction.channel instanceof DMChannel) {
    await replyWithNotAvailableDM(interaction);
    return;
  }

  if (!isMod(interaction.member)) {
    await replyWithNoPermission(interaction);
    return;
  }

  if (interaction.channel === null) {
    await interaction.reply('No valid channel found', { ephemeral: true });
    return;
  }

  const added = addLinkedChannel(interaction.channel.id);
  if (added) await interaction.reply('This channel can now be used by the bot', { ephemeral: true });
  else await interaction.reply('This channel is already linked', { ephemeral: true });
}
