import fetch, { Response } from 'node-fetch';
import { Message } from 'discord.js';
import ParsedScoresResponse from '../classes/osuApi/parsedScoresResponse';
import ScoreInfo from '../classes/scoreInfo';
import ScoresResponse from '../classes/osuApi/scoresResponse';
import {
  getFirstPlaceForMap, bulkAddScoreRows, getMapWasSniped, getMapCount
} from './databaseService';
import { publish, getUser } from './discordService';
import { getLinkedUser } from './userLinkingService';
import {
  getFailedIds, saveSettings, setCurrentMapIndex, setFailedId, tryUnsetFailedId
} from './settingsService';

export const OSU_URL = 'https://osu.ppy.sh';

let progressMessages: Message[] = [];
let shouldStop = false;

// Note: this helper throws!
function sleep(time: number) {
  return new Promise((_resolve, reject) => setTimeout(reject, time));
}

async function parseResponse(response: Response): Promise<ParsedScoresResponse | null> {
  const { scores } = await response.json() as ScoresResponse;
  const highestScore = scores[0];
  if (!highestScore) return null;

  const beatmapId = highestScore.beatmap.id;
  const parsedResponse = new ParsedScoresResponse(
    beatmapId,
    `${OSU_URL}/b/${beatmapId}`,
    `Mode: ${scores[0].mode} | Score: ${highestScore.score.toLocaleString()}`
  );

  parsedResponse.scores = scores.map((score) => new ScoreInfo(
    parseInt(score.user.id, 10),
    score.user.username,
    score.created_at,
    score.score
  ));

  return parsedResponse;
}

export async function getCountryScores(
  beatmapId: string
): Promise<ParsedScoresResponse | null> {
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

function notifyLinkedUsers(playerIds: number[], data: ParsedScoresResponse) {
  const firstPlace = data.scores[0];

  playerIds.forEach((playerId) => {
    const localUser = getLinkedUser(playerId);
    if (!localUser || playerId === firstPlace.id) return;

    const user = getUser(localUser);
    if (!user) return;
    user.send(`You were sniped by ${firstPlace.u}\n${data.scoreData}\n${data.mapLink}`).catch((error) => console.error(error));
  });
}

export async function handleCountryScores(data: ParsedScoresResponse): Promise<string | null> {
  const { beatmapId } = data;
  const count = Math.min(10, data.scores.length);

  const firstPlace = data.scores[0];
  const score = await getFirstPlaceForMap(beatmapId);
  const message = `${firstPlace.u}\n${data.scoreData}\n${data.mapLink}`;

  if (!score) {
    await publish(`New first place is ${message}`);
    await bulkAddScoreRows(beatmapId, data.scores.slice(0, count));
    return null;
  }

  await bulkAddScoreRows(beatmapId, data.scores.slice(0, count));
  const oldDate = score.date;

  const mapWasSniped = await getMapWasSniped(beatmapId, oldDate, new Date(firstPlace.d));
  if (!mapWasSniped) {
    return `First place is ${message}`;
  }

  notifyLinkedUsers([score.playerId], data);
  if (firstPlace.id === score.playerId) return null;
  await publish(`${score.playerName} was sniped by ${message}`);

  return null;
}

function finishCreatingDatabase() {
  progressMessages = [];
  setCurrentMapIndex(0);
  saveSettings().catch((error) => console.error(error));

  const failedIdCount = getFailedIds().length;
  const failedMessage = failedIdCount > 0 ? `Failed to process ${failedIdCount} maps` : '';
  return publish(`Done. ${failedMessage}`);
}

async function doRequest(index: number, idList: string[], startIndex: number, totalLength: number) {
  const beatmapId = idList[index];
  const offsetIndex = index + 1 + startIndex;
  const failedIds = getFailedIds();

  setCurrentMapIndex(offsetIndex);
  console.info(`Processing ${beatmapId} | ${offsetIndex} of ${totalLength}`);

  const progress = ((offsetIndex / totalLength) * 100).toFixed(2);
  progressMessages.forEach((message) => {
    message.edit(`Building: ${progress}% (${offsetIndex} of ${totalLength}) | ${failedIds.length} failed.`)
      .catch((error) => console.error(error));
  });

  let scores: ParsedScoresResponse | null = null;
  try {
    // This will throw if the timer expires before we get our scores
    // so it will always be of type ParsedScoresResponse | null
    scores = await Promise.race(
      [sleep(21000), getCountryScores(beatmapId)]
    ) as ParsedScoresResponse | null;
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
  const messages = await publish(`Building: 0.00% (0 of ${ids.slice(startIndex).length})`);

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
  while (!shouldStop && index < totalLength) {
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
