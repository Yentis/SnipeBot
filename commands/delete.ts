import { CommandInteraction, DMChannel, TextChannel } from 'discord.js';
import { DeleteOptions } from '../enums/command';
import { replyToInteraction } from './manager';
import { getOrCreateDMChannel, replyWithInvalidChannel } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const content = interaction.options.getString(DeleteOptions.target.name) || '';
  const channel = interaction.channel
    || await getOrCreateDMChannel(interaction.channelId, interaction.user);

  if (
    !(channel instanceof TextChannel)
    && !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  await replyToInteraction(interaction, { content: 'Done!', ephemeral: true });
  await channel.send(`${content} has been deleted!`);
}
