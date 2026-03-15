import storageService from './storageService';
import { Service } from '../interfaces/service';

const LINKED_USERS_FILE = 'users.json';

class UserLinkingService extends Service {
  private linkedUsers: Record<string, number> = {};

  async start(): Promise<void> {
    this.linkedUsers = await storageService.readFile<Record<string, number>>(LINKED_USERS_FILE, {});
  }

  getLinkedUsers(): Record<string, number> {
    return this.linkedUsers;
  }

  getMatchingLinkedUsers(userId: number): Array<string> | null {
    return Object.keys(this.linkedUsers).filter((key) => this.linkedUsers[key] === userId) || null;
  }

  private saveLinkedUsers(): Promise<void> {
    return storageService.saveFile(LINKED_USERS_FILE, JSON.stringify(this.linkedUsers));
  }

  linkUser(discordUserId: string, userId: number): boolean {
    if (this.linkedUsers[discordUserId] === userId) return false;

    this.linkedUsers[discordUserId] = userId;
    this.saveLinkedUsers().catch(console.error);

    return true;
  }

  unlinkUser(discordUserId: string): boolean {
    if (!this.linkedUsers[discordUserId]) return false;

    delete this.linkedUsers[discordUserId];
    this.saveLinkedUsers().catch(console.error);

    return true;
  }

  override stop(): void {
    // Do nothing
  }
}

const userLinkingService = new UserLinkingService();
export default userLinkingService;
