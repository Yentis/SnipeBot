import { Message } from 'discord.js';
import { createDatabase } from '../services/buildService';
import { send } from '../services/discordService';
import { getFailedIds } from '../services/settingsService';
import { isOwner, sendNoPermissionMessage } from './utils';

export default async function run(message: Message): Promise<void> {
  if (!isOwner(message)) {
    await sendNoPermissionMessage(message);
    return;
  }

  const failedIds = getFailedIds();
  if (failedIds.length === 0) {
    await send(message.channel, 'Nothing to rebuild.');
    return;
  }

  await createDatabase(failedIds.slice(0), 0, true);
}
