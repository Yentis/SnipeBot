const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.himju.gcp.mongodb.net/osusnipebot?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const winston = require('winston');
const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({filename: "logs.log"}),
        new winston.transports.Console({format: winston.format.simple()})
    ]
});
const BEATMAPS = 'Beatmaps';

function connectToMongoDB(callback) {
    client.connect(async err => {
        if (err) {
            logger.error('Failed to connect to MongoDB', err);
            callback();
            return;
        }
    
        const db = client.db();
    
        try {
            let collections = await getCollections(db);
            for (const collection of collections) {
                if (collection.name === BEATMAPS) {
                    callback();
                    return;
                }
            }
        } catch (error) {
            logger.error('Failed to get collections', error);
            callback();
            return;
        }
    
        try {
            await createCollection(db, BEATMAPS, { $jsonSchema: {
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
            }});
        } catch (error) {
            logger.error('Failed to create collection', error);
            callback();
            return;
        }

        callback();
    });
}

function getCollections(db) {
    return new Promise((resolve, reject) => {
        db.listCollections().toArray((err, items) => {
            if (err) reject(err);
            else resolve(items);
        });
    });
}

function createCollection(db, collection, validator) {
    return new Promise((resolve, reject) => {
        db.createCollection(collection, { validator }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

function toISODate(date) {
    return date.getUTCFullYear() + '-' +
    ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
    ('00' + date.getUTCDate()).slice(-2) + ' ' + 
    ('00' + date.getUTCHours()).slice(-2) + ':' + 
    ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
    ('00' + date.getUTCSeconds()).slice(-2);
}

module.exports = {
    connect: (callback) => {
        connectToMongoDB(callback);
    },
    getNewestMap: (callback) => {
        client.db().collection(BEATMAPS).find().project({ _id: 0, approvedDate: 1 }).sort({ approvedDate: -1 }).limit(1).toArray().then((results) => {
            if (results.length === 1) {
                callback(undefined, toISODate(results[0].approvedDate));
            } else callback();
        }).catch(err => {
            logger.error(`Failed to find newest map`, err);
            callback();
        });
    },
    bulkAddBeatmapRows: (maps, callback) => {
        const beatmaps = [];
        for (const map of maps) {
            if (map.approved === '3') continue;

            beatmaps.push({
                updateOne: {
                    filter: {
                        _id: map.beatmap_id
                    },
                    update: {
                        $set: {
                            artist: map.artist,
                            difficulty: parseFloat(map.difficultyrating).toFixed(2),
                            title: map.title,
                            version: map.version,
                            mode: map.mode,
                            approvedDate: new Date(map.approved_date + 'Z')
                        }
                    },
                    upsert: true
                }
            });
        }

        if (beatmaps.length === 0) {
            callback();
            return;
        }

        client.db().collection(BEATMAPS).bulkWrite(beatmaps, err => {
            if (err) logger.error('Failed to insert beatmaps', err);
            callback();
        });
    },
    getMapCount: (callback) => {
        client.db().collection(BEATMAPS).countDocuments().then(result => {
            callback(undefined, result);
        }).catch(err => callback(err));
    },
    getFirstPlaceForMap: (mapId, callback) => {
        client.db().collection(BEATMAPS).find({ _id: mapId.toString() }).project({ _id: 0, firstPlace: 1 }).toArray().then(results => {
            if (results.length !== 0 && results[0].firstPlace) {
                callback(undefined, results[0].firstPlace);
            } else callback();
        }).catch(err => callback(err));
    },
    bulkAddScoreRows: (mapId, scores, callback) => {
        const scoreList = [];
        let firstPlace;

        for (const score of scores) {
            const scoreItem = {
                playerId: score.id,
                playerName: score.u,
                date: new Date(score.d),
                score: score.s
            };
            scoreList.push(scoreItem);

            if (!firstPlace) {
                firstPlace = scoreItem;
                continue;
            }

            if (scoreItem.score < firstPlace.score) continue;
            if (scoreItem.score === firstPlace.score && scoreItem.date > firstPlace.date) continue;
            
            firstPlace = scoreItem;
        }

        client.db().collection(BEATMAPS).updateOne({ _id: mapId.toString() }, { $set: { scores: scoreList, firstPlace } }, err => {
            if (err) logger.error('Failed to insert scores', err);
            callback();
        });
    },
    getPlayersToNotify: (mapId, oldDate, newDate, callback) => {
        client.db().collection(BEATMAPS).find({ _id: mapId.toString() }).project({ _id: 0, scores: 1 }).toArray().then(results => {
            if (results.length !== 0 && results[0].scores) {
                const scores = results[0].scores;
                if (scores.length === 0) {
                    callback(undefined, []);
                    return;
                }
                const playerIds = [];

                for (const score of scores) {
                    if (score.date >= oldDate && score.date < newDate) {
                        playerIds.push(score.playerId);
                    }
                }

                callback(undefined, playerIds);
            } else callback(undefined, []);
        }).catch(err => callback(err));
    },
    getMapsWithNoScores: (mode, callback) => {
        client.db().collection(BEATMAPS).find({ mode: mode.toString(), scores: { $exists: false } }).sort({ difficulty: -1 }).project({ scores: 0 }).toArray().then(results => {
            callback(undefined, results);
        }).catch(err => callback(err));
    },
    getFirstPlacesForPlayer: (playerId, mode, callback) => {
        client.db().collection(BEATMAPS).find({ 'firstPlace.playerId': playerId, mode: mode.toString() }).sort({ difficulty: -1 }).project({ scores: 0 }).toArray().then(results => {
            if (results.length !== 0) {
                const scores = [];
                
                for (const result of results) {
                    const score = result.firstPlace.score;

                    scores.push({...result, score});
                }

                callback(undefined, scores);
            } else callback(undefined, []);
        }).catch(err => callback(err));
    },
    getFirstPlaceTop: (mode, count, callback) => {
        const start = new Date();
        const ranking = {};

        const cursor = client.db().collection(BEATMAPS).find({ mode: mode.toString(), firstPlace: { $exists: true } }).project({ _id: 0, 'firstPlace.playerName': 1 });
        cursor.on('data', data => {
            if (ranking[data.firstPlace.playerName]) {
                ranking[data.firstPlace.playerName]++;
            } else {
                ranking[data.firstPlace.playerName] = 1;
            }
        });
        cursor.on('end', () => {
            const keys = Object.keys(ranking);
            keys.sort((a,b) => {
                return ranking[b] - ranking[a];
            });
            const topList = keys.map(key => {
                return {
                    playerName: key,
                    count: ranking[key]
                };
            });

            const end = new Date();
            console.log(end - start);
            callback(undefined, topList.slice(0, count));
        });
    },
    getMapsForPlayer: (playerId, mode, callback) => {
        const maps = [];

        const cursor = client.db().collection(BEATMAPS).find({ mode: mode.toString(), "scores.playerId": parseInt(playerId) }).project({ firstplace: 0 });
        cursor.on('data', data => {
            maps.push(data);
        });
        cursor.on('end', () => {
            callback(undefined, maps);
        });
    },
    getMapIds: (callback) => {
        const mapIds = [];

        const cursor = client.db().collection(BEATMAPS).find().project({ _id: 1 });
        cursor.on('data', data => {
            mapIds.push(data._id);
        });
        cursor.on('end', () => {
            callback(undefined, mapIds);
        });
    }
};

function exitHandler(options) {
    if (options.cleanup) {
        console.log('Closing connection');
        client.close();
    }
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{ cleanup:true }));

process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGTERM', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

process.on('uncaughtException', exitHandler.bind(null, { exit: true }));