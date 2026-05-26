import pino from 'pino';
import { env } from './config';
import { broadcastAudio } from './broadcaster';
import { fetchFeedItems } from './rss-client';
import { loadState, saveState } from './state-repo';

const logger = pino({ name: env.WATCHER_NAME });

let isPolling = false;

function normalizeSeenIds(seenItemIds: string[], maxItems = 500): string[] {
  return seenItemIds.slice(Math.max(0, seenItemIds.length - maxItems));
}

function formatDisplayDate(itemPubDate?: string, itemId?: string): string | undefined {
  if (itemPubDate) {
    const date = new Date(itemPubDate);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('it-IT').format(date);
    }
  }

  if (itemId) {
    const match = itemId.match(/\/(\d{4})\/(\d{2})\/(\d{2})\.html$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
  }

  return undefined;
}

function buildAudioTitle(itemTitle: string | undefined, itemPubDate: string | undefined, itemId: string): string {
  const displayDate = formatDisplayDate(itemPubDate, itemId);
  if (displayDate) {
    return `Parola del ${displayDate}`;
  }

  return itemTitle ?? 'Parola del giorno';
}

async function runOnce(): Promise<void> {
  if (isPolling) {
    logger.warn('poll skipped because a previous cycle is still running');
    return;
  }

  isPolling = true;

  try {
    const state = await loadState(env.STATE_FILE_PATH);
    const feed = await fetchFeedItems(env.RSS_FEED_URL);
    const seen = new Set(state.seenItemIds);
    const unseenItems = feed.items.filter((item) => !seen.has(item.id));
    logger.info(
      {
        stateFilePath: env.STATE_FILE_PATH,
        seenCount: state.seenItemIds.length,
        feedItemsCount: feed.items.length,
        unseenItemsCount: unseenItems.length,
        firstUnseenItemId: unseenItems[0]?.id
      },
      'rss poll snapshot'
    );

    if (feed.items[0]) {
      logger.info(
        {
          firstItem: {
            id: feed.items[0].id,
            title: feed.items[0].title,
            audioUrl: feed.items[0].audioUrl
          }
        },
        'rss first item debug'
      );
    }

    if (state.seenItemIds.length === 0) {
      logger.info(
        { feedTitle: feed.feedTitle, count: feed.items.length },
        'state seeded with current feed items'
      );
      await saveState(env.STATE_FILE_PATH, {
        seenItemIds: normalizeSeenIds(feed.items.map((item) => item.id)),
        lastRunAt: new Date().toISOString()
      });
      logger.info({ stateFilePath: env.STATE_FILE_PATH }, 'rss state saved after initial seed');
      return;
    }

    if (unseenItems.length === 0) {
      logger.info({ feedTitle: feed.feedTitle }, 'no new rss items found');
      await saveState(env.STATE_FILE_PATH, {
        seenItemIds: normalizeSeenIds(state.seenItemIds),
        lastRunAt: new Date().toISOString()
      });
      logger.info({ stateFilePath: env.STATE_FILE_PATH }, 'rss state saved with no new items');
      return;
    }

    const orderedItems = [...unseenItems].reverse();
    let processed = 0;

    for (const item of orderedItems) {
      try {
        const audioTitle = buildAudioTitle(item.title, item.pubDate, item.id);
        const result = await broadcastAudio(env.GATEWAY_URL, {
          audioUrl: item.audioUrl,
          caption: item.title,
          title: audioTitle,
          performer: feed.feedTitle
        });

        seen.add(item.id);
        processed += 1;
        logger.info(
          {
            audioUrl: item.audioUrl,
            itemId: item.id,
            sent: result.sent,
            failed: result.failed,
            total: result.total
          },
          'rss item broadcasted'
        );
      } catch (error) {
        logger.error({ err: error, itemId: item.id, audioUrl: item.audioUrl }, 'broadcast failed');
        break;
      }
    }

    await saveState(env.STATE_FILE_PATH, {
      seenItemIds: normalizeSeenIds(Array.from(seen)),
      lastRunAt: new Date().toISOString()
    });
    logger.info({ stateFilePath: env.STATE_FILE_PATH, seenCount: seen.size }, 'rss state saved');

    logger.info(
      { processed, totalNewItems: unseenItems.length, feedTitle: feed.feedTitle },
      'rss poll completed'
    );
  } finally {
    isPolling = false;
  }
}

async function main(): Promise<void> {
  logger.info(
    {
      feedUrl: env.RSS_FEED_URL,
      gatewayUrl: env.GATEWAY_URL,
      pollIntervalMs: env.POLL_INTERVAL_MS
    },
    'rss watcher starting'
  );

  await runOnce();
  setInterval(() => {
    void runOnce();
  }, env.POLL_INTERVAL_MS);
}

main().catch((error) => {
  logger.error({ err: error }, 'rss watcher startup failed');
  process.exit(1);
});
