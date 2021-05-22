import { CommandInteraction } from 'discord.js';
import { addLinkedChannel } from '../services/settingsService';
import { isMod, replyWithInvalidChannel, replyWithNoPermission } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (interaction.channel === null) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  if (!isMod(interaction.member)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const added = addLinkedChannel(interaction.channel.id);
  if (added) await interaction.reply('This channel can now be used by the bot', { ephemeral: true });
  else await interaction.reply('This channel is already linked', { ephemeral: true });
}
