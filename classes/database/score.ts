export default class Score {
  playerId: number

  playerName: string

  date: Date

  score: number | null

  static getScore(score: Score): number {
    return score.score ?? 0;
  }

  constructor(playerId: number, playerName: string, date: Date, score: number) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.date = date;
    this.score = score;
  }
}
