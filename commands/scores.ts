import {
  CommandInteraction, DMChannel, TextChannel
} from 'discord.js';
import {
  getModeFromOptions,
  getOrCreateDMChannel,
  getUsernameFromOptions,
  replyWithInvalidChannel,
  tryGetUser
} from './utils';
import { generateHtmlForMaps } from '../services/htmlService';
import { getUser } from '../services/osuApiService';
import { getFirstPlacesForPlayer, getMapsWithNoScores } from '../services/databaseService';
import LocalUser from '../classes/localUser';
import { replyToInteraction, replyToInteractionApi } from './manager';
import { GeneralOptions } from '../enums/command';

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
  user: LocalUser | null,
  emptyResponseText: string,
  responseText: string,
  filename: string
) {
  const channel = interaction.channel
    || await getOrCreateDMChannel(interaction.channelId, interaction.user);

  if (
    !(channel instanceof TextChannel)
    && !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  const mode = getModeFromOptions(interaction);
  const list = await countThroughMapIds(user, mode);
  if (list.amount === 0) {
    await replyToInteraction(interaction, { content: emptyResponseText });
    return;
  }

  await replyToInteractionApi(interaction, {
    content: `${responseText} (${list.amount} maps):`,
    files: [{ attachment: Buffer.from(list.list), name: filename }]
  });
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === GeneralOptions.unclaimed.name) {
    await sendReply(
      interaction,
      null,
      'All maps have a #1 score',
      'Here are all the maps without any scores',
      'Unclaimed Maps.html'
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
    `Here are all the maps ${username} is first place on`,
    `Scores ${username}.html`
  );
}
