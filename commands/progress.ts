import { CommandInteraction } from 'discord.js';
import { getProgressMessage } from '../services/buildService';
import { replyToInteraction } from './manager';
import { replyWithInvalidChannel } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (interaction.channel === null) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  const progressMessage = getProgressMessage(interaction.channel.id);
  if (progressMessage === null) {
    await replyToInteraction(interaction, { content: 'Currently not rebuilding' });
    return;
  }

  const guildId = progressMessage.guild?.id;
  if (guildId === undefined) {
    await replyToInteraction(interaction, { content: 'Could not find server belonging to progress message', ephemeral: true });
    return;
  }

  await replyToInteraction(interaction, { content: `https://discordapp.com/channels/${guildId}/${progressMessage.channel.id}/${progressMessage.id}` });
}
