import { CommandInteraction } from 'discord.js';
import settingsService from '../services/settingsService';
import { replyToInteraction } from './manager';
import {
  isMod, replyWithInvalidChannel, replyWithNoPermission
} from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (interaction.channel === null) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  if (!isMod(interaction.member)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const removed = settingsService.removeLinkedChannel(interaction.channel.id);
  if (removed) await replyToInteraction(interaction, { content: 'This channel was unlinked', ephemeral: true });
  else await replyToInteraction(interaction, { content: 'This channel is not linked', ephemeral: true });
}
