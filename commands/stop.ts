import { Message } from 'discord.js';
import { stopBuilding } from '../services/buildService';
import { isOwner, sendNoPermissionMessage } from './utils';

export default async function run(message: Message): Promise<void> {
  if (!isOwner(message)) {
    await sendNoPermissionMessage(message);
    return;
  }

  stopBuilding();
}
