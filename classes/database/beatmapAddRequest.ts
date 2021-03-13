import Beatmap from './beatmap';

export default class BeatmapAddRequest {
  updateOne: {
    filter: { _id: string },
    update: { $set: Beatmap },
    upsert: boolean
  }

  constructor(
    updateOne: {
      filter: { _id: string },
      update: { $set: Beatmap },
      upsert: boolean
    }
  ) {
    this.updateOne = updateOne;
  }
}
