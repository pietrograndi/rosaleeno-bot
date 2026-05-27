import { env } from '../config';
import type { LatestAudio, Subscriber } from '../types';
import {
  getLatestAudio as getLatestAudioFromFile,
  setLatestAudio as setLatestAudioInFile
} from './latest-audio-repo';
import {
  getSubscriberByTelegramUserId as getFileSubscriberByTelegramUserId,
  initFileSubscribersRepo,
  listSubscribers as listFileSubscribers,
  setSubscriberPaused as setFileSubscriberPaused,
  upsertSubscriber as upsertFileSubscriber
} from './subscribers-repo';
import {
  getPostgresSubscriberByTelegramUserId,
  initPostgresSubscribersRepo,
  listPostgresSubscribers,
  setPostgresSubscriberPaused,
  upsertPostgresSubscriber
} from './postgres-subscribers-repo';
import {
  getSqliteSubscriberByTelegramUserId,
  initSqliteSubscribersRepo,
  listSqliteSubscribers,
  setSqliteSubscriberPaused,
  upsertSqliteSubscriber
} from './sqlite-subscribers-repo';

function getDatabaseUrl(): string {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL e obbligatorio quando SUBSCRIBERS_STORE=postgres');
  }
  return env.DATABASE_URL;
}

export async function initSubscribersStore(): Promise<void> {
  if (env.SUBSCRIBERS_STORE === 'postgres') {
    await initPostgresSubscribersRepo(getDatabaseUrl());
    return;
  }
  if (env.SUBSCRIBERS_STORE === 'sqlite') {
    await initSqliteSubscribersRepo(env.SQLITE_PATH);
    return;
  }

  await initFileSubscribersRepo();
}

export async function upsertSubscriber(subscriber: Subscriber): Promise<void> {
  if (env.SUBSCRIBERS_STORE === 'postgres') {
    await upsertPostgresSubscriber(getDatabaseUrl(), subscriber);
    return;
  }
  if (env.SUBSCRIBERS_STORE === 'sqlite') {
    await upsertSqliteSubscriber(env.SQLITE_PATH, subscriber);
    return;
  }

  await upsertFileSubscriber(subscriber);
}

export async function getSubscriberByTelegramUserId(
  telegramUserId: number
): Promise<Subscriber | undefined> {
  if (env.SUBSCRIBERS_STORE === 'postgres') {
    return getPostgresSubscriberByTelegramUserId(getDatabaseUrl(), telegramUserId);
  }
  if (env.SUBSCRIBERS_STORE === 'sqlite') {
    return getSqliteSubscriberByTelegramUserId(env.SQLITE_PATH, telegramUserId);
  }

  return getFileSubscriberByTelegramUserId(telegramUserId);
}

export async function listSubscribers(): Promise<Subscriber[]> {
  if (env.SUBSCRIBERS_STORE === 'postgres') {
    return listPostgresSubscribers(getDatabaseUrl());
  }
  if (env.SUBSCRIBERS_STORE === 'sqlite') {
    return listSqliteSubscribers(env.SQLITE_PATH);
  }

  return listFileSubscribers();
}

export async function setSubscriberPaused(
  telegramUserId: number,
  paused: boolean
): Promise<Subscriber | undefined> {
  if (env.SUBSCRIBERS_STORE === 'postgres') {
    return setPostgresSubscriberPaused(getDatabaseUrl(), telegramUserId, paused);
  }
  if (env.SUBSCRIBERS_STORE === 'sqlite') {
    return setSqliteSubscriberPaused(env.SQLITE_PATH, telegramUserId, paused);
  }

  return setFileSubscriberPaused(telegramUserId, paused);
}

export async function getLatestAudio(): Promise<LatestAudio | undefined> {
  return getLatestAudioFromFile();
}

export async function setLatestAudio(latestAudio: LatestAudio): Promise<void> {
  await setLatestAudioInFile(latestAudio);
}
