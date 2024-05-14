import { downloadFile, uploadFile } from './dropboxService';

const LINKED_USERS_FILE = 'users.json';

let linkedUsers: Record<string, number> = {};

export async function start(): Promise<void> {
  const result: Record<string, number> = await downloadFile(LINKED_USERS_FILE);
  if (result) linkedUsers = result;
}

export function getLinkedUsers(): Record<string, number> {
  return linkedUsers;
}

export function getMatchingLinkedUsers(userId: number): Array<string> | null {
  return Object.keys(linkedUsers).filter((key) => linkedUsers[key] === userId) || null;
}

function saveLinkedUsers(): Promise<void> {
  return uploadFile(LINKED_USERS_FILE, JSON.stringify(linkedUsers));
}

export function linkUser(discordUserId: string, userId: number): boolean {
  if (linkedUsers[discordUserId] === userId) return false;

  linkedUsers[discordUserId] = userId;
  saveLinkedUsers().catch(console.error);

  return true;
}

export function unlinkUser(discordUserId: string): boolean {
  if (!linkedUsers[discordUserId]) return false;

  delete linkedUsers[discordUserId];
  saveLinkedUsers().catch(console.error);

  return true;
}
