import { CommandInteraction } from 'discord.js';
import { addLinkedChannel } from '../services/settingsService';
import { replyToInteraction } from './manager';
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
  if (added) await replyToInteraction(interaction, 'This channel can now be used by the bot', { ephemeral: true });
  else await replyToInteraction(interaction, 'This channel is already linked', { ephemeral: true });
}
