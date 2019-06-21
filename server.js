let requestify = require("requestify");
let Discord = require("discord.js");
let Queue = require("promise-queue");
let beatmapIdManager = require("./beatmapIdManager.js");
let dropboxManager = require("./dropboxManager.js");
let databaseManager = require("./databaseManager.js");

const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.simple(),
  transports: [
    new winston.transports.File({filename: "logs.log"})
  ]
});
const mapRegex = /^https:\/\/osu.ppy.sh\/b\/[0-9]*$/;
const USERS_FILE = "users.json";
const SETTINGS_FILE = "settings.json";
const CACHEDUSERS_FILE = "cachedUsers.json";
const modeEnum = {
    "osu": 0,
    "taiko": 1,
    "ctb": 2,
    "mania": 3
};
const commandPrefix = "&";
let users = {};
let cachedUsers = {};
let settings = {};
let done = 0;
let stop = false;
let queue;
let progressMessages = [];
let validKeys = [];
let curKeyIndex = 0;

let bot = new Discord.Client();

bot.on("raw", event => {
    if (event.t !== "MESSAGE_REACTION_ADD") return;
    if (event.d.emoji.id || event.d.emoji.name !== "✅") return;
    if (event.d.user_id === bot.user.id) return;

    let user = bot.users.get(event.d.user_id);
    let channel = bot.channels.get(event.d.channel_id);
    if (channel && channel.type !== "dm") return;
    if (!channel) {
        user.createDM()
            .then(channel => {
                deleteMessageFromChannel(channel, event.d.message_id);
            });
    } else {
        deleteMessageFromChannel(channel, event.d.message_id);
    }
});

function deleteMessageFromChannel(channel, messageId) {
    channel.fetchMessage(messageId)
        .then(message => {
            if (message.author.bot) message.delete();
        });
}

