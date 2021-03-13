import { Message } from 'discord.js';
import { getParamsFromMessage } from './utils';
import { generateHtmlForSnipes } from '../services/htmlService';
import { getUser } from '../services/osuApiService';
import { getMapsForPlayer } from '../services/databaseService';
import { send } from '../services/discordService';
import User from '../classes/user';
import Beatmap from '../classes/database/beatmap';
import Score from '../classes/database/score';

function wasFirstPlace(scores: Score[], playerId: number): boolean {
  let highestScore = scores[0];
  let playerScore: Score;
  let result = true;

  scores.forEach((score) => {
    if (
      score.score > highestScore.score
      || (score.score === highestScore.score && score.date < highestScore.date)
    ) {
      highestScore = score;
    }

    if (playerId === score.playerId) {
      playerScore = score;
    }
  });

  if (highestScore.playerId === playerId) return false;

  scores.forEach((score) => {
    if (score.date < playerScore.date && score.score >= playerScore.score) result = false;
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

function getListOfSnipedScores(maps: Beatmap[], user: User) {
  const snipedList = maps
    .filter((map) => !!map.scores && wasFirstPlace(map.scores, parseInt(user.userId, 10)));

  return {
    amount: snipedList.length,
    list: generateHtmlForSnipes(snipedList.sort(sortByDifficulty))
  };
}

export default async function run(message: Message): Promise<void> {
  const params = await getParamsFromMessage(message);
  if (!params.username) {
    await send(message.channel, 'Please enter a valid username.');
    return;
  }

  const user = await getUser(params.username);
  if (!user) {
    await send(message.channel, 'User was not found.');
    return;
  }

  const maps = await getMapsForPlayer(user.userId, params.mode);
  const result = getListOfSnipedScores(maps, user);

  if (result.amount === 0) {
    await send(message.channel, `${user.username} is not currently sniped on any scores.`);
    return;
  }

  await send(
    message.channel,
    `Here are all the maps ${user.username} has been sniped on (${result.amount} maps):`,
    result.list,
    `Snipes ${user.username}.html`
  );
}
