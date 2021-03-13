import Beatmap from './beatmap';

export default class Score {
  beatmap: Beatmap

  mode: number

  score: number

  user: { id: string, username: string }

  'created_at': string

  constructor(
    beatmap: Beatmap,
    mode: number,
    score: number,
    user: { id: string, username: string },
    createdAt: string
  ) {
    this.beatmap = beatmap;
    this.mode = mode;
    this.score = score;
    this.user = user;
    this.created_at = createdAt;
  }
}
