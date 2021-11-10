import BeatmapResponse from './beatmapResponse';
import Statistics from './statistics';

export default class Score {
  beatmap: BeatmapResponse | null

  'mode_int': number

  score: number

  rank: string

  accuracy: number

  mods: string[]

  'max_combo': number

  pp: number | null

  statistics: Statistics

  user: { id: string, username: string }

  'created_at': string

  constructor(
    beatmap: BeatmapResponse,
    score: number,
    rank: string,
    accuracy: number,
    mods: string[],
    maxCombo: number,
    pp: number,
    statistics: Statistics,
    user: { id: string, username: string },
    createdAt: string
  ) {
    this.beatmap = beatmap;
    this.score = score;
    this.rank = rank;
    this.accuracy = accuracy;
    this.mods = mods;
    this.max_combo = maxCombo;
    this.pp = pp;
    this.statistics = statistics;
    this.user = user;
    this.created_at = createdAt;
  }
}
