import { CommandInteraction, DMChannel, TextChannel } from 'discord.js';
import { getOrCreateDMChannel, replyWithInvalidChannel } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
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
  await channel.send(`${content as string} has been deleted!`);
}
