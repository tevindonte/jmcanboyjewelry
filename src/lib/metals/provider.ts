/**
 * Swappable silver spot provider.
 * Primary path on free Render: admin manual entry (weekly is fine).
 * Optional HTTP provider via METALS_API_* env when you pick one later.
 *
 * Candidates (owner-verified options):
 * - Commodity Price API (free trial)
 * - UniRate Pro ($9/mo for silver)
 * - GoldAPI.io (check free tier yourself)
 */

export type SpotQuote = {
  usdPerOz: number;
  source: string;
  fetchedAt: string;
};

export type MetalsProvider = {
  id: string;
  fetchSpot(): Promise<SpotQuote | null>;
};

/** Generic JSON provider — maps common response shapes. */
export function createHttpMetalsProvider(): MetalsProvider | null {
  const apiUrl = process.env.METALS_API_URL;
  if (!apiUrl) return null;

  return {
    id: process.env.METALS_API_SOURCE ?? 'http',
    async fetchSpot() {
      const apiKey = process.env.METALS_API_KEY;
      const res = await fetch(apiUrl, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      const raw =
        data.price ??
        data.silver ??
        data.usd_per_oz ??
        (data.rates as Record<string, number> | undefined)?.XAG;
      const usdPerOz = typeof raw === 'number' ? raw : Number(raw);
      if (!usdPerOz || Number.isNaN(usdPerOz) || usdPerOz <= 0) return null;
      return {
        usdPerOz,
        source: process.env.METALS_API_SOURCE ?? 'http',
        fetchedAt: new Date().toISOString(),
      };
    },
  };
}

export function getMetalsProvider(): MetalsProvider | null {
  return createHttpMetalsProvider();
}
