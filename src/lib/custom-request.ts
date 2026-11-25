import type { BallparkMetalId, QuoteMetalId } from './quote.config';

export type BallparkSnapshot = {
  low: number;
  high: number;
  metal: BallparkMetalId;
  configVersion: string;
};

export type FinalQuoteInputs = {
  metal: QuoteMetalId;
  volumeCm3: number;
  teeth: number;
  spotPerTroyOz: number | null;
  targetMargin: number;
  foundryCastingUsd: number | null;
  formulaPrice: number;
  styleSummary: string;
};

export type FinalQuoteSnapshot = {
  priceUsd: number;
  notes: string;
  savedAt: string;
  inputs: FinalQuoteInputs;
};

export type CustomRequestPayload = {
  enabled: boolean;
  notes: string;
  referenceUrl: string;
  /** Optional TikTok handle or phone from quote request form. */
  contactHandle?: string;
  /** Ballpark shown to the customer when they saved (gold/platinum only). */
  ballpark?: BallparkSnapshot;
  /** Admin-saved final quote (price + inputs). */
  finalQuote?: FinalQuoteSnapshot;
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

function isQuoteMetalId(v: unknown): v is QuoteMetalId {
  return (
    v === 'silver' || v === 'gold10k' || v === 'gold14k' || v === 'platinum'
  );
}

function parseFinalQuote(raw: unknown): FinalQuoteSnapshot | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const priceUsd = typeof o.priceUsd === 'number' ? o.priceUsd : null;
  const notes = typeof o.notes === 'string' ? o.notes : '';
  const savedAt = typeof o.savedAt === 'string' ? o.savedAt : '';
  const inputsRaw = o.inputs;
  if (priceUsd == null || !savedAt || !inputsRaw || typeof inputsRaw !== 'object') {
    return undefined;
  }
  const i = inputsRaw as Record<string, unknown>;
  if (!isQuoteMetalId(i.metal)) return undefined;
  const volumeCm3 = typeof i.volumeCm3 === 'number' ? i.volumeCm3 : null;
  const teeth = typeof i.teeth === 'number' ? i.teeth : null;
  const targetMargin = typeof i.targetMargin === 'number' ? i.targetMargin : null;
  const formulaPrice = typeof i.formulaPrice === 'number' ? i.formulaPrice : null;
  const styleSummary = typeof i.styleSummary === 'string' ? i.styleSummary : '';
  if (volumeCm3 == null || teeth == null || targetMargin == null || formulaPrice == null) {
    return undefined;
  }
  return {
    priceUsd,
    notes,
    savedAt,
    inputs: {
      metal: i.metal,
      volumeCm3,
      teeth,
      spotPerTroyOz: typeof i.spotPerTroyOz === 'number' ? i.spotPerTroyOz : null,
      targetMargin,
      foundryCastingUsd:
        typeof i.foundryCastingUsd === 'number' ? i.foundryCastingUsd : null,
      formulaPrice,
      styleSummary,
    },
  };
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
    const finalQuote = parseFinalQuote(parsed.finalQuote);
    if (
      !enabled &&
      !notes &&
      !referenceUrl &&
      !contactHandle &&
      !ballpark &&
      !finalQuote
    ) {
      return null;
    }
    return {
      enabled,
      notes,
      referenceUrl,
      ...(contactHandle ? { contactHandle } : {}),
      ...(ballpark ? { ballpark } : {}),
      ...(finalQuote ? { finalQuote } : {}),
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
    ...(payload.finalQuote ? { finalQuote: payload.finalQuote } : {}),
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
