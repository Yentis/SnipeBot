import {
  APIMessage, CommandInteraction, DMChannel, TextChannel
} from 'discord.js';
import {
  getModeFromOptions, getUsernameFromOptions, replyWithInvalidChannel, tryGetUser
} from './utils';
import { generateHtmlForSnipes } from '../services/htmlService';
import { getUser } from '../services/osuApiService';
import { getMapsForPlayer } from '../services/databaseService';
import LocalUser from '../classes/localUser';
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

function getListOfSnipedScores(maps: Beatmap[], user: LocalUser) {
  const snipedList = maps
    .filter((map) => !!map.scores && wasFirstPlace(map.scores, parseInt(user.userId, 10)));

  return {
    amount: snipedList.length,
    list: generateHtmlForSnipes(snipedList.sort(sortByDifficulty))
  };
}

export default async function run(interaction: CommandInteraction): Promise<void> {
  if (
    !(interaction.channel instanceof TextChannel)
    && !(interaction.channel instanceof DMChannel)
  ) {
    await replyWithInvalidChannel(interaction);
    return;
  }

  const targetUser = getUsernameFromOptions(interaction.options);
  const user = targetUser !== null ? await getUser(targetUser) : await tryGetUser(interaction.user);

  if (user === null) {
    await interaction.reply('User was not found');
    return;
  }

  const mode = getModeFromOptions(interaction.options);
  const maps = await getMapsForPlayer(user.userId, mode);
  const result = getListOfSnipedScores(maps, user);

  if (result.amount === 0) {
    await interaction.reply(`${user.username} is not currently sniped on any scores`);
    return;
  }

  await interaction.reply(new APIMessage(interaction.channel, {
    content: `Here are all the maps ${user.username} has been sniped on (${result.amount} maps):`,
    split: false,
    files: [{ attachment: Buffer.from(result.list), name: `Snipes ${user.username}.html` }]
  }));
}
