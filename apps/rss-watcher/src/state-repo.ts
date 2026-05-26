import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { RssState } from './types';

async function ensureStateFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ seenItemIds: [] }, null, 2), 'utf-8');
  }
}

export async function loadState(filePath: string): Promise<RssState> {
  await ensureStateFile(filePath);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as RssState;
  return {
    seenItemIds: Array.isArray(parsed.seenItemIds) ? parsed.seenItemIds : [],
    lastRunAt: parsed.lastRunAt
  };
}

export async function saveState(filePath: string, state: RssState): Promise<void> {
  await ensureStateFile(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

