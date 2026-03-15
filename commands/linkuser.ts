import { CommandInteraction } from 'discord.js';
import osuApiService from '../services/osuApiService';
import userLinkingService from '../services/userLinkingService';
import { replyToInteraction } from './manager';
import { getUsernameFromOptions } from './utils';

export default async function run(interaction: CommandInteraction): Promise<void> {
  const username = getUsernameFromOptions(interaction) || interaction.user.username;
  const user = await osuApiService.getUser(username);

  if (user === null) {
    await replyToInteraction(interaction, { content: 'User was not found', ephemeral: true });
    return;
  }

  const linked = userLinkingService.linkUser(interaction.user.id, parseInt(user.userId, 10));
  if (linked) await replyToInteraction(interaction, { content: `Linked <@${interaction.user.id}> to osu! user ${user.username}` });
  else await replyToInteraction(interaction, { content: 'You are already linked to this osu! user' });
}
