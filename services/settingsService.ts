import Settings from '../classes/settings';
import storageService from './storageService';
import { Service } from '../interfaces/service';

const SETTINGS_FILE = 'settings.json';

class SettingsService extends Service {
  private settings = new Settings();

  async start(): Promise<void> {
    this.settings = await storageService.readFile(SETTINGS_FILE, new Settings());
  }

  async saveSettings(): Promise<void> {
    await storageService.saveFile(SETTINGS_FILE, JSON.stringify(this.settings));
  }

  getLinkedChannels(): string[] {
    return this.settings.linkedChannels;
  }

  addLinkedChannel(channelId: string): boolean {
    if (this.settings.linkedChannels.includes(channelId)) return false;

    this.settings.linkedChannels.push(channelId);
    this.saveSettings().catch(console.error);

    return true;
  }

  removeLinkedChannel(channelId: string): boolean {
    const linkedChannelId = this.settings.linkedChannels.indexOf(channelId);
    if (linkedChannelId === -1) return false;

    this.settings.linkedChannels.splice(linkedChannelId, 1);
    this.saveSettings().catch(console.error);

    return true;
  }

  getFailedIds(): string[] {
    return this.settings.failedIds;
  }

  setFailedId(id: string): void {
    if (this.settings.failedIds.includes(id)) return;
    this.settings.failedIds.push(id);
  }

  clearFailedIds(): void {
    this.settings.failedIds = [];
  }

  tryUnsetFailedId(id: string): void {
    const index = this.settings.failedIds.indexOf(id);
    if (index === -1) return;

    this.settings.failedIds.splice(index, 1);
  }

  getCurrentMapIndex(): number {
    return this.settings.curIndex;
  }

  setCurrentMapIndex(index: number): void {
    this.settings.curIndex = index;
  }

  getLastProcessedScore(): number | undefined {
    return this.settings.lastProcessedScore;
  }

  setLastProcessedScore(score: number): void {
    this.settings.lastProcessedScore = score;
  }

  override stop(): void {
    // Do nothing
  }
}

const settingsService = new SettingsService();
export default settingsService;
