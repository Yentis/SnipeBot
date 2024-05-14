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

  promises.push(osuApiService.updateBeatmapIds(apiKey));
  promises.push(userLinkingService.start());
  promises.push(settingsService.start());
  promises.push(osuApiService.start());

  await Promise.all(promises);
  await checkToken();
}

server.listen(process.env.PORT, () => {
  console.log('Listening on port 80');
});

/* init()
  .then(() => login())
  .catch(console.error);
*/
