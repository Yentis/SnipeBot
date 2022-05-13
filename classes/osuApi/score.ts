import BeatmapResponse from './beatmapResponse';
import Statistics from './statistics';

interface Mods {
  acronym: string
}

export default class Score {
  beatmap: BeatmapResponse | null

  'ruleset_id': number

  'total_score': number

  rank: string

  accuracy: number

  mods: Mods[]

  'max_combo': number

  pp: number | null

  statistics: Statistics

  user: { id: string, username: string }

  'ended_at': string

  constructor(
    beatmap: BeatmapResponse,
    rulesetId: number,
    totalScore: number,
    rank: string,
    accuracy: number,
    mods: Mods[],
    maxCombo: number,
    pp: number,
    statistics: Statistics,
    user: { id: string, username: string },
    endedAt: string
  ) {
    this.beatmap = beatmap;
    this.ruleset_id = rulesetId;
    this.total_score = totalScore;
    this.rank = rank;
    this.accuracy = accuracy;
    this.mods = mods;
    this.max_combo = maxCombo;
    this.pp = pp;
    this.statistics = statistics;
    this.user = user;
    this.ended_at = endedAt;
  }
}
