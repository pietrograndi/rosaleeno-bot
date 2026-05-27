import type { BroadcastAudioPayload, LatestAudioPayload } from './types';

type BroadcastResult = {
  ok: true;
  sent: number;
  failed: number;
  total: number;
};

export async function broadcastAudio(
  gatewayUrl: string,
  payload: BroadcastAudioPayload
): Promise<BroadcastResult> {
  const response = await fetch(new URL('/internal/broadcast-audio', gatewayUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Broadcast fallito: ${response.status} ${response.statusText} ${body}`);
  }

  const parsed = (await response.json()) as BroadcastResult;
  return parsed;
}

export async function setLatestAudio(gatewayUrl: string, payload: LatestAudioPayload): Promise<void> {
  const response = await fetch(new URL('/internal/latest-audio', gatewayUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Aggiornamento latest audio fallito: ${response.status} ${response.statusText} ${body}`);
  }
}
