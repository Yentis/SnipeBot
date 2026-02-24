import {
  CommandInteraction, DMChannel, TextChannel
} from 'discord.js';
import { EchoOptions } from '../enums/command';
import { replyToInteraction } from './manager';
import {
  getOrCreateDMChannel,
  isMod, replyWithInvalidChannel, replyWithNoPermission
} from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (!isMod(interaction.member)) {
    await replyWithNoPermission(interaction);
    return;
  }

  const content = interaction.options.getString(EchoOptions.input.name) || '';
  const channel = interaction.channel || await getOrCreateDMChannel(interaction.channelId, interaction.user);

  if (
    !(channel instanceof TextChannel) &&
    !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  await replyToInteraction(interaction, { content: 'Done!', ephemeral: true });
  await channel.send(content);
}
