export default class BeatmapResponse {
  'beatmap_id': string

  'beatmapset_id': number

  difficultyrating: string

  artist: string

  title: string

  'max_combo'?: number

  version: string

  mode: string

  approved: string

  'approved_date': string

  constructor(
    approved: string,
    beatmapId: string,
    artist: string,
    difficultyrating: string,
    title: string,
    version: string,
    mode: string,
    approvedDate: string
  ) {
    this.approved = approved;
    this.beatmap_id = beatmapId;
    this.artist = artist;
    this.difficultyrating = difficultyrating;
    this.title = title;
    this.version = version;
    this.mode = mode;
    this.approved_date = approvedDate;
  }
}
