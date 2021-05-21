import { CommandInteraction, DMChannel } from 'discord.js';
import { removeLinkedChannel } from '../services/settingsService';
import {
  isMod, replyWithInvalidChannel, replyWithNoPermission, replyWithNotAvailableDM
} from './utils';

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
    await replyWithInvalidChannel(interaction);
    return;
  }

  const removed = removeLinkedChannel(interaction.channel.id);
  if (removed) await interaction.reply('This channel was unlinked', { ephemeral: true });
  else await interaction.reply('This channel is not linked', { ephemeral: true });
}
