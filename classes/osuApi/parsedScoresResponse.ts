import ScoreInfo from '../scoreInfo';

export default class ParsedScoresResponse {
  beatmapId: number

  mapLink: string

  scoreData: string

  scores: ScoreInfo[] = []

  constructor(beatmapId: number, mapLink: string, scoreData: string) {
    this.beatmapId = beatmapId;
    this.mapLink = mapLink;
    this.scoreData = scoreData;
  }
}
