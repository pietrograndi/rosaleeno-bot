import { Bot } from 'grammy';
import pino from 'pino';
import { env } from './config';
import {
  getLatestAudio,
  getSubscriberByTelegramUserId,
  setSubscriberPaused,
  upsertSubscriber
} from './storage';

const logger = pino({ name: `${env.BOT_NAME}:telegram` });

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.command('start', async (ctx) => {
  if (!ctx.from) {
    await ctx.reply('Impossibile completare iscrizione: utente Telegram non disponibile.');
    return;
  }

  const joinedAt = new Date().toISOString();
  const subscriber = {
    telegramUserId: ctx.from.id,
    chatId: ctx.chat.id,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    username: ctx.from.username,
    joinedAt,
    paused: false
  };

  await upsertSubscriber(subscriber);

  const existing = await getSubscriberByTelegramUserId(ctx.from.id);
  logger.info({ telegramUserId: ctx.from.id, chatId: ctx.chat.id }, 'subscriber upserted');

  await ctx.reply(
    `Iscrizione completata. Ti invieremo qui i messaggi di aggiornamento. chat_id=${existing?.chatId}`
  );
});

bot.command('me', async (ctx) => {
  if (!ctx.from) {
    await ctx.reply('Impossibile recuperare il profilo: utente Telegram non disponibile.');
    return;
  }

  const subscriber = await getSubscriberByTelegramUserId(ctx.from.id);
  if (!subscriber) {
    await ctx.reply('Non ti trovo tra gli iscritti. Usa /start per completare l iscrizione.');
    return;
  }

  await ctx.reply(
    `Profilo registrato:\n- chat_id: ${subscriber.chatId}\n- user_id: ${subscriber.telegramUserId}\n- stato: ${
      subscriber.paused ? 'in pausa' : 'attivo'
    }`
  );
});

bot.command('stop', async (ctx) => {
  if (!ctx.from) {
    await ctx.reply('Impossibile aggiornare il profilo: utente Telegram non disponibile.');
    return;
  }

  const subscriber = await setSubscriberPaused(ctx.from.id, true);
  if (!subscriber) {
    await ctx.reply('Non ti trovo tra gli iscritti. Usa /start per completare l iscrizione.');
    return;
  }

  await ctx.reply('Ricezione messaggi messa in pausa. Usa /resume per riattivarla.');
});

bot.command('resume', async (ctx) => {
  if (!ctx.from) {
    await ctx.reply('Impossibile aggiornare il profilo: utente Telegram non disponibile.');
    return;
  }

  const subscriber = await setSubscriberPaused(ctx.from.id, false);
  if (!subscriber) {
    await ctx.reply('Non ti trovo tra gli iscritti. Usa /start per completare l iscrizione.');
    return;
  }

  await ctx.reply('Ricezione messaggi riattivata.');
});

bot.command('last', async (ctx) => {
  const latestAudio = await getLatestAudio();
  if (!latestAudio) {
    await ctx.reply('Non ho ancora un audio recente da inviarti.');
    return;
  }

  try {
    await ctx.replyWithAudio(latestAudio.audioUrl, {
      caption: latestAudio.caption,
      title: latestAudio.title,
      performer: latestAudio.performer
    });
  } catch (error) {
    logger.error({ err: error, chatId: ctx.chat.id }, 'failed to send latest audio');
    await ctx.reply('Non riesco a inviarti l ultimo audio in questo momento.');
  }
});

export async function startTelegramBot(): Promise<void> {
  await bot.start();
  logger.info('telegram bot started');
}

export async function stopTelegramBot(): Promise<void> {
  await bot.stop();
  logger.info('telegram bot stopped');
}