bot.on("message", message => {
    let content = message.content;
    let options = content.split(" ");
    let command = options[0];
    let firstParam = options[1];
    let beatmapId = tryGetBeatmapFromMessage(message);

    if (beatmapId || command === commandPrefix + "linkchannel" || settings.linkedChannels.indexOf(message.channel.id) !== -1 || message.channel.type === "dm") {
        if (beatmapId) {
            getCountryScores(beatmapId)
                .then(data => {
                    handleCountryScores(data);
                })
                .catch (error => {
                    message.channel.send("Error: " + error);
                });
        }
        switch (command) {
            case commandPrefix + "linkchannel":
                if (message.channel.type === "dm" || !isMod(message)) return;
                if (settings.linkedChannels.indexOf(message.channel.id) === -1) {
                    settings.linkedChannels.push(message.channel.id);
                    message.channel.send("This channel can now be used by the bot.");
                }
                saveFile(SETTINGS_FILE, settings);
                break;
            case commandPrefix + "unlinkchannel":
                if (message.channel.type === "dm" || !isMod(message)) return;
                let i = settings.linkedChannels.indexOf(message.channel.id);
                if (i !== -1) settings.linkedChannels.splice(i, 1);
                message.channel.send("This channel was unlinked.");
                saveFile(SETTINGS_FILE, settings);
                break;
            case commandPrefix + "snipe":
                let beatmapId = parseInt(firstParam);
                if (Number.isInteger(beatmapId)) {
                    getCountryScores(beatmapId)
                        .then(data => {
                            handleCountryScores(data, message.channel);
                        })
                        .catch (error => {
                            logger.error("Failed to retrieve scores for map: " + beatmapId + " | " + error);
                        });
                }
                break;
            case commandPrefix + "rebuild":
                if (!isOwner(message)) return;
                settings.curIndex = 0;
                settings.failedIds = [];
                databaseManager.getMapIds((err, rows) => {
                    if (err) {
                        logger.info(err);
                    } else {
                        createDatabase(rows)
                            .catch(error => {
                                logger.info(error);
                                message.channel.send("Error: " + error);
                            })
                    }
                });
                break;
            case commandPrefix + "link":
                let remainder = options.slice(1, content.length).join(" ");
                getUser(remainder)
                    .then(user => {
                        users[message.author.id] = parseInt(user.userId);
                        message.channel.send("Linked " + ping(message.author.id) + " to osu! user " + user.username);
                        saveFile(USERS_FILE, users);
                    })
                    .catch(error => message.channel.send("Error: " + error));
                break;
            case commandPrefix + "continue":
                if (!isOwner(message)) return;
                databaseManager.getMapIds((err, rows) => {
                    if (err) {
                        logger.info(err);
                    } else {
                        createDatabase(rows, settings.curIndex)
                            .catch(error => message.channel.send("Error: " + error));
                    }
                });
                break;
            case commandPrefix + "unlink":
                if (users[message.author.id]) {
                    delete users[message.author.id];
                    message.channel.send("You have been unlinked.");
                    saveFile(USERS_FILE, users);
                } else message.channel.send("No user found.");
                break;
            case commandPrefix + "rebuildfailed":
                if (!isOwner(message)) return;
                createDatabase(settings.failedIds.slice(0), 0, true)
                    .catch(error => message.channel.send("Error: " + error));
                break;
            case commandPrefix + "stop":
                if (!isOwner(message)) return;
                stop = true;
                break;
            case commandPrefix + "init":
                if (!isOwner(message)) return;
                init().then(() => message.channel.send("Done!")).catch(error => logger.info("Error: " + error));
                break;
            case commandPrefix + "progress":
                let progressMessage = getProgressMessage(message.channel.id);
                if (progressMessage) {
                    message.channel.send("https://discordapp.com/channels/" + progressMessage.guild.id + "/" + progressMessage.channel.id + "/" + progressMessage.id);
                } else message.channel.send("Currently not rebuilding.");
                break;
            case commandPrefix + "scores":
            case commandPrefix + "count":
                processScoresCommand(content, message.channel, command === commandPrefix + "scores");
                break;
            case commandPrefix + "delete":
              message.channel.send(firstParam + " has been DELETED");
              break;
            case commandPrefix + "help":
                message.channel.send("List of commands:\n\n" +
                    "&linkchannel: Link a channel to allow the bot to post in it. (must have kick rights to use this command)\n\n" +
                    "&unlinkchannel: Unlink a channel.\n\n" +
                    "&snipe: Manually check a map's first place score. Must be followed by a beatmap ID (not beatmapset ID).\n\n" +
                    "&link: Link an osu! account to your discord user, this will make the bot PM you when you get sniped. You can react with <:white_check_mark:572154880500826161> to remove a message to signify it has been sniped back.\n\n" +
                    "&unlink: Unlink any linked accounts from your discord user.\n\n" +
                    "&progress: If the score database is being rebuilt, this will show the current progress.\n\n" +
                    "&scores: Get all #1 scores of a given user, can specify mode by typing 'mania', 'ctb' or 'taiko' after &snipe. Default is standard.\n\n" +
                    "&count: Get the amount of #1 scores of a given user, can specify mode.\n\n" +
                    "&top: Example: &top5 Get the top X users by amount of #1 scores, can specify mode.\n\n" +
                    "Good to know: The bot will pick up on <r from PP-Generator bot and !rs from BoatBot and check those for new first place scores.");
                break;
        }

        if (command.startsWith(commandPrefix + "top")) {
            let amount = parseInt(command.replace(commandPrefix + "top", ""));
            if (Number.isInteger(amount)) {
                let params = getParamsFromContent(content);
                let promises = rankings(Math.min(100, Math.max(1, amount)), params.mode)
                    .map(leader => getUser(leader[0]).then(user =>
                        [user,leader[1]]
                    ));
                Promise.all(promises)
                    .then(results => {
                        let output = '';
                        let rank = 0;
                        for ([user, count] of results) {
                            rank++;
                            output += rank + '. ' + user.username + ' - ' + count + '\n';
                        }
                        message.channel.send(output);
                    });
            } else message.channel.send("Invalid top count");
        }
    }
});

bot.on("ready", () => {
    logger.info("Bot running");
    console.warn("Bot running");
    if (settings.curIndex > 0) {
        databaseManager.getMapIds((err, rows) => {
            if (err) {
                logger.info(err);
            } else {
                createDatabase(rows, settings.curIndex)
                    .catch(error => publishMessage("Error: " + error));
            }
        });
    }
});

init()
    .then(() => bot.login(process.env.BOT_TOKEN))
    .catch(errors => {
        console.warn(errors);
        logger.info(errors);
    });

