import 'dotenv/config';
import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  RSS_FEED_URL: z.string().url(),
  GATEWAY_URL: z.string().url().default('http://localhost:3000'),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  STATE_FILE_PATH: z.string().default('data/processed-items.json'),
  WATCHER_NAME: z.string().default('vdg-rss-watcher')
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  STATE_FILE_PATH: path.resolve(process.cwd(), parsedEnv.STATE_FILE_PATH)
};
