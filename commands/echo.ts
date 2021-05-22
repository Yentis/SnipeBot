import {
  CommandInteraction, DMChannel, TextChannel
} from 'discord.js';
import {
  getOrCreateDMChannel,
  isMod, isOwner, replyWithInvalidChannel, replyWithNoPermission
} from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isMod(interaction.member) && !isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const content = interaction.options[0].value || '';
  const channel = interaction.channel
    || await getOrCreateDMChannel(interaction.channelID, interaction.user);

  if (
    !(channel instanceof TextChannel)
    && !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  await interaction.reply('Done!', { ephemeral: true });
  await channel.send(content);
}