function getParamsFromContent(content) {
    let options = content.split(" ");
    let modeInt = 0;
    let userNameIndex = 2;
    let hasMode = false;

    if (options[1]) {
        let mode = options[1];
        if (modeEnum[mode] !== undefined) {
            modeInt = modeEnum[mode];
            hasMode = true;
        } else if (options[1].length === 1) {
            Object.keys(modeEnum).forEach(key => {
                mode = parseInt(mode);
                if (Number.isInteger(mode) && modeEnum[key] === parseInt(mode)) {
                    modeInt = modeEnum[key];
                    hasMode = true;
                }
            })
        }
    }
    if (!hasMode) userNameIndex = 1;

    return {mode: modeInt, username: options[userNameIndex] ? options.slice(userNameIndex, content.length).join(" ").toLowerCase() : null};
}

function processScoresCommand(content, channel, showList) {
    let params = getParamsFromContent(content);
    let unclaimed = params.username === "unclaimed";

    if(showList) {
        if (!unclaimed) {
            getUser(params.username).then(user => {
                countThroughMapIds(user.userId, true, params.mode)
                    .then(list => {
                        if (list.amount === 0) channel.send(user.username + " does not have any #1 scores.");
                        else channel.send("Here are all the maps " + user.username + " is first place on (" + list.amount + " maps):", new Discord.Attachment(Buffer.from(list.list), "Scores " + user.username + ".html"));
                    });
            }).catch(error => channel.send("Error: " + error));
        } else {
            countThroughMapIds(false, true, params.mode)
                .then(list => {
                    if (list.amount === 0) channel.send("All maps have a #1 score.");
                    else channel.send("Here are all the maps without any scores (" + list.amount + " maps):", new Discord.Attachment(Buffer.from(list.list), "UnclaimedMaps.html"));
                });
        }
    } else {
        if (!unclaimed) {
            getUser(params.username).then(user => {
                countThroughMapIds(user.userId, false, params.mode)
                    .then(list => {
                        if (list.amount === 0) channel.send(user.username + " does not have any #1 scores.");
                        else channel.send(user.username + " is first place on " + list.amount + " maps");
                    })
            }).catch(error => channel.send("Error: " + error));
        } else {
            countThroughMapIds(false, false, params.mode)
                .then(list => {
                    if (list.amount === 0) channel.send("All maps have a #1 score.");
                    else channel.send("There are " + list.amount + " maps with no #1 score.");
                });
        }
    }
}

function tryGetBeatmapFromMessage(message) {
    if (message.author.id === bot.user.id) return;
    if (message.embeds.length === 0) return false;
    let embed = message.embeds[0];
    if (embed.message.embeds.length === 0) return false;
    embed = embed.message.embeds[0];
    let url = embed.url;
    if (!url) return false;
    if (url.indexOf(commandPrefix) !== -1) url = url.substring(0, url.indexOf(commandPrefix));
    if (mapRegex.exec(url)) {
        let split = url.split("/");
        return parseInt(split[split.length-1]);
    } else return false;
}

function getProgressMessage(channelId) {
    for (let i = 0; i < progressMessages.length; i++) {
        if (progressMessages[i].channel.id === channelId) return progressMessages[i];
    }
    return null;
}

function getNextTokenKey() {
    if (curKeyIndex > validKeys.length - 1) curKeyIndex = 1;
    else curKeyIndex++;
    return curKeyIndex;
}

function isMod(message) {
    if (message.member.hasPermission('KICK_MEMBERS')) return true;
    else {
        message.channel.send("Oi bruv you got a loicense for that command?");
        return false;
    }
}

function isOwner(message) {
    let owner = parseInt(message.author.id) === 68834122860077056;
    if (!owner) {
        message.channel.send("Oi bruv you got a loicense for that command?");
        return false;
    } else return true;
}

function init() {
    return new Promise((resolve, reject) => {
        queue = new Queue(1, Infinity);
        let promises = [];

        promises.push(beatmapIdManager.updateBeatmapIds(process.env.API_KEY));
        promises.push(readFile(USERS_FILE));
        promises.push(readFile(SETTINGS_FILE));
        promises.push(readFile(CACHEDUSERS_FILE));
        promises.push(checkTokens());

        Promise.all(promises)
            .then(results => {
                users = results[1] ? results[1] : {};
                settings = results[2] ? results[2] : {"curIndex":0,"failedIds":[],"linkedChannels":[]};
                cachedUsers = results[3] ? results[3] : {};
                queue = new Queue(validKeys.length, Infinity);

                resolve();
            })
            .catch(errors => {
                if (errors) reject(errors);
            })
    });
}

