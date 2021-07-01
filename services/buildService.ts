import fetch, { Response } from 'node-fetch';
import { Message, MessageEmbed, MessageOptions } from 'discord.js';
import ScoresResponse from '../classes/osuApi/scoresResponse';
import {
  getFirstPlaceForMap, bulkAddScoreRows, getMapWasSniped, getMapCount
} from './databaseService';
import { publish, getUser, setActivity } from './discordService';
import { getMatchingLinkedUsers } from './userLinkingService';
import {
  getFailedIds, saveSettings, setCurrentMapIndex, setFailedId, tryUnsetFailedId
} from './settingsService';
import Score from '../classes/database/score';
import * as ApiScore from '../classes/osuApi/score';
import { getBeatmapInfo } from './osuApiService';
import { Mode } from '../commands/utils';

export const OSU_URL = 'https://osu.ppy.sh';

let progressMessages: Message[] = [];
let shouldStop = false;

// Note: this helper throws!
function sleep(time: number) {
  return new Promise((_resolve, reject) => setTimeout(reject, time));
}

async function parseResponse(response: Response): Promise<ApiScore.default[] | null> {
  if (response.status === 404) return null;

  const { scores } = await response.json() as ScoresResponse;
  if (scores.length === 0) return null;

  const beatmapInfo = await getBeatmapInfo(scores[0].beatmap.id.toString());
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];
    score.beatmap.artist = beatmapInfo?.artist;
    score.beatmap.title = beatmapInfo?.title;
    score.beatmap.max_combo = beatmapInfo?.max_combo;
  }

  return scores;
}

export async function getCountryScores(
  beatmapId: string
): Promise<ApiScore.default[] | null> {
  const startTime = new Date();
  const sessionKey = process.env.SESSION_KEY1;
  if (!sessionKey) return null;

  let response;
  let requestError;

  try {
    response = await fetch(`${OSU_URL}/beatmaps/${beatmapId}/scores?type=country`, { headers: { cookie: `osu_session=${sessionKey}` } });
  } catch (error: unknown) {
    requestError = error;
  }
  if (!response && !requestError) return null;

  // Ensure at least 1.5 seconds elapse between each request
  const elapsedTime = new Date().getTime() - startTime.getTime();
  if (elapsedTime < 1500) {
    try { await sleep(1500 - elapsedTime); } catch (error) { /* Do nothing */ }
  }

  if (requestError) throw requestError;
  if (!response) return null;

  return parseResponse(response);
}

function getMessageOptionsFromScores(
  content: string,
  scores: ApiScore.default[]
): MessageOptions | null {
  if (scores.length === 0) return null;
  const firstPlace = scores[0];
  const { user, beatmap, statistics } = firstPlace;

  const embed = new MessageEmbed();
  embed.setAuthor(user.username, `https://a.ppy.sh/${user.id}`, `${OSU_URL}/users/${user.id}`);
  embed.setTitle(`${beatmap.artist || 'Artist'} - ${beatmap.title || 'Title'} [${beatmap.version}] [${beatmap.difficulty_rating}★] [${beatmap.mode}]`);
  embed.setURL(beatmap.url);
  embed.setTimestamp(new Date(firstPlace.created_at));
  embed.setThumbnail(`https://b.ppy.sh/thumb/${beatmap.beatmapset_id}l.jpg`);
  embed.setColor(16777215);

  const mods = firstPlace.mods.length > 0 ? `+${firstPlace.mods.join('')}` : '';
  const maxCombo = beatmap.max_combo ? `/${beatmap.max_combo}x` : '';
  const pp = firstPlace.pp !== null ? `${firstPlace.pp.toFixed(2)}PP ` : '';
  let statisticsText;

  switch (firstPlace.mode_int) {
    case Mode.mania:
      statisticsText = `{ ${statistics.count_geki}/${statistics.count_300}/${statistics.count_katu}/${statistics.count_100}/${statistics.count_50}/${statistics.count_miss} }`;
      break;
    case Mode.ctb:
      statisticsText = `{ ${statistics.count_300}/${statistics.count_100}/${statistics.count_katu}/${statistics.count_miss} }`;
      break;
    case Mode.taiko:
      statisticsText = `{ ${statistics.count_300}/${statistics.count_100}/${statistics.count_miss} }`;
      break;
    default:
      statisticsText = `{ ${statistics.count_300}/${statistics.count_100}/${statistics.count_50}/${statistics.count_miss} }`;
      break;
  }

  embed.fields.push({
    name: `[ ${firstPlace.rank} ] ${mods} ${firstPlace.score.toLocaleString()} (${(firstPlace.accuracy * 100).toFixed(2)}%)`,
    value: `${pp}[ ${firstPlace.max_combo}x${maxCombo} ] ${statisticsText}`,
    inline: false
  });

  return {
    content,
    embed
  };
}

