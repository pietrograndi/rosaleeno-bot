import Fastify from 'fastify';
import { z } from 'zod';
import pino from 'pino';
import { bot } from './bot';
import { env } from './config';
import { listSubscribers, setLatestAudio } from './storage';

const logger = pino({ name: `${env.BOT_NAME}:api` });

const notifyPayloadSchema = z.object({
  chatId: z.number().int(),
  text: z.string().min(1)
});

const notifyAudioPayloadSchema = z.object({
  chatId: z.number().int(),
  audioUrl: z.string().url(),
  caption: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  performer: z.string().min(1).optional()
});

const broadcastTextPayloadSchema = z.object({
  text: z.string().min(1)
});

const broadcastAudioPayloadSchema = z.object({
  audioUrl: z.string().url(),
  caption: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  performer: z.string().min(1).optional()
});

const latestAudioPayloadSchema = z.object({
  audioUrl: z.string().url(),
  caption: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  performer: z.string().min(1).optional(),
  sourceItemId: z.string().min(1).optional()
});

export function buildServer() {
  const app = Fastify({ logger: false });

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/internal/notify-text', async (request, reply) => {
    const parsed = notifyPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    const payload = parsed.data;

    try {
      await bot.api.sendMessage(payload.chatId, payload.text);
      logger.info({ chatId: payload.chatId }, 'text notification sent');
      return { ok: true };
    } catch (error) {
      logger.error({ err: error, chatId: payload.chatId }, 'failed to send text notification');
      return reply.code(500).send({ ok: false });
    }
  });

  app.post('/internal/notify-audio', async (request, reply) => {
    const parsed = notifyAudioPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    const payload = parsed.data;

    try {
      await bot.api.sendAudio(payload.chatId, payload.audioUrl, {
        caption: payload.caption,
        title: payload.title,
        performer: payload.performer
      });
      logger.info({ chatId: payload.chatId, audioUrl: payload.audioUrl }, 'audio notification sent');
      return { ok: true };
    } catch (error) {
      logger.error(
        { err: error, chatId: payload.chatId, audioUrl: payload.audioUrl },
        'failed to send audio notification'
      );
      return reply.code(500).send({ ok: false });
    }
  });

  app.post('/internal/broadcast-text', async (request, reply) => {
    const parsed = broadcastTextPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    const subscribers = (await listSubscribers()).filter((subscriber) => !subscriber.paused);
    const results = await Promise.allSettled(
      subscribers.map((subscriber) => bot.api.sendMessage(subscriber.chatId, parsed.data.text))
    );

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - sent;

    logger.info({ sent, failed }, 'broadcast text finished');
    return { ok: true, sent, failed, total: results.length };
  });

  app.post('/internal/broadcast-audio', async (request, reply) => {
    const parsed = broadcastAudioPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    const subscribers = (await listSubscribers()).filter((subscriber) => !subscriber.paused);
    const results = await Promise.allSettled(
      subscribers.map((subscriber) =>
        bot.api.sendAudio(subscriber.chatId, parsed.data.audioUrl, {
          caption: parsed.data.caption,
          title: parsed.data.title,
          performer: parsed.data.performer
        })
      )
    );

    const sent = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - sent;

    logger.info({ sent, failed, audioUrl: parsed.data.audioUrl }, 'broadcast audio finished');
    return { ok: true, sent, failed, total: results.length };
  });

  app.post('/internal/latest-audio', async (request, reply) => {
    const parsed = latestAudioPayloadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_payload',
        details: parsed.error.flatten()
      });
    }

    await setLatestAudio({
      ...parsed.data,
      updatedAt: new Date().toISOString()
    });
    logger.info({ audioUrl: parsed.data.audioUrl }, 'latest audio updated');
    return { ok: true };
  });

  return app;
}