function checkTokens() {
    let curIndex = 1;
    while(process.env["SESSION_KEY"+curIndex]) {
        curIndex++;
    }

    let done = 0;
    return new Promise(mainResolve => {
        for (let i = 1, p = Promise.resolve(); i < curIndex; i++) {
            p = p.then(() => new Promise(resolve => {
                    getCountryScores(53, i)
                        .then(() => {
                            validKeys.push(process.env["SESSION_KEY" + i]);
                            done++;
                            resolve();

                            if (done === curIndex-1) mainResolve();
                        })
                        .catch(error => {
                            logger.info("SESSION_KEY" + i + " is invalid.");
                            done++;
                            resolve(error);

                            if (done === curIndex-1) mainResolve();
                        })
                }
            ));
        }
    });
}

function ping(id) {
    return "<@" + id + ">";
}

function getExistingUser(u) {
    if (cachedUsers[u]) return {username: cachedUsers[u], userId: u};
    else {
        let foundUser = null;
        Object.keys(cachedUsers).forEach(userId => {
            if (cachedUsers[userId] === u) {
                foundUser = {username: cachedUsers[userId], userId: userId};
            }
        });
        return foundUser;
    }
}

function getUser(u) {
    return new Promise((resolve, reject) => {
        let existingUser = getExistingUser(u);
        if (existingUser) {
            resolve(existingUser);
            return;
        }

        requestify.post("http://osu.ppy.sh/api/get_user", {}, {
            params: {
                k: process.env.API_KEY,
                u: u
            }
        })
            .then(response => {
                if (response.body === "[]") reject(u + " not found");
                else {
                    let user = response.getBody()[0];
                    cachedUsers[user.user_id] = user.username;
                    saveFile(CACHEDUSERS_FILE, cachedUsers);
                    resolve({userId: user.user_id, username: user.username});
                }
            })
            .catch(error => reject(error.getBody().error));
    });
}

function createDatabase(ids, startIndex, rebuildFailed) {
    return new Promise((mainResolve, mainReject) => {
        publishMessage("Building: 0.00% (0 of " + ids.slice(startIndex).length + ")")
            .then(messages => {
                progressMessages = messages;
                done = 0;
                stop = false;

                if (!startIndex) startIndex = 0;
                let idList = ids.slice(startIndex);
                if (idList.length === 0) finishCreatingDatabase(mainResolve);

                let originalArray = idList.slice(0, idList.length);
                let arrays = [], size = (idList.length / validKeys.length) + 1;
                while (idList.length > 0) arrays.push(idList.splice(0, size));

                let index = 0;
                for (let i = 0; i < arrays.length; i++) {
                    for (let j = 0, p = Promise.resolve(); j < arrays[i].length; j++) {
                        p = p.then(() => new Promise(resolve => {
                            let data = {
                                resolve: resolve,
                                mainResolve: mainResolve,
                                user: null,
                                beatmapId: null,
                                ids: arrays[i],
                                fullArray: originalArray,
                                index: index,
                                isMain: i === 0,
                                startIndex: startIndex,
                                rebuildFailed: rebuildFailed
                            };
                            settings.curIndex = Math.max(0, (index - arrays.length) + startIndex);
                            index++;
                            doRequest(data, stop);
                        })).catch(error => mainReject(error));
                    }
                }
            });
    });
}

function doRequest(data, stop) {
    let beatmapId = data.fullArray[data.index];
    data.beatmapId = beatmapId;

    if (stop) {
        if (data.isMain) finishCreatingDatabase(data.mainResolve);
        return;
    }

    let realIndex = data.index + 1 + data.startIndex;
    new Promise(resolve => {
        if (data.rebuildFailed) {
            resolve(data.fullArray.length);
        } else {
            databaseManager.getMapIds((err, rows) => {
                if (err) {
                    logger.info(err);
                    resolve(0);
                } else resolve(rows.length);
            });
        }
    }).then(realLength => {
        console.warn("Processing " + beatmapId + " | " + realIndex + " of " + realLength);
        let progress = ((realIndex / realLength) * 100).toFixed(2);
        progressMessages.forEach(progressMessage => {
            progressMessage.edit("Building: " + progress + "% (" + realIndex + " of " + realLength + ") | " + settings.failedIds.length + " failed");
        });

        let timeout = setTimeout(() => {
            logger.info("Error: " + beatmapId + " timed out");
            afterFirstPlaceRequest(data);
            if (!data.rebuildFailed) settings.failedIds.push(beatmapId);
        }, 21000);

        getCountryScores(beatmapId)
            .then(response => {
                let failedIdIndex = settings.failedIds.indexOf(beatmapId);
                if (failedIdIndex !== -1) settings.failedIds.splice(failedIdIndex, 1);
                clearTimeout(timeout);
                data.response = response;
                afterFirstPlaceRequest(data);
            })
            .catch(error => {
                clearTimeout(timeout);
                if (error !== "No scores found.") {
                    logger.info("Error: " + error);
                    afterFirstPlaceRequest(data);
                    if (!data.rebuildFailed) settings.failedIds.push(beatmapId);
                } else {
                    let failedIdIndex = settings.failedIds.indexOf(beatmapId);
                    if (failedIdIndex !== -1) settings.failedIds.splice(failedIdIndex, 1);
                    afterFirstPlaceRequest(data);
                }
            });
    });
}

