import { Collection, Db, Document, MongoClient } from 'mongodb';
import BeatmapAddRequest from '../classes/database/beatmapAddRequest';
import BeatmapResponse from '../classes/osuApi/beatmapResponse';
import Score from '../classes/database/score';
import Beatmap from '../classes/database/beatmap';
import * as ApiScore from '../classes/osuApi/score';
import { Service } from '../interfaces/service';

const BEATMAPS = 'Beatmaps';

class DatabaseService extends Service {
  private client!: MongoClient;
  private db: Db | undefined;
  private beatmapsCollection: Collection<Document> | undefined;

  async start(): Promise<void> {
    const mongoDbUrl = process.env.MONGODB_URL;
    if (!mongoDbUrl) throw Error('MONGODB_URL environment variable not defined!');

    this.client = new MongoClient(mongoDbUrl);
    await Promise.resolve();
  }

  private getDb(): Db {
    if (this.db) return this.db;
    this.db = this.client.db('osusnipebot');
    return this.db;
  }

  private getBeatmapsCollection(): Collection<Document> {
    if (this.beatmapsCollection) return this.beatmapsCollection;
    this.beatmapsCollection = this.getDb().collection(BEATMAPS);
    return this.beatmapsCollection;
  }

  private async initDB(): Promise<void> {
    const db = this.getDb();
    const collections = await db.listCollections().toArray();

    const tableExists = collections?.some((collection) => collection.name === BEATMAPS);
    if (tableExists) return;

    await db.createCollection(BEATMAPS, {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['artist', 'difficulty', 'title', 'version', 'mode', 'approvedDate'],
          properties: {
            artist: {
              bsonType: 'string',
              description: 'Song artist; required.',
            },
            difficulty: {
              bsonType: 'string',
              description: 'Map difficulty; required.',
            },
            title: {
              bsonType: 'string',
              description: 'Song title; required.',
            },
            version: {
              bsonType: 'string',
              description: 'Map difficulty name; required.',
            },
            mode: {
              bsonType: 'string',
              description: 'Map gamemode; required.',
            },
            approvedDate: {
              bsonType: 'date',
              description: 'Map approved date; required.',
            },
            scores: {
              bsonType: 'array',
              description: 'Scores for this map.',
            },
          },
        },
      },
    });
  }

  private toISODate(date: Date) {
    const year = date.getUTCFullYear();
    const month = `00${date.getUTCMonth() + 1}`.slice(-2);
    const day = `00${date.getUTCDate()}`.slice(-2);
    const hours = `00${date.getUTCHours()}`.slice(-2);
    const minutes = `00${date.getUTCMinutes()}`.slice(-2);
    const seconds = `00${date.getUTCSeconds()}`.slice(-2);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.initDB();
  }

  async getNewestMap(): Promise<string | null> {
    const results = (await this.getBeatmapsCollection()
      .find()
      .project({ _id: 0, approvedDate: 1 })
      .sort({ approvedDate: -1 })
      .limit(1)
      .toArray()) as { approvedDate: Date }[];

    if (results.length === 0) return null;
    return this.toISODate(results[0].approvedDate);
  }

  async bulkAddBeatmapRows(maps: BeatmapResponse[]): Promise<void> {
    const beatmaps = maps
      .filter((map) => {
        return map.approved !== '3';
      })
      .map((map) => {
        return new BeatmapAddRequest({
          filter: {
            _id: map.beatmap_id,
          },
          update: {
            $set: new Beatmap(
              map.artist,
              parseFloat(map.difficultyrating).toFixed(2),
              map.title,
              map.version,
              map.mode,
              new Date(`${map.approved_date}Z`),
            ),
          },
          upsert: true,
        });
      });

    if (beatmaps.length === 0) return;
    await this.getBeatmapsCollection().bulkWrite(beatmaps);
  }

  getMapCount(): Promise<number> {
    return this.getBeatmapsCollection().countDocuments();
  }

  async getFirstPlaceForMap(mapId: number): Promise<{ firstPlace: Score } | null> {
    const results = (await this.getBeatmapsCollection()
      .find({ _id: mapId.toString() })
      .project({ _id: 0, firstPlace: 1 })
      .toArray()) as { firstPlace: Score }[];

    if (results.length === 0) return null;
    return results[0];
  }

  async bulkAddScoreRows(mapId: number, scores: ApiScore.default[]): Promise<void> {
    let firstPlace: Score | undefined;

    const scoreList = scores.map((score) => {
      const playerScore = new Score(
        parseInt(score.user.id, 10),
        score.user.username,
        new Date(score.ended_at),
        score.total_score,
      );

      if (!firstPlace) {
        firstPlace = playerScore;
        return playerScore;
      }

      if (Score.getScore(playerScore) < Score.getScore(firstPlace)) return playerScore;
      if (playerScore.score === firstPlace.score && playerScore.date > firstPlace.date) return playerScore;

      firstPlace = playerScore;
      return playerScore;
    });

    await this.getBeatmapsCollection().updateOne({ _id: mapId.toString() }, { $set: { scores: scoreList, firstPlace } });
  }

  async getMapWasSniped(mapId: number, oldDate: Date, newDate: Date): Promise<boolean> {
    const results = (await this.getBeatmapsCollection()
      .find({ _id: mapId.toString() })
      .project({ _id: 0, scores: 1 })
      .toArray()) as { scores: Score[] }[];
    if (results.length === 0 || !results[0].scores) return false;

    const { scores } = results[0];
    if (scores.length === 0) return false;

    return scores.some((score) => score.date >= oldDate && score.date < newDate);
  }

  getMapsWithNoScores(mode: number): Promise<Beatmap[]> {
    return this.getBeatmapsCollection()
      .find({ mode: mode.toString(), scores: { $exists: false } })
      .sort({ difficulty: -1 })
      .project({ scores: 0 })
      .toArray() as Promise<Beatmap[]>;
  }

  getFirstPlacesForPlayer(playerId: number, mode: number): Promise<Beatmap[]> {
    return this.getBeatmapsCollection()
      .find({ 'firstPlace.playerId': playerId, mode: mode.toString() })
      .sort({ difficulty: -1 })
      .project({ scores: 0 })
      .toArray() as Promise<Beatmap[]>;
  }

  async getFirstPlaceTop(mode: number, count: number): Promise<{ playerName: string; count: number }[]> {
    const ranking: Record<string, number> = {};

    await this.getBeatmapsCollection()
      .find({ mode: mode.toString(), firstPlace: { $exists: true } })
      .project({ _id: 0, 'firstPlace.playerName': 1 })
      .forEach((data) => {
        const playerName = (data as Beatmap).firstPlace?.playerName;
        if (!playerName) return;

        if (ranking[playerName]) {
          ranking[playerName] += 1;
        } else {
          ranking[playerName] = 1;
        }
      });

    const keys = Object.keys(ranking);
    keys.sort((a, b) => ranking[b] - ranking[a]);

    const topList = keys.map((key) => ({
      playerName: key,
      count: ranking[key],
    }));

    return topList.slice(0, count);
  }

  async getMapsForPlayer(playerId: string, mode: number): Promise<Beatmap[]> {
    const beatmaps = await this.getBeatmapsCollection()
      .find({ mode: mode.toString(), 'scores.playerId': parseInt(playerId, 10) })
      .project({ firstplace: 0 })
      .toArray();

    return beatmaps as Beatmap[];
  }

  async getMapIds(): Promise<string[]> {
    return await this.getBeatmapsCollection()
      .find()
      .project({ _id: 1 })
      .map((document) => {
        const beatmap = document as { _id: string };
        return beatmap._id;
      })
      .toArray();
  }

  override stop(): void {
    this.client.close().catch(console.error);
  }
}

const databaseService = new DatabaseService();
export default databaseService;
