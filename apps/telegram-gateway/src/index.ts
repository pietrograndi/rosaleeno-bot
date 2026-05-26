import pino from 'pino';
import { buildServer } from './server';
import { env } from './config';
import { startTelegramBot, stopTelegramBot } from './bot';
import { initSubscribersStore } from './storage';

const logger = pino({ name: env.BOT_NAME });

async function start(): Promise<void> {
  await initSubscribersStore();

  const app = buildServer();
  await app.listen({ host: env.HOST, port: env.PORT });

  logger.info({ host: env.HOST, port: env.PORT }, 'http server started');

  let telegramStarted = false;
  try {
    await startTelegramBot();
    telegramStarted = true;
    logger.info('telegram bot started');
  } catch (error) {
    logger.error({ err: error }, 'telegram bot startup failed; http server remains available');
  }

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutdown received');
    await app.close();
    if (telegramStarted) {
      await stopTelegramBot();
    }
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

start().catch((error) => {
  logger.error({ err: error }, 'startup failed');
  process.exit(1);
});
