import { CommandInteraction, CommandInteractionOption } from 'discord.js';
import {
  getModeFromOptions,
  getUnclaimedFromOptions,
  getUserFromOptions,
  getUsernameFromOptions,
  tryGetUser
} from './utils';
import { getUser } from '../services/osuApiService';
import { getFirstPlacesForPlayer, getMapsWithNoScores } from '../services/databaseService';
import LocalUser from '../classes/localUser';
import { replyToInteraction } from './manager';

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
  options: Array<CommandInteractionOption>,
  user: LocalUser | null,
  emptyResponseText: string,
  // eslint-disable-next-line no-unused-vars
  responseText: (count: number) => string
) {
  const mode = getModeFromOptions(options);
  const count = await countThroughMapIds(user, mode);
  if (count === 0) {
    await replyToInteraction(interaction, emptyResponseText);
    return;
  }

  await replyToInteraction(interaction, responseText(count));
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const unclaimed = getUnclaimedFromOptions(interaction.options);
  if (unclaimed !== undefined) {
    await sendReply(
      interaction,
      unclaimed.options || [],
      null,
      'All maps have a #1 score',
      (count) => `There are ${count} maps with no #1 score`
    );
    return;
  }

  const options = getUserFromOptions(interaction.options)?.options || [];
  const targetUser = getUsernameFromOptions(options);
  const user = targetUser !== null ? await getUser(targetUser) : await tryGetUser(interaction.user);

  if (user === null) {
    await replyToInteraction(interaction, 'User not found', { ephemeral: true });
    return;
  }

  const { username } = user;
  await sendReply(
    interaction,
    options,
    user,
    `${username} does not have any #1 scores`,
    (count) => `${username} is first place on ${count} maps`
  );
}
