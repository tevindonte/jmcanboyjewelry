import { getSetting, setSetting } from '@/lib/db';
import {
  defaultKitSources,
  mergeKitSources,
  type KitSource,
  type KitSourceId,
} from '@/lib/kit-sources.config';

const SETTING_KEY = 'kit_sources';

export async function getKitSources(): Promise<KitSource[]> {
  try {
    const raw = await getSetting(SETTING_KEY);
    if (Array.isArray(raw)) {
      return mergeKitSources(raw as Partial<KitSource>[]);
    }
  } catch {
    /* use defaults */
  }
  return mergeKitSources(null);
}

export async function saveKitSources(
  entries: Array<{
    id: KitSourceId;
    url?: string;
    seenPriceUsd?: number | null;
    deliveryNote?: string;
    sellerNote?: string;
    notes?: string;
    label?: string;
  }>,
): Promise<KitSource[]> {
  const current = await getKitSources();
  const next = current.map((row) => {
    const patch = entries.find((e) => e.id === row.id);
    if (!patch) return row;
    return {
      ...row,
      url: patch.url != null ? String(patch.url) : row.url,
      seenPriceUsd:
        patch.seenPriceUsd !== undefined ? patch.seenPriceUsd : row.seenPriceUsd,
      deliveryNote:
        patch.deliveryNote != null ? String(patch.deliveryNote) : row.deliveryNote,
      sellerNote: patch.sellerNote != null ? String(patch.sellerNote) : row.sellerNote,
      notes: patch.notes != null ? String(patch.notes) : row.notes,
      label: patch.label != null && patch.label.trim() ? patch.label : row.label,
    };
  });
  await setSetting(SETTING_KEY, next);
  return next;
}

export { defaultKitSources };
