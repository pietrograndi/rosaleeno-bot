import type { BroadcastAudioPayload } from './types';

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
