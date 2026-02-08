import { readFile, saveFile } from './storageService';

const LINKED_USERS_FILE = 'users.json';

let linkedUsers: Record<string, number> = {};

export async function start(): Promise<void> {
  linkedUsers = await readFile<Record<string, number>>(LINKED_USERS_FILE, {});
}

export function getLinkedUsers(): Record<string, number> {
  return linkedUsers;
}

export function getMatchingLinkedUsers(userId: number): Array<string> | null {
  return Object.keys(linkedUsers).filter((key) => linkedUsers[key] === userId) || null;
}

function saveLinkedUsers(): Promise<void> {
  return saveFile(LINKED_USERS_FILE, JSON.stringify(linkedUsers));
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
