import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import BeatmapResponse from '../classes/osuApi/beatmapResponse';
import LocalUser from '../classes/localUser';
import UserResponse from '../classes/userResponse';
import { OSU_URL } from './buildService';
import {
  bulkAddBeatmapRows, connect, getMapCount, getNewestMap
} from './databaseService';
import { downloadFile, uploadFile } from './dropboxService';

export const MODES = ['osu!', 'osu!taiko', 'osu!catch', 'osu!mania'];
const CACHED_USERS_FILE = 'cachedUsers.json';
const API_URL = `${OSU_URL}/api`;

let cachedUsers: Record<string, string> = {};

let apiKey: string;
let lastDbSize = 0;

export async function start(): Promise<void> {
  const result: Record<string, string> = await downloadFile(CACHED_USERS_FILE);
  if (result) cachedUsers = result;
}

// User may be either a username or a userId
function getExistingUser(user: string): LocalUser | null {
  const username = cachedUsers[user];
  if (username) {
    return new LocalUser(user, username);
  }

  const cachedUserKey = Object.keys(cachedUsers)
    .find((key) => cachedUsers[key].toLowerCase() === user.toLowerCase());

  return cachedUserKey ? new LocalUser(cachedUserKey, cachedUsers[cachedUserKey]) : null;
}

export async function getUser(user: string): Promise<LocalUser | null> {
  const existingUser = getExistingUser(user);
  if (existingUser) return existingUser;

  const params = new URLSearchParams();
  params.append('k', apiKey);
  params.append('u', user);
  const response = await fetch(`${API_URL}/get_user`, { method: 'post', body: params });

  const body = await response.json() as UserResponse[];
  if (body.length === 0) return null;

  const fetchedUser = body[0];
  cachedUsers[fetchedUser.user_id] = fetchedUser.username;

  uploadFile(CACHED_USERS_FILE, JSON.stringify(cachedUsers)).catch((error) => console.error(error));
  return new LocalUser(fetchedUser.user_id, fetchedUser.username);
}

function twoDigits(d: number): string {
  if (d >= 0 && d < 10) return `0${d}`;
  if (d > -10 && d < 0) return `-0${(-1 * d)}`;
  return d.toString();
}

function toMysqlFormat(date: Date): string {
  const year = date.getUTCFullYear();
  const month = twoDigits(1 + date.getUTCMonth());
  const day = twoDigits(date.getUTCDate());
  const hours = twoDigits(date.getUTCHours());
  const minutes = twoDigits(date.getUTCMinutes());
  const seconds = twoDigits(date.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function getLatestDate(): Promise<string> {
  const date = await getNewestMap();
  return date || toMysqlFormat(new Date('2007'));
}

function getNextDate(lastBeatmap: BeatmapResponse): string {
  let targetDate = new Date(`${lastBeatmap.approved_date}Z`);
  targetDate = new Date(targetDate.getTime() - 1000);

  return toMysqlFormat(targetDate);
}

async function sendRequest(date: string): Promise<string | null> {
  const params = new URLSearchParams();
  params.append('k', apiKey);
  params.append('since', date);
  console.info(`Current date: ${date}`);

  const response = await fetch(`${API_URL}/get_beatmaps`, { method: 'post', body: params });
  const beatmaps = await response.json() as BeatmapResponse[];

  if (beatmaps.length === 0) return null;
  await bulkAddBeatmapRows(beatmaps);

  const count = await getMapCount();
  if (count === lastDbSize && beatmaps.length < 500) return null;

  lastDbSize = count;
  return getNextDate(beatmaps[beatmaps.length - 1]);
}

export async function getBeatmapInfo(id: string): Promise<BeatmapResponse | null> {
  const params = new URLSearchParams();
  params.append('k', apiKey);
  params.append('b', id);

  const response = await fetch(`${API_URL}/get_beatmaps`, { method: 'post', body: params });
  const beatmaps = await response.json() as BeatmapResponse[];

  if (beatmaps.length === 0) return null;
  return beatmaps[0];
}

async function saveNewBeatmaps(date: string): Promise<void> {
  let currentDate: string | null = date;

  while (currentDate !== null) {
    // eslint-disable-next-line no-await-in-loop
    currentDate = await sendRequest(currentDate);
  }
}

export async function updateBeatmapIds(key: string): Promise<void> {
  apiKey = key;
  await connect();

  const date = await getLatestDate();
  await saveNewBeatmaps(date);
}
