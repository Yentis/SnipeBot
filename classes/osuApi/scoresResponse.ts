import Score from './score';

export default class ScoresResponse {
  scores?: Score[]

  constructor(scores: Score[]) {
    this.scores = scores;
  }
}
