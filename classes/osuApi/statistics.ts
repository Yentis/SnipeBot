export default class Statistics {
  'count_50': number

  'count_100': number

  'count_300': number

  'count_geki': number

  'count_katu': number

  'count_miss': number

  constructor(
    count50: number,
    count100: number,
    count300: number,
    countGeki: number,
    countKatu: number,
    countMiss: number
  ) {
    this.count_50 = count50;
    this.count_100 = count100;
    this.count_300 = count300;
    this.count_geki = countGeki;
    this.count_katu = countKatu;
    this.count_miss = countMiss;
  }
}
