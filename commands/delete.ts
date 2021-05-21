import { CommandInteraction, DMChannel, TextChannel } from 'discord.js';
import { replyWithInvalidChannel } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const content = interaction.options[0].value || '';

  if (
    !(interaction.channel instanceof TextChannel)
    && !(interaction.channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  await interaction.reply('Done!', { ephemeral: true });
  await interaction.channel.send(`${content as string} has been deleted!`);
}
