import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import BeatmapResponse from '../classes/osuApi/beatmapResponse';
import LocalUser from '../classes/localUser';
import UserResponse from '../classes/userResponse';
import { OSU_URL } from './buildService';
import databaseService from './databaseService';
import { Service } from '../interfaces/service';
import storageService from './storageService';

export const MODES = ['osu!', 'osu!taiko', 'osu!catch', 'osu!mania'];
const CACHED_USERS_FILE = 'cachedUsers.json';
const API_URL = `${OSU_URL}/api`;

class OsuApiService extends Service {
  private cachedUsers: Record<string, string> = {};

  private apiKey!: string;
  private lastDbSize = 0;

  async start(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    await databaseService.connect();

    const date = await this.getLatestDate();
    await this.saveNewBeatmaps(date);

    this.cachedUsers = await storageService.readFile<Record<string, string>>(CACHED_USERS_FILE, {});
  }

  /**
   * User may be either a username or a userId
   */
  private getExistingUser(user: string): LocalUser | null {
    const username = this.cachedUsers[user];
    if (username) {
      return new LocalUser(user, username);
    }

    const cachedUserKey = Object.keys(this.cachedUsers).find((key) => this.cachedUsers[key].toLowerCase() === user.toLowerCase());

    return cachedUserKey ? new LocalUser(cachedUserKey, this.cachedUsers[cachedUserKey]) : null;
  }

  async getUser(user: string): Promise<LocalUser | null> {
    const existingUser = this.getExistingUser(user);
    if (existingUser) return existingUser;

    const params = new URLSearchParams();
    params.append('k', this.apiKey);
    params.append('u', user);
    const response = await fetch(`${API_URL}/get_user`, { method: 'post', body: params });

    const body = (await response.json()) as UserResponse[];
    if (body.length === 0) return null;

    const fetchedUser = body[0];
    this.cachedUsers[fetchedUser.user_id] = fetchedUser.username;

    storageService.saveFile(CACHED_USERS_FILE, JSON.stringify(this.cachedUsers)).catch(console.error);
    return new LocalUser(fetchedUser.user_id, fetchedUser.username);
  }

  private twoDigits(d: number): string {
    if (d >= 0 && d < 10) return `0${d}`;
    if (d > -10 && d < 0) return `-0${-1 * d}`;
    return d.toString();
  }

  private toMysqlFormat(date: Date): string {
    const year = date.getUTCFullYear();
    const month = this.twoDigits(1 + date.getUTCMonth());
    const day = this.twoDigits(date.getUTCDate());
    const hours = this.twoDigits(date.getUTCHours());
    const minutes = this.twoDigits(date.getUTCMinutes());
    const seconds = this.twoDigits(date.getUTCSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private async getLatestDate(): Promise<string> {
    const date = await databaseService.getNewestMap();
    return date || this.toMysqlFormat(new Date('2007'));
  }

  private getNextDate(lastBeatmap: BeatmapResponse): string {
    let targetDate = new Date(`${lastBeatmap.approved_date}Z`);
    targetDate = new Date(targetDate.getTime() - 1000);

    return this.toMysqlFormat(targetDate);
  }

  private async sendRequest(date: string): Promise<string | null> {
    const params = new URLSearchParams();
    params.append('k', this.apiKey);
    params.append('since', date);
    console.info(`Current date: ${date}`);

    const response = await fetch(`${API_URL}/get_beatmaps`, { method: 'post', body: params });
    const beatmaps = (await response.json()) as BeatmapResponse[];

    if (beatmaps.length === 0) return null;
    await databaseService.bulkAddBeatmapRows(beatmaps);

    const count = await databaseService.getMapCount();
    if (count === this.lastDbSize && beatmaps.length < 500) return null;

    this.lastDbSize = count;
    return this.getNextDate(beatmaps[beatmaps.length - 1]);
  }

  async getBeatmapInfo(id: string): Promise<BeatmapResponse | null> {
    const params = new URLSearchParams();
    params.append('k', this.apiKey);
    params.append('b', id);

    const response = await fetch(`${API_URL}/get_beatmaps`, { method: 'post', body: params });
    const beatmaps = (await response.json()) as BeatmapResponse[];

    if (beatmaps.length === 0) return null;
    return beatmaps[0];
  }

  private async saveNewBeatmaps(date: string): Promise<void> {
    let currentDate: string | null = date;

    while (currentDate !== null) {
      currentDate = await this.sendRequest(currentDate);
    }
  }

  override stop(): void {
    // Do nothing
  }
}

const osuApiService = new OsuApiService();
export default osuApiService;
