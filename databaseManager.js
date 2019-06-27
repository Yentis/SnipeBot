// init sqlite db
let fs = require('fs');
let dbFile = './.data/sqlite.db';
let exists = fs.existsSync(dbFile);
let sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database(dbFile);

const winston = require('winston');
const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({filename: "logs.log"}),
        new winston.transports.Console({format: winston.format.simple()})
    ]
});

db.serialize(() => {
    if (!exists) {
        db.run('CREATE TABLE Scores (mapId NUMERIC, playerId NUMERIC, playerName TEXT, date DATE, score NUMERIC, PRIMARY KEY (mapId, playerId))');
        db.run('CREATE TABLE Beatmaps (mapId NUMERIC PRIMARY KEY, artist TEXT, difficulty NUMERIC, title TEXT, version TEXT, mode TEXT, approvedDate DATE)');
    }
});

module.exports = {
    bulkAddScoreRows: (mapId, maps, callback) => {
        let errors = [];

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            maps.forEach(score => {
                db.run("INSERT INTO Scores VALUES (?, ?, ?, ?, ?)", [mapId, score.id, score.u, score.d, score.s ? score.s : 0], err => {
                    if (err && err.message.indexOf("UNIQUE constraint failed") === -1) {
                        errors.push(err.message);
                    }
                });
            });
            db.run("END", () => {
                if (errors.length > 0) {
                    logger.error(errors);
                } else {
                    callback();
                }
            });
        });
    },
    bulkAddBeatmapRows: (maps, callback) => {
        let errors = [];

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            maps.forEach(map => {
                if (map.approved !== '3') {
                    db.run("INSERT INTO Beatmaps VALUES (?, ?, ?, ?, ?, ?, ?)", [map.beatmap_id, map.artist, parseFloat(map.difficultyrating).toFixed(2), map.title, map.version, map.mode, map.approved_date + "Z"], err => {
                        if (err && err.message.indexOf("UNIQUE constraint failed") === -1) {
                            errors.push(err.message);
                        }
                    });
                }
            });
            db.run("END", () => {
                if (errors.length > 0) {
                    logger.error(errors);
                } else {
                    callback();
                }
            });
        });
    },
    deleteScoresForMap: (mapId, callback) => {
        db.serialize(() => {
            db.run('DELETE FROM Scores WHERE mapId = ?', [mapId], err => {
                if (err) {
                    callback(err.message);
                } else callback(undefined, "Removed scores for: " + mapId);
            });
        });
    },
    getMapCount: (callback) => {
        let query = 'SELECT COUNT(*) AS count FROM Beatmaps';

        db.all(query, (err, rows) => {
            if (rows) {
                callback(undefined, rows[0].count);
            } else handleDbResult(err, rows, query, callback);
        });
    },
    getMapIds: (callback) => {
        let query = 'SELECT mapId FROM Beatmaps';

        db.all(query, (err, rows) => {
            if (rows) {
                callback(undefined, rows.map(row => row.mapId));
            } else handleDbResult(err, rows, query, callback);
        });
    },
    getNewestMap: (callback) => {
        let query = 'SELECT * FROM Beatmaps ORDER BY approvedDate DESC LIMIT 1';

        db.all(query, (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    },
    getMapsWithNoScores: (mode, callback) => {
        let query = 'SELECT * FROM Beatmaps WHERE mode = ? AND mapId NOT IN (SELECT mapId FROM Scores) ORDER BY difficulty DESC';

        db.all(query, [mode], (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    },
    getFirstPlacesForPlayer: (playerId, mode, callback) => {
        let query = 'SELECT * FROM (SELECT mapId, MAX(score) AS max_score FROM Scores GROUP BY mapId) AS MaxScores INNER JOIN Scores AS Scores ON Scores.mapId = MaxScores.mapId AND Scores.score = MaxScores.max_score INNER JOIN Beatmaps ON Scores.mapId = Beatmaps.mapId WHERE playerId = ? AND mode = ? ORDER BY difficulty DESC';

        db.all(query, [playerId, mode], (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    },
    getFirstPlaceForMap: (mapId, callback) => {
        let query = 'SELECT * FROM Scores WHERE mapId = ? ORDER BY score DESC LIMIT 1';

        db.all(query, [mapId], (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    },
    getFirstPlaceTop: (mode, count, callback) => {
        let query = 'SELECT playerName, COUNT(*) AS count FROM (SELECT mapId, MAX(score) AS max_score FROM Scores GROUP BY mapId) AS MaxScores INNER JOIN Scores AS Scores ON Scores.mapId = MaxScores.mapId AND Scores.score = MaxScores.max_score INNER JOIN Beatmaps ON Scores.mapId = Beatmaps.mapId AND mode = ? GROUP BY playerId ORDER BY count DESC LIMIT ?';

        db.all(query, [mode, count], (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    },
    getPlayersToNotify: (mapId, oldDate, newDate, callback) => {
        let query = 'SELECT playerId FROM Scores WHERE mapId = ? AND date >= ? AND date < ?';

        db.all(query, [mapId, oldDate, newDate], (err, rows) => {
            if (rows) {
                callback(undefined, rows.map(row => row.playerId));
            } else handleDbResult(err, rows, query, callback);
        })
    },
    getMapsForPlayer: (playerId, mode, callback) => {
        let query = 'SELECT Scores.*, Beatmaps.* FROM Scores JOIN Scores AS scoresForPlayer ON Scores.mapId = scoresForPlayer.mapId AND scoresForPlayer.playerId = ? INNER JOIN Beatmaps ON Scores.mapId = Beatmaps.mapId AND mode = ?';

        db.all(query, [playerId, mode], (err, rows) => {
            handleDbResult(err, rows, query, callback);
        });
    }
};

function handleDbResult(err, rows, query, callback) {
    if (err) {
        callback(err.message);
    } else if (rows) {
        callback(undefined, rows);
    } else callback("Unknown issue occurred for query: " + query);
}
