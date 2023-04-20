/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config();

import * as userLinkingService from './services/userLinkingService';
import * as settingsService from './services/settingsService';
import * as osuApiService from './services/osuApiService';
import { getCountryScores } from './services/buildService';
import { login } from './services/discordService';
import { http } from 'follow-redirects';

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
      sendRequest(pingUrl);
    }, 15 * 60 * 1000);
  }

  promises.push(osuApiService.updateBeatmapIds(apiKey));
  promises.push(userLinkingService.start());
  promises.push(settingsService.start());
  promises.push(osuApiService.start());

  await Promise.all(promises);
  await checkToken();
}

function sendRequest(url: string) {
  const options = {
    method: 'GET',
    hostname: url,
    path: '/',
    headers: {
      authority: url,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'accept-language': 'en-GB,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'sec-ch-ua': '"Chromium";v="112", "Brave";v="112", "Not:A-Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'sec-gpc': '1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
    },
    maxRedirects: 20
  };

  const req = http.request(options, (res) => {
    const chunks = [];

    res.on('data', (chunk) => {
      chunks.push(chunk);
    });

    res.on('end', (chunk: Uint8Array[]) => {
      const body = Buffer.concat(chunk);
      console.log(body.toString());
    });

    res.on('error', (error) => {
      console.error(error);
    });
  });

  req.end();
}

server.listen(80, () => {
  console.log('Listening on port 80');
});

init()
  .then(() => login())
  .catch(console.error);
