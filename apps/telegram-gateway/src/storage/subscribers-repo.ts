import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Subscriber } from '../types';

const DATA_FILE = path.resolve(process.cwd(), 'data', 'subscribers.json');

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, '[]\n', 'utf-8');
  }
}

export async function initFileSubscribersRepo(): Promise<void> {
  await ensureDataFile();
}

async function readAll(): Promise<Subscriber[]> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as Array<Partial<Subscriber>>;
  return parsed.map((subscriber) => ({
    telegramUserId: Number(subscriber.telegramUserId),
    chatId: Number(subscriber.chatId),
    firstName: subscriber.firstName,
    lastName: subscriber.lastName,
    username: subscriber.username,
    joinedAt: subscriber.joinedAt ?? new Date().toISOString(),
    paused: subscriber.paused ?? false
  }));
}

async function writeAll(subscribers: Subscriber[]): Promise<void> {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, `${JSON.stringify(subscribers, null, 2)}\n`, 'utf-8');
}

export async function upsertSubscriber(subscriber: Subscriber): Promise<void> {
  const subscribers = await readAll();
  const idx = subscribers.findIndex((s) => s.telegramUserId === subscriber.telegramUserId);

  if (idx >= 0) {
    subscribers[idx] = { ...subscribers[idx], ...subscriber };
  } else {
    subscribers.push(subscriber);
  }

  await writeAll(subscribers);
}

export async function setSubscriberPaused(
  telegramUserId: number,
  paused: boolean
): Promise<Subscriber | undefined> {
  const subscribers = await readAll();
  const idx = subscribers.findIndex((s) => s.telegramUserId === telegramUserId);
  if (idx < 0) {
    return undefined;
  }

  subscribers[idx] = {
    ...subscribers[idx],
    paused
  };
  await writeAll(subscribers);
  return subscribers[idx];
}

export async function getSubscriberByTelegramUserId(
  telegramUserId: number
): Promise<Subscriber | undefined> {
  const subscribers = await readAll();
  return subscribers.find((s) => s.telegramUserId === telegramUserId);
}

export async function listSubscribers(): Promise<Subscriber[]> {
  return readAll();
}
