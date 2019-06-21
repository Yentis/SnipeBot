module.exports = {
    uploadFile: (file, content) => {
        if (content.length < UPLOAD_FILE_SIZE_LIMIT) {
            dbx.filesUpload({path: "/" + file, contents: content, mode: {'.tag': 'overwrite'}})
                .then(() => {
                    console.warn(file + " was saved!");
                }).catch(error => logger.error(error));
        }
    },
    downloadFile: (file) => {
        return new Promise((resolve, reject) => {
            dbx.filesDownload({path: "/" + file})
                .then(response => {
                    if (response.fileBinary) {
                        let fileBuffer = new Buffer(response.fileBinary, 'binary');
                        resolve(JSON.parse(fileBuffer.toString('utf8')));
                    } else {
                        reject("File not found: " + file);
                    }
                }).catch(error => reject(error));
        });
    }
};

let fetch = require('isomorphic-fetch');
let Dropbox = require("dropbox").Dropbox;
let dbx = new Dropbox({accessToken: process.env.DROPBOX, fetch: fetch});

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
const winston = require('winston');
const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({filename: "logs.log"})
    ]
});