import { CommandInteraction } from 'discord.js';
import {
  getModeFromOptions,
  getUsernameFromOptions,
  tryGetUser
} from './utils';
import { getUser } from '../services/osuApiService';
import { getFirstPlacesForPlayer, getMapsWithNoScores } from '../services/databaseService';
import LocalUser from '../classes/localUser';
import { replyToInteraction } from './manager';
import { GeneralOptions } from '../enums/command';

async function countThroughMapIds(user: LocalUser | null, mode: number) {
  const userId = user ? parseInt(user.userId, 10) : null;

  let rows;
  if (userId) {
    rows = await getFirstPlacesForPlayer(userId, mode);
  } else {
    rows = await getMapsWithNoScores(mode);
  }

  return rows.length;
}

async function sendReply(
  interaction: CommandInteraction,
  user: LocalUser | null,
  emptyResponseText: string,
  // eslint-disable-next-line no-unused-vars
  responseText: (count: number) => string
) {
  const mode = getModeFromOptions(interaction);
  const count = await countThroughMapIds(user, mode);
  if (count === 0) {
    await replyToInteraction(interaction, { content: emptyResponseText });
    return;
  }

  await replyToInteraction(interaction, { content: responseText(count) });
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === GeneralOptions.unclaimed.name) {
    await sendReply(
      interaction,
      null,
      'All maps have a #1 score',
      (count) => `There are ${count} maps with no #1 score`
    );
    return;
  }

  const targetUser = getUsernameFromOptions(interaction);
  const user = targetUser !== null ? await getUser(targetUser) : await tryGetUser(interaction.user);

  if (user === null) {
    await replyToInteraction(interaction, { content: 'User not found', ephemeral: true });
    return;
  }

  const { username } = user;
  await sendReply(
    interaction,
    user,
    `${username} does not have any #1 scores`,
    (count) => `${username} is first place on ${count} maps`
  );
}
