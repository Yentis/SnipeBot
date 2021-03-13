import { Message } from 'discord.js';
import { createDatabase } from '../services/buildService';
import { getMapIds } from '../services/databaseService';
import { getCurrentMapIndex } from '../services/settingsService';
import { isOwner, sendNoPermissionMessage } from './utils';

export default async function run(message: Message): Promise<void> {
  if (!isOwner(message)) {
    await sendNoPermissionMessage(message);
    return;
  }

  const mapIds = await getMapIds();
  await createDatabase(mapIds, getCurrentMapIndex());
}
