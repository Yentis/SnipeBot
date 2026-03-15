/* eslint-disable import/first */
import dotenv from 'dotenv';
dotenv.config();

import userLinkingService from './services/userLinkingService';
import settingsService from './services/settingsService';
import databaseService from './services/databaseService';
import osuApiService from './services/osuApiService';
import storageService from './services/storageService';
import webSocketService from './services/websocketService';
import discordService from './services/discordService';
import { getCountryScores } from './services/buildService';
import { Service } from './interfaces/service';

const services: Service[] = [];

async function checkToken(): Promise<void> {
  await getCountryScores('53');
}

async function init(): Promise<void> {
  const promises = [];
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw Error('API_KEY environment variable not defined!');

  services.push(storageService);
  await storageService.start();

  services.push(databaseService);
  promises.push(databaseService.start());

  services.push(osuApiService);
  promises.push(osuApiService.start(apiKey));

  services.push(userLinkingService);
  promises.push(userLinkingService.start());

  services.push(settingsService);
  promises.push(settingsService.start());

  await Promise.all(promises);
  await checkToken();

  services.push(discordService);
  await discordService.start();

  services.push(webSocketService);
  await webSocketService.start();
}

function exitHandler(options: { cleanup?: boolean; exit?: boolean }) {
  if (options.cleanup) {
    console.info('Bot stopping');

    services.forEach((service) => {
      service.stop();
    });

    console.info('Bot stopped');
  }

  if (options.exit) process.exit();
}

init().catch(console.error);

process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGTERM', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
process.on('uncaughtException', (code) => {
  console.error(code);
  exitHandler({ exit: true });
});
