import { XMLParser } from 'fast-xml-parser';
import type { RssFeedItem } from './types';

type XmlNode = Record<string, unknown>;

type RawFeed = {
  rss?: {
    channel?: XmlNode & {
      title?: string;
      item?: unknown;
    };
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text'
});

function asText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const text = record['#text'] ?? record.text;
    if (typeof text === 'string') {
      return text.trim() || undefined;
    }
  }

  return undefined;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractAudioUrl(item: XmlNode): string | undefined {
  const enclosure = item.enclosure;
  const mediaContent = item['media:content'];
  const link = item.link;

  const enclosureCandidates = asArray(enclosure as XmlNode | XmlNode[] | undefined);
  for (const candidate of enclosureCandidates) {
    if (candidate && typeof candidate === 'object') {
      const url = (candidate as Record<string, unknown>).url;
      const href = (candidate as Record<string, unknown>).href;
      const candidateUrl = asText(url) ?? asText(href);
      if (candidateUrl) {
        return candidateUrl;
      }
    }
  }

  const mediaCandidates = asArray(mediaContent as XmlNode | XmlNode[] | undefined);
  for (const candidate of mediaCandidates) {
    if (candidate && typeof candidate === 'object') {
      const url = (candidate as Record<string, unknown>).url;
      const href = (candidate as Record<string, unknown>).href;
      const candidateUrl = asText(url) ?? asText(href);
      if (candidateUrl) {
        return candidateUrl;
      }
    }
  }

  return asText(link);
}

function extractItemId(item: XmlNode, audioUrl: string): string {
  return (
    asText(item.guid) ??
    asText(item.id) ??
    asText(item.link) ??
    [asText(item.title), asText(item.pubDate), audioUrl].filter(Boolean).join('|')
  );
}

export async function fetchFeedItems(feedUrl: string): Promise<{ feedTitle?: string; items: RssFeedItem[] }> {
  const response = await fetch(feedUrl);
  if (!response.ok) {
    throw new Error(`Impossibile scaricare il feed RSS: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as RawFeed;
  const channel = parsed.rss?.channel;
  const rawItems = asArray(channel?.item);

  const items = rawItems
    .filter((item): item is XmlNode => typeof item === 'object' && item !== null)
    .reduce<RssFeedItem[]>((acc, item) => {
      const audioUrl = extractAudioUrl(item);
      if (!audioUrl) {
        return acc;
      }

      const feedItem: RssFeedItem = {
        id: extractItemId(item, audioUrl),
        audioUrl
      };

      const title = asText(item.title);
      const link = asText(item.link);
      const pubDate = asText(item.pubDate);

      if (title) {
        feedItem.title = title;
      }
      if (link) {
        feedItem.link = link;
      }
      if (pubDate) {
        feedItem.pubDate = pubDate;
      }

      acc.push(feedItem);
      return acc;
    }, []);

  return {
    feedTitle: asText(channel?.title),
    items
  };
}
