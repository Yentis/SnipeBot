import Score from './score';

export default class Beatmap {
  _id!: string

  artist: string

  difficulty: string

  title: string

  version: string

  mode: string

  approvedDate: Date

  firstPlace: Score | undefined

  scores: Score[] | undefined

  constructor(
    artist: string,
    difficulty: string,
    title: string,
    version: string,
    mode: string,
    approvedDate: Date
  ) {
    this.artist = artist;
    this.difficulty = difficulty;
    this.title = title;
    this.version = version;
    this.mode = mode;
    this.approvedDate = approvedDate;
  }
}
