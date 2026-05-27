import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { LatestAudio } from '../types';

const DATA_FILE = path.resolve(process.cwd(), 'data', 'latest-audio.json');

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
}

export async function getLatestAudio(): Promise<LatestAudio | undefined> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as LatestAudio;
  } catch {
    return undefined;
  }
}

export async function setLatestAudio(latestAudio: LatestAudio): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(latestAudio, null, 2)}\n`, 'utf-8');
}
