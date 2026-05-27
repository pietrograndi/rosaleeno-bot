export type Subscriber = {
  telegramUserId: number;
  chatId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  joinedAt: string;
  paused: boolean;
};

export type NotifyTextPayload = {
  chatId: number;
  text: string;
};

export type NotifyAudioPayload = {
  chatId: number;
  audioUrl: string;
  caption?: string;
  title?: string;
  performer?: string;
};

export type LatestAudio = {
  audioUrl: string;
  caption?: string;
  title?: string;
  performer?: string;
  sourceItemId?: string;
  updatedAt: string;
};
