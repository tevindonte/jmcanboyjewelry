export type CustomRequestPayload = {
  enabled: boolean;
  notes: string;
  referenceUrl: string;
};

export function parseCustomJson(raw: unknown): CustomRequestPayload | null {
  if (raw == null || raw === '') return null;
  try {
    const parsed =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>);
    const enabled = Boolean(parsed.enabled);
    const notes = typeof parsed.notes === 'string' ? parsed.notes : '';
    const referenceUrl =
      typeof parsed.referenceUrl === 'string' ? parsed.referenceUrl : '';
    if (!enabled && !notes && !referenceUrl) return null;
    return { enabled, notes, referenceUrl };
  } catch {
    return null;
  }
}

export function serializeCustomJson(payload: CustomRequestPayload): string {
  return JSON.stringify({
    enabled: payload.enabled,
    notes: payload.notes.trim(),
    referenceUrl: payload.referenceUrl.trim(),
  });
}
