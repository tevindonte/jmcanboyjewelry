'use client';

import { useMemo, useState } from 'react';
import { calculateQuote, isGoldSpotStale } from '@/lib/quote';
import {
  GOLD_SPOT_STALE_DAYS,
  quoteConfig,
  type QuoteMetalId,
} from '@/lib/quote.config';

const METALS: { id: QuoteMetalId; label: string }[] = [
  { id: 'silver', label: 'Silver' },
  { id: 'gold10k', label: 'Gold 10k' },
  { id: 'gold14k', label: 'Gold 14k' },
  { id: 'platinum', label: 'Platinum' },
];

function money(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function AdminQuoteCalculator() {
  const [metal, setMetal] = useState<QuoteMetalId>('silver');
  const [volume, setVolume] = useState('0.82');
  const [teeth, setTeeth] = useState('6');
  const [spot, setSpot] = useState(String(quoteConfig.goldSpot.usdPerTroyOz));
  const [margin, setMargin] = useState(String(quoteConfig.targetMarginDefault));
  const [includeKit, setIncludeKit] = useState(false);
  const [sellPrice, setSellPrice] = useState('300');
  const [competitor, setCompetitor] = useState('');

  const needsSpot = metal === 'gold10k' || metal === 'gold14k';
  const spotStale = isGoldSpotStale();

  const computed = useMemo(() => {
    try {
      const result = calculateQuote({
        metal,
        volumeCm3: Number(volume),
        teeth: Number(teeth),
        spotPerTroyOz: needsSpot ? Number(spot) : undefined,
        targetMargin: Number(margin),
        includeKit,
        competitorPriceUsd: competitor.trim() ? Number(competitor) : null,
      });
      return { result, error: null as string | null };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : 'Quote failed',
      };
    }
  }, [metal, volume, teeth, spot, margin, includeKit, competitor, needsSpot]);

  const { result, error } = computed;
  const sell = Number(sellPrice);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-silver-bright">Quote calculator</h1>
        <p className="mt-2 text-sm text-text-muted">
          Internal only. Not shown on the public site. Constants:{' '}
          <code className="text-xs text-steel">src/lib/quote.config.ts</code>
        </p>
        {spotStale && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            Gold spot in config is older than {GOLD_SPOT_STALE_DAYS} days (updated{' '}
            {quoteConfig.goldSpot.updatedAt}). Update{' '}
            <code className="text-xs">quoteConfig.goldSpot</code> before quoting customers.
          </p>
        )}
      </div>

      <form
        className="grid gap-3 rounded-lg border border-border bg-bg-elevated p-4 sm:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block text-sm text-text-muted">
          Metal
          <select
            value={metal}
            onChange={(e) => setMetal(e.target.value as QuoteMetalId)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          >
            {METALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-text-muted">
          Volume (cm³)
          <input
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted">
          Teeth count
          <input
            value={teeth}
            onChange={(e) => setTeeth(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted">
          Target margin (0–1)
          <input
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        {needsSpot && (
          <label className="block text-sm text-text-muted sm:col-span-2">
            Spot $/troy oz (manual — no live feed)
            <input
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            />
          </label>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={includeKit}
            onChange={(e) => setIncludeKit(e.target.checked)}
          />
          Include kit line (${quoteConfig.kit.price} price / ${quoteConfig.kit.cost} cost)
        </label>
        <label className="block text-sm text-text-muted">
          Competitor price (optional)
          <input
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted sm:col-span-2">
          Evaluate margin at sell price (grill only)
          <input
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
      </form>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {result && !error && (
        <div className="space-y-4">
          {result.unverifiedPreciousMetal && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              Gold/platinum rate unverified; confirm with foundry before quoting a customer.
            </p>
          )}
          {result.belowMinimum && (
            <p className="rounded-md border border-border px-3 py-2 text-sm text-steel">
              Formula price is below the ${quoteConfig.minimumOrderUsd} public minimum.
            </p>
          )}

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-text-muted">Formula price</dt>
              <dd className="font-display text-xl text-silver-bright">
                {money(result.formulaPrice)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Per tooth</dt>
              <dd>{result.pricePerTooth != null ? money(result.pricePerTooth) : '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Order cost</dt>
              <dd>{money(result.orderCost)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Hours</dt>
              <dd>{result.hours.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Margin at sell price</dt>
              <dd>{pct(result.marginAtPrice(sell))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Effective $/hr at sell</dt>
              <dd>{money(result.effectiveHourly(sell))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Cash after non-labor</dt>
              <dd>{money(result.cashAfterNonLabor(sell))}</dd>
            </div>
            {result.includeKit && (
              <div>
                <dt className="text-text-muted">With kit (customer)</dt>
                <dd>{money(result.totalWithKit)}</dd>
              </div>
            )}
            {result.competitorPriceUsd != null && (
              <div className="col-span-2">
                <dt className="text-text-muted">Vs competitor</dt>
                <dd>
                  {money(result.competitorPriceUsd)} —{' '}
                  {result.formulaPrice <= result.competitorPriceUsd
                    ? `${money(result.competitorPriceUsd - result.formulaPrice)} under`
                    : `${money(result.formulaPrice - result.competitorPriceUsd)} over`}
                </dd>
              </div>
            )}
          </dl>

          <div>
            <h2 className="font-display text-lg text-silver-bright">Breakdown</h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {result.lineItems.map((row) => (
                <li key={row.label} className="flex justify-between py-2">
                  <span className="text-text-muted">{row.label}</span>
                  <span>{money(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
