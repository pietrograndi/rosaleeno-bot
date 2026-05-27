export type RssFeedItem = {
  id: string;
  title?: string;
  audioUrl: string;
  link?: string;
  pubDate?: string;
};

export type RssState = {
  seenItemIds: string[];
  lastRunAt?: string;
};

export type BroadcastAudioPayload = {
  audioUrl: string;
  caption?: string;
  title?: string;
  performer?: string;
};

export type LatestAudioPayload = BroadcastAudioPayload & {
  sourceItemId?: string;
};
