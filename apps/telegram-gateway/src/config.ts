import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  BOT_NAME: z.string().default('vdg-telegram-gateway'),
  SUBSCRIBERS_STORE: z.enum(['file', 'postgres']).default('file'),
  DATABASE_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
