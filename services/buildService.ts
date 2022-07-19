import fetch, { Response } from 'node-fetch';
import { Message, MessageEmbed, MessageOptions } from 'discord.js';
import ScoresResponse from '../classes/osuApi/scoresResponse';
import {
  getFirstPlaceForMap, bulkAddScoreRows, getMapWasSniped, getMapCount, bulkAddBeatmapRows
} from './databaseService';
import { publish, getUser, setActivity } from './discordService';
import { getMatchingLinkedUsers } from './userLinkingService';
import {
  getFailedIds, saveSettings, setCurrentMapIndex, setFailedId, tryUnsetFailedId
} from './settingsService';
import Score from '../classes/database/score';
import * as ApiScore from '../classes/osuApi/score';
import { getBeatmapInfo, MODES } from './osuApiService';
import { Mode } from '../commands/utils';
import Statistics from '../classes/osuApi/statistics';

export const OSU_URL = 'https://osu.ppy.sh';

let progressMessages: Message[] = [];
let shouldStop = false;

// Note: this helper throws!
function sleep(time: number) {
  return new Promise((resolve, reject) => setTimeout(reject, time));
}

async function parseResponse(
  response: Response,
  beatmapId: string
): Promise<ApiScore.default[] | null> {
  if (response.status >= 400) {
    const responseText = await response.text();
    throw Error(`Request failed with status: ${response.status}, ${responseText}`);
  }

  const responseJson: unknown = await response.json();
  const { scores } = responseJson as ScoresResponse;
  if (!scores) throw Error(`Failed to read scores in response: ${JSON.stringify(responseJson)}`);

  const beatmapInfo = await getBeatmapInfo(beatmapId);
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i];
    score.beatmap = beatmapInfo;
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

  return parseResponse(response, beatmapId);
}

function getMessageOptionsFromScores(
  content: string,
  scores: ApiScore.default[]
): MessageOptions | null {
  if (scores.length === 0) return null;
  const firstPlace = scores[0];
  const { user, beatmap, statistics } = firstPlace;

  const artist = beatmap?.artist || 'Artist';
  const title = beatmap?.title || 'Title';
  const version = beatmap?.version || 'Version';
  const difficultyRating = parseFloat(beatmap?.difficultyrating || '0').toFixed(2);
  const mode = MODES[parseInt(beatmap?.mode || '0', 10)];

  const embed = new MessageEmbed()
    .setAuthor({ name: user.username, url: `${OSU_URL}/users/${user.id}`, iconURL: `https://a.ppy.sh/${user.id}` })
    .setTitle(`${artist} - ${title} [${version}] [${difficultyRating}★] [${mode}]`)
    .setTimestamp(new Date(firstPlace.ended_at))
    .setColor(16777215);

  if (beatmap) {
    // If this URL does not end in / everything breaks... trust me.
    embed.setURL(`https://osu.ppy.sh/b/${beatmap.beatmap_id}/`);
    embed.setThumbnail(`https://b.ppy.sh/thumb/${beatmap.beatmapset_id}l.jpg`);
  }

  const mods = firstPlace.mods.length > 0 ? `+${firstPlace.mods.map((mod) => mod.acronym).join('')}` : '';
  const maxCombo = beatmap?.max_combo ? `/${beatmap.max_combo}x` : '';
  const pp = firstPlace.pp !== null ? `${firstPlace.pp.toFixed(2)}PP ` : '';
  let statisticsText;

  const count300 = Statistics.getCount300(statistics);
  const count100 = Statistics.getCount100(statistics);
  const miss = Statistics.getMiss(statistics);

  switch (firstPlace.ruleset_id) {
    case Mode.mania: {
      const geki = Statistics.getGeki(statistics);
      const katu = Statistics.getKatu(statistics);
      const count50 = Statistics.getCount50(statistics);

      statisticsText = `{ ${geki}/${count300}/${katu}/${count100}/${count50}/${miss} }`;
      break;
    }
    case Mode.ctb: {
      const katu = Statistics.getKatu(statistics);

      statisticsText = `{ ${count300}/${count100}/${katu}/${miss} }`;
      break;
    }
    case Mode.taiko: {
      statisticsText = `{ ${count300}/${count100}/${miss} }`;
      break;
    }
    default: {
      const count50 = Statistics.getCount50(statistics);

      statisticsText = `{ ${count300}/${count100}/${count50}/${miss} }`;
      break;
    }
  }

  embed.addField(
    `[ ${firstPlace.rank} ] ${mods} ${firstPlace.total_score.toLocaleString()} (${(firstPlace.accuracy * 100).toFixed(2)}%)`,
    `${pp}[ ${firstPlace.max_combo}x${maxCombo} ] ${statisticsText}`,
    false
  );

  return {
    content,
    embeds: [embed]
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
  const beatmapId = beatmap ? parseInt(beatmap.beatmap_id, 10) : undefined;
  if (!beatmapId) return null;

  const entry = await getFirstPlaceForMap(beatmapId);
  if (!entry && beatmap) {
    await bulkAddBeatmapRows([beatmap]);
  }

  const score = entry?.firstPlace;
  if (!score) {
    const messageOptions = getMessageOptionsFromScores(`New first place is ${user.username}`, scores);
    if (messageOptions === null) return null;

    await publish(messageOptions);
    await bulkAddScoreRows(beatmapId, scores.slice(0, count));
    return null;
  }

  await bulkAddScoreRows(beatmapId, scores.slice(0, count));
  const oldDate = score.date;

  const mapWasSniped = await getMapWasSniped(beatmapId, oldDate, new Date(firstPlace.ended_at));
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

async function doRequest(
  {
    index,
    idList,
    startIndex,
    totalLength,
    timeout
  }: {
    index: number,
    idList: string[],
    startIndex: number,
    totalLength: number,
    timeout: boolean
  }
) {
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
    if (timeout) {
      scores = await Promise.race(
        [sleep(21000), getCountryScores(beatmapId)]
      ) as ApiScore.default[] | null;
    } else {
      scores = await getCountryScores(beatmapId);
    }

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
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!shouldStop && (index + 1 + startIndex) <= totalLength) {
    await doRequest({ index, idList, startIndex, totalLength, timeout: !rebuildFailed });
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
