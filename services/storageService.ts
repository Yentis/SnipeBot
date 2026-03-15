import fs from 'fs';
import { Service } from '../interfaces/service';

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
const BASE_PATH = './storage';

class StorageService extends Service {
  async start(): Promise<void> {
    await fs.promises.mkdir(`${BASE_PATH}`, { recursive: true });
  }

  async saveFile(file: string, content: string): Promise<void> {
    if (content.length >= UPLOAD_FILE_SIZE_LIMIT) return;
    await fs.promises.writeFile(`${BASE_PATH}/${file}`, content);
  }

  async readFile<T>(file: string, fallback: T): Promise<T> {
    if (!fs.existsSync(`${BASE_PATH}/${file}`)) return fallback;

    const response = await fs.promises.readFile(`${BASE_PATH}/${file}`);
    return JSON.parse(response.toString('utf8')) as T;
  }

  override stop(): void {
    // Do nothing
  }
}

const storageService = new StorageService();
export default storageService;