function afterFirstPlaceRequest(data) {
    if (data.response) {
        handleCountryScores(data.response).then(() => {
            done++;
            afterHandlingScores(data);
        });
    } else {
        done++;
        afterHandlingScores(data);
    }
}

function afterHandlingScores(data) {
    if (done % 50 === 0) {
        saveFile(SETTINGS_FILE, settings)
    }
    if (done === data.fullArray.length) {
        settings.curIndex = 0;
        finishCreatingDatabase(data.mainResolve);
    }
    else data.resolve();
}

function finishCreatingDatabase(mainResolve) {
    publishMessage("Done. Failed to process " + settings.failedIds.length + " maps.");
    progressMessages = [];
    saveFile(SETTINGS_FILE, settings);
    mainResolve();
}

function handleCountryScores(data, channel) {
    return new Promise(resolve => {
        let beatmapId = data.beatmapId;
        if (data.scores.length === 0) {
            if (channel) channel.send("No scores found\n" + data.mapLink);
            databaseManager.deleteScoresForMap(beatmapId, err => {
                if (err) logger.info(err);
                resolve();
            });
            return;
        }

        let firstPlace = data.scores[0];
        databaseManager.getFirstPlaceForMap(beatmapId, (err, rows) => {
            if (err) {
                logger.info(err);
            } else {
                let isNewScore = rows.length === 0;
                let message = firstPlace.u + "\n" + data.scoreData + "\n" + data.mapLink;

                if (isNewScore || firstPlace.d !== rows[0].date) {
                    //New highscore
                    if (isNewScore) {
                        publishMessage("New first place is " + message);
                    } else if (!(firstPlace.id === rows[0].playerId)) {
                        notifyLinkedUser(rows[0].playerId, data);
                        publishMessage(rows[0].playerName + " was sniped by " + message);
                    }
                } else if (channel) channel.send("First place is " + message);
            }
        });

        databaseManager.deleteScoresForMap(beatmapId, err => {
            if (err) logger.info(err);
            databaseManager.bulkAddScoreRows(beatmapId, data.scores, err => {
                if (err) logger.info(err);
                resolve();
            });
        });
    });
}

function notifyLinkedUser(oldFirstPlaceId, data) {
    let firstPlace = data.scores[0];

    let localUser = getUserFromDb(oldFirstPlaceId);
    if (localUser) {
        bot.fetchUser(localUser).then(user => {
            user.send("You were sniped by " + firstPlace.u + "\n" + data.scoreData + "\n" + data.mapLink);
        }).catch(error => logger.info(error));
    }
    return true;
}

function publishMessage(message) {
    return new Promise((mainResolve, mainReject) => {
        let messages = [];
        let done = 0;

        for (let i = 0, p = Promise.resolve(); i < settings.linkedChannels.length; i++) {
            p = p.then(() => new Promise(resolve => {
                let channel = bot.channels.get(settings.linkedChannels[i]);
                if (channel) {
                    channel.send(message)
                        .then(message => {
                            messages.push(message);
                            resolve();

                            done++;
                            if (done === settings.linkedChannels.length) mainResolve(messages);
                        })
                        .catch(() => {
                            done++;
                            if (done === settings.linkedChannels.length) mainResolve(messages);
                        });
                } else {
                    logger.info(settings.linkedChannels[i] + " couldn't be found.");
                    resolve();

                    done++;
                    if (done === settings.linkedChannels.length) mainResolve(messages);
                }
            })).catch(error => mainReject(error));
        }
    });
}

