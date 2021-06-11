export default class Beatmap {
  'beatmapset_id': number

  id: number

  'difficulty_rating': number

  artist?: string

  title?: string

  'max_combo'?: number

  version: string

  mode: string

  url: string

  constructor(
    beatmapSetId: number,
    id: number,
    difficultyRating: number,
    version: string,
    mode: string,
    url: string
  ) {
    this.beatmapset_id = beatmapSetId;
    this.id = id;
    this.difficulty_rating = difficultyRating;
    this.version = version;
    this.mode = mode;
    this.url = url;
  }
}
