export type CustomRequestPayload = {
  enabled: boolean;
  notes: string;
  referenceUrl: string;
  /** Optional TikTok handle or phone from quote request form. */
  contactHandle?: string;
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
    const contactHandle =
      typeof parsed.contactHandle === 'string' ? parsed.contactHandle.trim() : '';
    if (!enabled && !notes && !referenceUrl && !contactHandle) return null;
    return {
      enabled,
      notes,
      referenceUrl,
      ...(contactHandle ? { contactHandle } : {}),
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
  });
}
