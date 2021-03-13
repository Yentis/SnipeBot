export default class ScoreInfo {
  id: number

  u: string

  d: string

  s: number

  constructor(id: number, u: string, d: string, s: number) {
    this.id = id;
    this.u = u;
    this.d = d;
    this.s = s;
  }
}
