import {
  CommandInteraction, DMChannel, TextChannel
} from 'discord.js';
import {
  isMod, isOwner, replyWithInvalidChannel, replyWithNoPermission
} from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isMod(interaction.member) && !isOwner(interaction.user.id)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const content = interaction.options[0].value || '';

  if (
    !(interaction.channel instanceof TextChannel)
    && !(interaction.channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  await interaction.reply('Done!', { ephemeral: true });
  await interaction.channel.send(content);
}
