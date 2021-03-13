import { Message } from 'discord.js';
import { getMapIds } from '../services/databaseService';
import { clearFailedIds, setCurrentMapIndex } from '../services/settingsService';
import { isOwner, sendNoPermissionMessage } from './utils';
import { createDatabase } from '../services/buildService';

export default async function run(message: Message): Promise<void> {
  if (!isOwner(message)) {
    await sendNoPermissionMessage(message);
    return;
  }

  setCurrentMapIndex(0);
  clearFailedIds();
  const mapIds = await getMapIds();
  await createDatabase(mapIds);
}
