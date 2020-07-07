module.exports = {
    updateBeatmapIds: (key) => {
        return new Promise((resolve, reject) => {
            apiKey = key;
            databaseManager.connect(() => {
                getLatestDate()
                .then(date => {
                    loopRequests(date);
                    resolveEmitter.on("done", () => {
                        resolve();
                    });
                    resolveEmitter.on("error", error => reject(error));
                });
            });
        });
    }
};

let requestify = require("requestify");
let EventEmitter = require("events");
let databaseManager = require("./databaseManager.js");
let apiKey;
let lastDbSize = 0;

const winston = require('winston');
const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({filename: "logs.log"}),
        new winston.transports.Console({format: winston.format.simple()})
    ]
});

class ResolveEmitter extends EventEmitter {}
const resolveEmitter = new ResolveEmitter();

function getLatestDate() {
    return new Promise(resolve => {
        databaseManager.getNewestMap((err, date) => {
            if (err) {
                logger.error(err);
            } else if (date) resolve(date);
            else resolve(toMysqlFormat(new Date("2007")));
        });
    });
}

function loopRequests(date) {
    sendRequest(date)
    .then(newDate => loopRequests(newDate))
    .catch(error => {
        console.log(error);
        if (error === "No more beatmaps") {
            resolveEmitter.emit("done");
        }
        else {
            console.warn(error);
            resolveEmitter.emit("error", error);
        }
    });
}

function sendRequest(date, b) {
    return new Promise((resolve, reject) => {
        let params = {
            k: apiKey
        };
        if (b) {params.b = b; console.log("Getting date from map " + b);}
        if (date) {params.since = date; console.log("Current date " + date);}

        requestify.post("http://osu.ppy.sh/api/get_beatmaps", {}, {
            params: params
        })
        .then(response => {
            if (date) {
                let beatmaps = response.getBody();
                if (beatmaps.length === 0) reject("No more beatmaps");
                else {
                    databaseManager.bulkAddBeatmapRows(beatmaps, () => {
                        databaseManager.getMapCount((err, count) => {
                            if (err) {
                                console.log(err);
                            } else if (count === lastDbSize && beatmaps.length < 500) {
                                reject("No more beatmaps");
                            } else {
                                lastDbSize = count;
                                finishAddingToDatabase(resolve, beatmaps[beatmaps.length-1]);
                            }
                        });
                    });
                }
            } else if (!b) reject("No date found");
            else {
                finishAddingToDatabase(resolve, response.getBody()[0]);
            }
        })
        .catch(error => {
            if (error.getBody().error) {
                console.error(error.getBody().error);
            } else console.error(error.getBody());
        });
    });
}

function finishAddingToDatabase(resolve, beatmapToResolve) {
    let targetDate = new Date(beatmapToResolve.approved_date + "Z");
    targetDate = new Date(targetDate.getTime() - 1000);
    resolve(toMysqlFormat(targetDate));
}

function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

function toMysqlFormat(date) {
    return date.getUTCFullYear() + "-" + twoDigits(1 + date.getUTCMonth()) + "-" + twoDigits(date.getUTCDate()) + " " + twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes()) + ":" + twoDigits(date.getUTCSeconds());
}