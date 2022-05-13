export default class Statistics {
  private 'count_geki'?: number

  private perfect?: number

  private 'count_katu'?: number

  private good?: number

  private 'small_tick_miss'?: number

  private 'count_300'?: number

  private great?: number

  private 'count_100'?: number

  private ok?: number

  private 'large_tick_hit'?: number

  private 'count_50'?: number

  private meh?: number

  private 'small_tick_hit'?: number

  private miss?: number

  static getGeki(statistics: Statistics): number {
    return statistics.count_geki ?? statistics.perfect ?? 0;
  }

  static getKatu(statistics: Statistics): number {
    return statistics.count_katu ?? statistics.good ?? statistics.small_tick_miss ?? 0;
  }

  static getCount300(statistics: Statistics): number {
    return statistics.count_300 ?? statistics.great ?? 0;
  }

  static getCount100(statistics: Statistics): number {
    return statistics.count_100 ?? statistics.ok ?? statistics.large_tick_hit ?? 0;
  }

  static getCount50(statistics: Statistics): number {
    return statistics.count_50 ?? statistics.meh ?? statistics.small_tick_hit ?? 0;
  }

  static getMiss(statistics: Statistics): number {
    return statistics.miss ?? 0;
  }
}
