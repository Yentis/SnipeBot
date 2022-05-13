import { MongoClient } from 'mongodb';
import BeatmapAddRequest from '../classes/database/beatmapAddRequest';
import BeatmapResponse from '../classes/osuApi/beatmapResponse';
import Score from '../classes/database/score';
import Beatmap from '../classes/database/beatmap';
import * as ApiScore from '../classes/osuApi/score';

const mongoDbUser = process.env.MONGODB_USER;
if (!mongoDbUser) throw Error('MONGODB_USER environment variable not defined!');
const mongoDbPass = process.env.MONGODB_PASS;
if (!mongoDbPass) throw Error('MONGODB_PASS environment variable not defined!');

const uri = `mongodb+srv://${mongoDbUser}:${mongoDbPass}@cluster0.himju.gcp.mongodb.net/osusnipebot?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
const BEATMAPS = 'Beatmaps';

async function initDB(): Promise<void> {
  const db = client.db();
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
            description: 'Song artist; required.'
          },
          difficulty: {
            bsonType: 'string',
            description: 'Map difficulty; required.'
          },
          title: {
            bsonType: 'string',
            description: 'Song title; required.'
          },
          version: {
            bsonType: 'string',
            description: 'Map difficulty name; required.'
          },
          mode: {
            bsonType: 'string',
            description: 'Map gamemode; required.'
          },
          approvedDate: {
            bsonType: 'date',
            description: 'Map approved date; required.'
          },
          scores: {
            bsonType: 'array',
            description: 'Scores for this map.'
          }
        }
      }
    }
  });
}

function toISODate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `00${date.getUTCMonth() + 1}`.slice(-2);
  const day = `00${date.getUTCDate()}`.slice(-2);
  const hours = `00${date.getUTCHours()}`.slice(-2);
  const minutes = `00${date.getUTCMinutes()}`.slice(-2);
  const seconds = `00${date.getUTCSeconds()}`.slice(-2);

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function connect(): Promise<void> {
  await client.connect();
  await initDB();
}

export async function getNewestMap(): Promise<string | null> {
  const results = await client.db().collection(BEATMAPS).find().project({ _id: 0, approvedDate: 1 })
    .sort({ approvedDate: -1 })
    .limit(1)
    .toArray() as { approvedDate: Date }[];

  if (results.length === 0) return null;
  return toISODate(results[0].approvedDate);
}

export async function bulkAddBeatmapRows(maps: BeatmapResponse[]): Promise<void> {
  const beatmaps = maps.reduce((result, map) => {
    if (map.approved === '3') return result;

    result.push(new BeatmapAddRequest(
      {
        filter: {
          _id: map.beatmap_id
        },
        update: {
          $set: new Beatmap(
            map.artist,
            parseFloat(map.difficultyrating).toFixed(2),
            map.title,
            map.version,
            map.mode,
            new Date(`${map.approved_date}Z`)
          )
        },
        upsert: true
      }
    ));
    return result;
  }, [] as BeatmapAddRequest[]);

  if (beatmaps.length === 0) return;
  await client.db().collection(BEATMAPS).bulkWrite(beatmaps);
}

export function getMapCount(): Promise<number> {
  return client.db().collection(BEATMAPS).countDocuments();
}

export async function getFirstPlaceForMap(mapId: number): Promise<{ firstPlace: Score } | null> {
  const results = await client.db().collection(BEATMAPS).find({ _id: mapId.toString() })
    .project({ _id: 0, firstPlace: 1 })
    .toArray() as { firstPlace: Score }[];

  if (results.length === 0) return null;
  return results[0];
}

export async function bulkAddScoreRows(mapId: number, scores: ApiScore.default[]): Promise<void> {
  let firstPlace: Score | undefined;

  const scoreList = scores.map((score) => {
    const playerScore = new Score(
      parseInt(score.user.id, 10),
      score.user.username,
      new Date(score.ended_at),
      score.total_score
    );

    if (!firstPlace) {
      firstPlace = playerScore;
      return playerScore;
    }

    if (Score.getScore(playerScore) < Score.getScore(firstPlace)) return playerScore;
    if (
      playerScore.score === firstPlace.score &&
      playerScore.date > firstPlace.date
    ) return playerScore;

    firstPlace = playerScore;
    return playerScore;
  });

  await client.db().collection(BEATMAPS)
    .updateOne({ _id: mapId.toString() }, { $set: { scores: scoreList, firstPlace } });
}

export async function getMapWasSniped(
  mapId: number,
  oldDate: Date,
  newDate: Date
): Promise<boolean> {
  const results = await client.db().collection(BEATMAPS).find({ _id: mapId.toString() })
    .project({ _id: 0, scores: 1 })
    .toArray() as { scores: Score[] }[];
  if (results.length === 0 || !results[0].scores) return false;

  const { scores } = results[0];
  if (scores.length === 0) return false;

  return scores.some((score) => score.date >= oldDate && score.date < newDate);
}

export function getMapsWithNoScores(mode: number): Promise<Beatmap[]> {
  return client.db().collection(BEATMAPS)
    .find({ mode: mode.toString(), scores: { $exists: false } })
    .sort({ difficulty: -1 })
    .project({ scores: 0 })
    .toArray() as Promise<Beatmap[]>;
}

export function getFirstPlacesForPlayer(playerId: number, mode: number): Promise<Beatmap[]> {
  return client.db().collection(BEATMAPS).find({ 'firstPlace.playerId': playerId, mode: mode.toString() }).sort({ difficulty: -1 })
    .project({ scores: 0 })
    .toArray() as Promise<Beatmap[]>;
}

export async function getFirstPlaceTop(
  mode: number,
  count: number
): Promise<{ playerName: string, count: number }[]> {
  const ranking: Record<string, number> = {};

  await client.db().collection(BEATMAPS)
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
    count: ranking[key]
  }));

  return topList.slice(0, count);
}

export async function getMapsForPlayer(playerId: string, mode: number): Promise<Beatmap[]> {
  const beatmaps = await client.db().collection(BEATMAPS)
    .find({ mode: mode.toString(), 'scores.playerId': parseInt(playerId, 10) }).project({ firstplace: 0 })
    .toArray();

  return beatmaps as Beatmap[];
}

export async function getMapIds(): Promise<string[]> {
  const mapIds = await client.db().collection(BEATMAPS)
    .find().project({ _id: 1 }).map((document) => {
      const beatmap = document as { _id: string };
      return beatmap._id;
    }).toArray();

  return mapIds;
}

function exitHandler(options: { cleanup?: boolean, exit?: boolean }) {
  if (options.cleanup) {
    console.info('Closing connection');
    client.close().catch((error) => console.error(error));
  }
  if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null, { cleanup: true }));

process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGTERM', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

process.on('uncaughtException', (code) => {
  console.error(code);
  exitHandler({ exit: true });
});
