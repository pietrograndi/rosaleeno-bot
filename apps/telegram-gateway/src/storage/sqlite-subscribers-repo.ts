import { mkdirSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Subscriber } from '../types';

let db: Database.Database | undefined;

function getDb(sqlitePath: string): Database.Database {
  if (db) {
    return db;
  }

  const resolvedPath = path.resolve(process.cwd(), sqlitePath);
  mkdirSync(path.dirname(resolvedPath), { recursive: true });

  db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.prepare(
    `
      CREATE TABLE IF NOT EXISTS telegram_subscribers (
        telegram_user_id INTEGER PRIMARY KEY,
        chat_id INTEGER NOT NULL,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        joined_at TEXT NOT NULL,
        paused INTEGER NOT NULL DEFAULT 0
      )
    `
  ).run();

  return db;
}

function mapRow(row: Record<string, unknown> | undefined): Subscriber | undefined {
  if (!row) {
    return undefined;
  }

  return {
    telegramUserId: Number(row.telegram_user_id),
    chatId: Number(row.chat_id),
    firstName: (row.first_name as string | null) ?? undefined,
    lastName: (row.last_name as string | null) ?? undefined,
    username: (row.username as string | null) ?? undefined,
    joinedAt: String(row.joined_at),
    paused: Number(row.paused) === 1
  };
}

export async function initSqliteSubscribersRepo(sqlitePath: string): Promise<void> {
  getDb(sqlitePath);
}

export async function upsertSqliteSubscriber(sqlitePath: string, subscriber: Subscriber): Promise<void> {
  const database = getDb(sqlitePath);
  database
    .prepare(
      `
        INSERT INTO telegram_subscribers
          (telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused)
        VALUES
          (@telegramUserId, @chatId, @firstName, @lastName, @username, @joinedAt, @paused)
        ON CONFLICT(telegram_user_id) DO UPDATE SET
          chat_id=excluded.chat_id,
          first_name=excluded.first_name,
          last_name=excluded.last_name,
          username=excluded.username,
          joined_at=excluded.joined_at,
          paused=excluded.paused
      `
    )
    .run({
      telegramUserId: subscriber.telegramUserId,
      chatId: subscriber.chatId,
      firstName: subscriber.firstName ?? null,
      lastName: subscriber.lastName ?? null,
      username: subscriber.username ?? null,
      joinedAt: subscriber.joinedAt,
      paused: subscriber.paused ? 1 : 0
    });
}

export async function getSqliteSubscriberByTelegramUserId(
  sqlitePath: string,
  telegramUserId: number
): Promise<Subscriber | undefined> {
  const database = getDb(sqlitePath);
  const row = database
    .prepare(
      `
        SELECT telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused
        FROM telegram_subscribers
        WHERE telegram_user_id = ?
      `
    )
    .get(telegramUserId) as Record<string, unknown> | undefined;

  return mapRow(row);
}

export async function listSqliteSubscribers(sqlitePath: string): Promise<Subscriber[]> {
  const database = getDb(sqlitePath);
  const rows = database
    .prepare(
      `
        SELECT telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused
        FROM telegram_subscribers
        ORDER BY joined_at ASC
      `
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((row) => mapRow(row)).filter((row): row is Subscriber => Boolean(row));
}

export async function setSqliteSubscriberPaused(
  sqlitePath: string,
  telegramUserId: number,
  paused: boolean
): Promise<Subscriber | undefined> {
  const database = getDb(sqlitePath);
  const result = database
    .prepare(
      `
        UPDATE telegram_subscribers
        SET paused = ?
        WHERE telegram_user_id = ?
      `
    )
    .run(paused ? 1 : 0, telegramUserId);

  if (result.changes === 0) {
    return undefined;
  }

  return getSqliteSubscriberByTelegramUserId(sqlitePath, telegramUserId);
}
