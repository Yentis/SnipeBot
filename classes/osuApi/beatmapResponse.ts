export default class BeatmapResponse {
  approved: string

  'beatmap_id': string

  artist: string

  difficultyrating: string

  title: string

  version: string

  'max_combo'?: number

  mode: string

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
