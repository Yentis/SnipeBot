import fs from 'fs';

const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
const BASE_PATH = './storage';

export async function start(): Promise<void> {
  await fs.promises.mkdir(`${BASE_PATH}`, { recursive: true });
}

export async function saveFile(file: string, content: string): Promise<void> {
  if (content.length >= UPLOAD_FILE_SIZE_LIMIT) return;
  await fs.promises.writeFile(`${BASE_PATH}/${file}`, content);
}

export async function readFile<T>(file: string, fallback: T): Promise<T> {
  if (!fs.existsSync(`${BASE_PATH}/${file}`)) return fallback;

  const response = await fs.promises.readFile(`${BASE_PATH}/${file}`);
  return JSON.parse(response.toString('utf8')) as T;
}
