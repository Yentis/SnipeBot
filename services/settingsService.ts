import Settings from '../classes/settings';
import { downloadFile, uploadFile } from './dropboxService';

const SETTINGS_FILE = 'settings.json';
let settings = new Settings();

export async function start(): Promise<void> {
  const result: Settings = await downloadFile(SETTINGS_FILE);
  if (!result) return;
  settings = result;
}

export async function saveSettings(): Promise<void> {
  await uploadFile(SETTINGS_FILE, JSON.stringify(settings));
}

export function getLinkedChannels(): string[] {
  return settings.linkedChannels;
}

export function addLinkedChannel(channelId: string): boolean {
  if (settings.linkedChannels.includes(channelId)) return false;

  settings.linkedChannels.push(channelId);
  saveSettings().catch(console.error);

  return true;
}

export function removeLinkedChannel(channelId: string): boolean {
  const linkedChannelId = settings.linkedChannels.indexOf(channelId);
  if (linkedChannelId === -1) return false;

  settings.linkedChannels.splice(linkedChannelId, 1);
  saveSettings().catch(console.error);

  return true;
}

export function getFailedIds(): string[] {
  return settings.failedIds;
}

export function setFailedId(id: string): void {
  if (settings.failedIds.includes(id)) return;
  settings.failedIds.push(id);
}

export function clearFailedIds(): void {
  settings.failedIds = [];
}

export function tryUnsetFailedId(id: string): void {
  const index = settings.failedIds.indexOf(id);
  if (index === -1) return;

  settings.failedIds.splice(index, 1);
}

export function getCurrentMapIndex(): number {
  return settings.curIndex;
}

export function setCurrentMapIndex(index: number): void {
  settings.curIndex = index;
}
