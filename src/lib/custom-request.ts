import type { BallparkMetalId } from './quote.config';

export type BallparkSnapshot = {
  low: number;
  high: number;
  metal: BallparkMetalId;
  configVersion: string;
};

export type CustomRequestPayload = {
  enabled: boolean;
  notes: string;
  referenceUrl: string;
  /** Optional TikTok handle or phone from quote request form. */
  contactHandle?: string;
  /** Ballpark shown to the customer when they saved (gold/platinum only). */
  ballpark?: BallparkSnapshot;
};

function parseBallpark(raw: unknown): BallparkSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const low = typeof o.low === 'number' ? o.low : null;
  const high = typeof o.high === 'number' ? o.high : null;
  const metal = o.metal;
  const configVersion = typeof o.configVersion === 'string' ? o.configVersion : '';
  if (
    low == null ||
    high == null ||
    !(metal === 'gold10k' || metal === 'gold14k' || metal === 'platinum') ||
    !configVersion
  ) {
    return undefined;
  }
  return { low, high, metal, configVersion };
}

export function parseCustomJson(raw: unknown): CustomRequestPayload | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed =
      typeof raw === 'string'
        ? (JSON.parse(raw) as Record<string, unknown>)
        : (raw as Record<string, unknown>);
    const enabled = Boolean(parsed.enabled);
    const notes = typeof parsed.notes === 'string' ? parsed.notes : '';
    const referenceUrl =
      typeof parsed.referenceUrl === 'string' ? parsed.referenceUrl : '';
    const contactHandle =
      typeof parsed.contactHandle === 'string' ? parsed.contactHandle.trim() : '';
    const ballpark = parseBallpark(parsed.ballpark);
    if (!enabled && !notes && !referenceUrl && !contactHandle && !ballpark) return null;
    return {
      enabled,
      notes,
      referenceUrl,
      ...(contactHandle ? { contactHandle } : {}),
      ...(ballpark ? { ballpark } : {}),
    };
  } catch {
    return null;
  }
}

export function serializeCustomJson(payload: CustomRequestPayload): string {
  const contactHandle = (payload.contactHandle ?? '').trim();
  return JSON.stringify({
    enabled: payload.enabled,
    notes: payload.notes.trim(),
    referenceUrl: payload.referenceUrl.trim(),
    ...(contactHandle ? { contactHandle } : {}),
    ...(payload.ballpark ? { ballpark: payload.ballpark } : {}),
  });
}

export function formatBallparkRange(low: number, high: number): string {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  return `${fmt(low)} to ${fmt(high)}`;
}
