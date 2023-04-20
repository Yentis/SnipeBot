/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config();

import * as userLinkingService from './services/userLinkingService';
import * as settingsService from './services/settingsService';
import * as osuApiService from './services/osuApiService';
import { getCountryScores } from './services/buildService';
import { login } from './services/discordService';
import http from 'http';

const server = http.createServer((_, res) => {
  res.end('Hello, World!');
});

async function checkToken(): Promise<void> {
  await getCountryScores('53');
}

async function init(): Promise<void> {
  const promises = [];
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw Error('API_KEY environment variable not defined!');

  const pingUrl = process.env.PING_URL;
  console.log('Ping url:', pingUrl);

  if (pingUrl) {
    setInterval(() => {
      console.log('Pinging...');
      sendRequest(pingUrl).then(() => {
        console.log('Pinged.');
      }).catch(console.error);
    }, 15 * 60 * 1000);
  }

  promises.push(osuApiService.updateBeatmapIds(apiKey));
  promises.push(userLinkingService.start());
  promises.push(settingsService.start());
  promises.push(osuApiService.start());

  await Promise.all(promises);
  await checkToken();
}

async function sendRequest(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      res.on('error', (error) => {
        reject(error);
      });

      res.on('data', () => {
        // Do nothing
      });

      res.on('end', () => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode !== 0 && (statusCode < 200 || statusCode >= 400)) {
          reject(new Error(res.statusMessage));
          return;
        }

        resolve();
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

server.listen(80, () => {
  console.log('Listening on port 80');
});

init()
  .then(() => login())
  .catch(console.error);
