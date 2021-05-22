import {
  APIMessage, CommandInteraction, CommandInteractionOption, DMChannel, TextChannel
} from 'discord.js';
import {
  getModeFromOptions,
  getOrCreateDMChannel,
  getUnclaimedFromOptions,
  getUserFromOptions,
  getUsernameFromOptions,
  replyWithInvalidChannel,
  tryGetUser
} from './utils';
import { generateHtmlForMaps } from '../services/htmlService';
import { getUser } from '../services/osuApiService';
import { getFirstPlacesForPlayer, getMapsWithNoScores } from '../services/databaseService';
import LocalUser from '../classes/localUser';

async function countThroughMapIds(user: LocalUser | null, mode: number) {
  const userId = user ? parseInt(user.userId, 10) : null;

  let rows;
  if (userId) {
    rows = await getFirstPlacesForPlayer(userId, mode);
  } else {
    rows = await getMapsWithNoScores(mode);
  }

  return {
    amount: rows.length,
    list: generateHtmlForMaps(rows)
  };
}

async function sendReply(
  interaction: CommandInteraction,
  options: Array<CommandInteractionOption>,
  user: LocalUser | null,
  emptyResponseText: string,
  responseText: string,
  filename: string
) {
  const channel = interaction.channel
    || await getOrCreateDMChannel(interaction.channelID, interaction.user);

  if (
    !(channel instanceof TextChannel)
    && !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  const mode = getModeFromOptions(options);
  const list = await countThroughMapIds(user, mode);
  if (list.amount === 0) {
    await interaction.reply(emptyResponseText);
    return;
  }

  await interaction.reply(new APIMessage(channel, {
    content: `${responseText} (${list.amount} maps):`,
    split: false,
    files: [{ attachment: Buffer.from(list.list), name: filename }]
  }));
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const unclaimed = getUnclaimedFromOptions(interaction.options);
  if (unclaimed !== undefined) {
    await sendReply(
      interaction,
      unclaimed.options || [],
      null,
      'All maps have a #1 score',
      'Here are all the maps without any scores',
      'Unclaimed Maps.html'
    );
    return;
  }

  const options = getUserFromOptions(interaction.options)?.options || [];
  const targetUser = getUsernameFromOptions(options);
  const user = targetUser !== null ? await getUser(targetUser) : await tryGetUser(interaction.user);

  if (user === null) {
    await interaction.reply('User not found', { ephemeral: true });
    return;
  }

  const { username } = user;
  await sendReply(
    interaction,
    options,
    user,
    `${username} does not have any #1 scores`,
    `Here are all the maps ${username} is first place on`,
    `Scores ${username}.html`
  );
}