function getUserFromDb(userId) {
    for (let key in users) {
        if (users.hasOwnProperty(key)) {
            if (users[key] === userId) return key;
        }
    }
    return false;
}

function getCountryScores(beatmapId, keyIndex) {
    return new Promise((resolve, reject) => {
        queue.add(() => {
            return new Promise((resolve, reject) => {
                if (!keyIndex) keyIndex = getNextTokenKey();
                let params = {
                    type: "country"
                };

                let startTime = new Date();
                requestify.get("http://osu.ppy.sh/beatmaps/" + beatmapId + "/scores", {
                    params: params,
                    cookies: {
                        osu_session: process.env["SESSION_KEY" + keyIndex]
                    }
                })
                    .then(response => {
                        let elapsedTime = new Date() - startTime;
                        if (elapsedTime < 1500) {
                            setTimeout(() => {
                                resolveResponse(response, reject, resolve);
                            }, 1500 - elapsedTime);
                        } else {
                            resolveResponse(response, reject, resolve);
                        }
                    })
                    .catch(error => {
                        let errorText = "Failed to retrieve first place";
                        if (error.body.includes("The beatmap you are looking for was not found!")) {
                            logger.info("Beatmap " + beatmapId + " not found.");
                        } else logger.info(error.body.substring(0, 1000));
                        let elapsedTime = new Date() - startTime;
                        if (elapsedTime < 1500) {
                            setTimeout(() => {
                                reject(errorText);
                            }, 1500 - elapsedTime);
                        } else {
                            reject(errorText);
                        }
                    });
            });
        })
            .then(user => resolve(user))
            .catch(error => reject(error));
    });
}

function resolveResponse(response, reject, resolve) {
    let scores = JSON.parse(response.body).scores;
    if (scores.length === 0) reject("No scores found.");
    else {
        let beatmapId = scores[0].beatmap.id;
        let parsedScores = {
            beatmapId: beatmapId,
            mapLink: "https://osu.ppy.sh/b/" + beatmapId,
            scoreData: "Mode: " + scores[0].mode + " | Score: " + scores[0].score,
            scores: []
        };
        for (let i = 0; i < scores.length; i++) {
            let score = scores[i];
            let scoreInfo = {
                id: parseInt(score.user.id),
                u: score.user.username,
                d: score.created_at
            };
            if (i === 0) scoreInfo.s = score.score.toLocaleString();
            parsedScores.scores.push(scoreInfo);
        }
        resolve(parsedScores);
    }
}

function readFile(file) {
    return new Promise(resolve => {
        dropboxManager.downloadFile(file)
            .then(result => resolve(result))
            .catch(error => {
                console.log(error);
            });
    });
}

function saveFile(file, content) {
    dropboxManager.uploadFile(file, JSON.stringify(content));
}

function rankings(size, mode) {
    return new Promise((resolve, reject) => {
        databaseManager.getFirstPlaceTop(mode, size, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                let results = "";

                for (let i = 0; i < rows.length; i++) {
                    if (i !== 0) results += "\n";
                    results += (i+1) + ". " + rows[i].playerName + " - " + rows[i].count;
                }
                resolve(results);
            }
        });
    });
}

function countThroughMapIds(userId, createList, mode) {
    return new Promise(resolve => {
        let result = {
            list: "",
            amount: 0
        };

        if (userId) {
            userId = parseInt(userId);
            databaseManager.getFirstPlacesForPlayer(userId, mode, (err, rows) => {
                if (err) {
                    logger.info(err);
                } else result = generateHtmlForMaps(rows, createList, result);
                resolve(result);
            });
        } else {
            databaseManager.getMapsWithNoScores(mode, (err, rows) => {
                if (err) {
                    logger.info(err);
                } else result = generateHtmlForMaps(rows, createList, result);
                resolve(result);
            })
        }
    });
}

function generateHtmlForMaps(maps, createList, result) {
    maps.forEach(beatmap => {
        if (createList) {
            let htmlString = "";
            if (beatmap) {
                htmlString = "<a href='https://osu.ppy.sh/b/" + beatmap.mapId + "'>" + createTitleFromBeatmap(beatmap) + "</a><br>";
            }
            result.list += htmlString;
        }
        result.amount++;
    });

    return result;
}

function createTitleFromBeatmap(beatmap) {
    return beatmap.artist + " - " + beatmap.title + " [" + beatmap.version + "] | Stars: " + beatmap.difficulty;
}