function notifyLinkedUsers(scores: ApiScore.default[], previousFirstPlace: Score) {
  const firstPlace = scores[0];
  if (scores.length === 1) return;
  const { playerId } = previousFirstPlace;
  if (playerId === parseInt(firstPlace.user.id, 10)) return;
  const messageOptions = getMessageOptionsFromScores(
    `You were sniped by ${firstPlace.user.username}\nReact with :white_check_mark: to remove this message`,
    scores
  );
  if (messageOptions === null) return;

  getMatchingLinkedUsers(playerId)?.forEach((localUser) => {
    getUser(localUser).then((user) => {
      user?.send(messageOptions).catch((error) => console.error(error));
    }).catch((error) => console.error(error));
  });
}

export async function handleCountryScores(
  scores: ApiScore.default[]
): Promise<MessageOptions | null> {
  if (scores.length === 0) return null;
  const firstPlace = scores[0];
  const { beatmap, user } = firstPlace;

  const count = Math.min(10, scores.length);
  const score = await getFirstPlaceForMap(beatmap.id);

  if (!score) {
    const messageOptions = getMessageOptionsFromScores(`New first place is ${user.username}`, scores);
    if (messageOptions === null) return null;

    await publish(messageOptions);
    await bulkAddScoreRows(beatmap.id, scores.slice(0, count));
    return null;
  }

  await bulkAddScoreRows(beatmap.id, scores.slice(0, count));
  const oldDate = score.date;

  const mapWasSniped = await getMapWasSniped(beatmap.id, oldDate, new Date(firstPlace.created_at));
  if (!mapWasSniped) {
    return getMessageOptionsFromScores(`First place is ${user.username}`, scores);
  }

  notifyLinkedUsers(scores, score);
  if (parseInt(user.id, 10) === score.playerId) return null;

  const messageOptions = getMessageOptionsFromScores(`${score.playerName} was sniped by ${user.username}`, scores);
  if (messageOptions === null) return null;
  await publish(messageOptions);

  return null;
}

function finishCreatingDatabase() {
  progressMessages = [];
  setCurrentMapIndex(0);
  saveSettings().catch((error) => console.error(error));

  const failedIdCount = getFailedIds().length;
  const failedMessage = failedIdCount > 0 ? `Failed to process ${failedIdCount} maps` : '';
  setActivity();
  return publish({ content: `Done. ${failedMessage}` });
}

async function doRequest(index: number, idList: string[], startIndex: number, totalLength: number) {
  const beatmapId = idList[index];
  const offsetIndex = index + 1 + startIndex;
  const failedIds = getFailedIds();

  setCurrentMapIndex(offsetIndex);
  console.info(`Processing ${beatmapId} | ${offsetIndex} of ${totalLength}`);

  const progress = ((offsetIndex / totalLength) * 100).toFixed(2);
  const progressText = `Building: ${progress}% (${offsetIndex} of ${totalLength}) | ${failedIds.length} failed.`;
  progressMessages.forEach((message) => {
    message.edit(progressText)
      .catch((error) => console.error(error));
  });
  setActivity({ type: 'WATCHING', name: `${progress}%` });

  let scores: ApiScore.default[] | null = null;
  try {
    // This will throw if the timer expires before we get our scores
    // so it will always be of type ParsedScoresResponse | null
    scores = await Promise.race(
      [sleep(21000), getCountryScores(beatmapId)]
    ) as ApiScore.default[] | null;
    tryUnsetFailedId(beatmapId);
  } catch (error) {
    console.error(error);
    setFailedId(beatmapId);
  }

  if (scores) await handleCountryScores(scores);
  // Save our settings every 50 processed maps
  if (index % 50 === 0) {
    saveSettings().catch((error) => console.error(error));
  }
}

export async function createDatabase(
  ids: string[],
  startIndex = 0,
  rebuildFailed = false
): Promise<void> {
  const messageList = await publish({ content: `Building: 0.00% (0 of ${ids.slice(startIndex).length})` });
  const messages = messageList.concat.apply([], messageList) as Message[];

  progressMessages = messages;
  shouldStop = false;

  // Get the ids starting from where we left off
  const idList = ids.slice(startIndex);
  if (idList.length === 0) {
    await finishCreatingDatabase();
    return;
  }
  const totalLength = rebuildFailed ? idList.length : await getMapCount();

  let index = 0;
  // Keep looping until shouldStop becomes true or we reach the end of the list
  while (!shouldStop && (index + 1 + startIndex) <= totalLength) {
    // eslint-disable-next-line no-await-in-loop
    await doRequest(index, idList, startIndex, totalLength);
    index += 1;
  }

  await finishCreatingDatabase();
}

export function stopBuilding(): void {
  shouldStop = true;
}

export function getProgressMessage(channelId: string): Message | null {
  return progressMessages.find((message) => message.channel.id === channelId) || null;
}
