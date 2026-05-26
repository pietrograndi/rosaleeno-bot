import { Pool } from 'pg';
import type { Subscriber } from '../types';

const TABLE_NAME = 'telegram_subscribers';

let pool: Pool | undefined;

function getPool(databaseUrl: string): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl });
  }
  return pool;
}

export async function initPostgresSubscribersRepo(databaseUrl: string): Promise<void> {
  const db = getPool(databaseUrl);
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      telegram_user_id BIGINT PRIMARY KEY,
      chat_id BIGINT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      username TEXT,
      joined_at TIMESTAMPTZ NOT NULL,
      paused BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await db.query(`
    ALTER TABLE ${TABLE_NAME}
    ADD COLUMN IF NOT EXISTS paused BOOLEAN NOT NULL DEFAULT FALSE
  `);
}

export async function upsertPostgresSubscriber(
  databaseUrl: string,
  subscriber: Subscriber
): Promise<void> {
  const db = getPool(databaseUrl);
  await db.query(
    `
      INSERT INTO ${TABLE_NAME} (
        telegram_user_id,
        chat_id,
        first_name,
        last_name,
        username,
        joined_at,
        paused
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (telegram_user_id)
      DO UPDATE SET
        chat_id = EXCLUDED.chat_id,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        joined_at = EXCLUDED.joined_at,
        paused = EXCLUDED.paused
    `,
    [
      subscriber.telegramUserId,
      subscriber.chatId,
      subscriber.firstName ?? null,
      subscriber.lastName ?? null,
      subscriber.username ?? null,
      subscriber.joinedAt,
      subscriber.paused
    ]
  );
}

export async function getPostgresSubscriberByTelegramUserId(
  databaseUrl: string,
  telegramUserId: number
): Promise<Subscriber | undefined> {
  const db = getPool(databaseUrl);
  const result = await db.query<{
    telegram_user_id: string;
    chat_id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    joined_at: string;
    paused: boolean;
  }>(
    `
      SELECT telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused
      FROM ${TABLE_NAME}
      WHERE telegram_user_id = $1
      LIMIT 1
    `,
    [telegramUserId]
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    telegramUserId: Number(row.telegram_user_id),
    chatId: Number(row.chat_id),
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    username: row.username ?? undefined,
    joinedAt: new Date(row.joined_at).toISOString(),
    paused: row.paused
  };
}

export async function listPostgresSubscribers(databaseUrl: string): Promise<Subscriber[]> {
  const db = getPool(databaseUrl);
  const result = await db.query<{
    telegram_user_id: string;
    chat_id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    joined_at: string;
    paused: boolean;
  }>(
    `
      SELECT telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused
      FROM ${TABLE_NAME}
      ORDER BY joined_at ASC
    `
  );

  return result.rows.map((row) => ({
    telegramUserId: Number(row.telegram_user_id),
    chatId: Number(row.chat_id),
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    username: row.username ?? undefined,
    joinedAt: new Date(row.joined_at).toISOString(),
    paused: row.paused
  }));
}

export async function setPostgresSubscriberPaused(
  databaseUrl: string,
  telegramUserId: number,
  paused: boolean
): Promise<Subscriber | undefined> {
  const db = getPool(databaseUrl);
  const result = await db.query<{
    telegram_user_id: string;
    chat_id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
    joined_at: string;
    paused: boolean;
  }>(
    `
      UPDATE ${TABLE_NAME}
      SET paused = $2
      WHERE telegram_user_id = $1
      RETURNING telegram_user_id, chat_id, first_name, last_name, username, joined_at, paused
    `,
    [telegramUserId, paused]
  );

  const row = result.rows[0];
  if (!row) {
    return undefined;
  }

  return {
    telegramUserId: Number(row.telegram_user_id),
    chatId: Number(row.chat_id),
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    username: row.username ?? undefined,
    joinedAt: new Date(row.joined_at).toISOString(),
    paused: row.paused
  };
}
