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
import { generateHtmlForSnipes } from '../services/htmlService';
import { getUser } from '../services/osuApiService';
import { getMapsForPlayer } from '../services/databaseService';
import LocalUser from '../classes/localUser';
import Beatmap from '../classes/database/beatmap';
import Score from '../classes/database/score';
import { replyToInteraction, replyToInteractionApi } from './manager';

function wasFirstPlace(scores: Score[], playerId: number): boolean {
  let highestScore = scores[0];
  let playerScore: Score;
  let result = true;

  scores.forEach((score) => {
    if (
      Score.getScore(score) > Score.getScore(highestScore) ||
      (score.score === highestScore.score && score.date < highestScore.date)
    ) {
      highestScore = score;
    }

    if (playerId === score.playerId) {
      playerScore = score;
    }
  });

  if (highestScore.playerId === playerId) return false;

  scores.forEach((score) => {
    if (score.date < playerScore.date && Score.getScore(score) >= Score.getScore(playerScore)) result = false;
  });

  return result;
}

function sortByDifficulty(a: Beatmap, b: Beatmap) {
  if (parseFloat(a.difficulty) > parseFloat(b.difficulty)) {
    return -1;
  }
  if (parseFloat(a.difficulty) < parseFloat(b.difficulty)) {
    return 1;
  }
  return 0;
}

function getListOfSnipedScores(maps: Beatmap[], user: LocalUser) {
  const snipedList = maps
    .filter((map) => !!map.scores && wasFirstPlace(map.scores, parseInt(user.userId, 10)));

  return {
    amount: snipedList.length,
    list: generateHtmlForSnipes(snipedList.sort(sortByDifficulty))
  };
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  const channel = interaction.channel ||
    await getOrCreateDMChannel(interaction.channelId, interaction.user);

  if (
    !(channel instanceof TextChannel) &&
    !(channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  const targetUser = getUsernameFromOptions(interaction);
  const user = targetUser !== null ? await getUser(targetUser) : await tryGetUser(interaction.user);

  if (user === null) {
    await replyToInteraction(interaction, { content: 'User was not found' });
    return;
  }

  const mode = getModeFromOptions(interaction);
  const maps = await getMapsForPlayer(user.userId, mode);
  const result = getListOfSnipedScores(maps, user);

  if (result.amount === 0) {
    await replyToInteraction(interaction, { content: `${user.username} is not currently sniped on any scores` });
    return;
  }

  await replyToInteractionApi(interaction, {
    content: `Here are all the maps ${user.username} has been sniped on (${result.amount} maps):`,
    files: [{ attachment: Buffer.from(result.list), name: `Snipes ${user.username}.html` }]
  });
}
