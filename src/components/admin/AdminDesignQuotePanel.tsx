'use client';

import { useMemo, useState } from 'react';
import {
  buildQuoteEmailText,
  calculateQuote,
  isGoldSpotStale,
  quoteMetalLabel,
  resolveBallparkMetal,
  summarizeTeethStyles,
  volumeCm3ForTeeth,
} from '@/lib/quote';
import {
  GOLD_SPOT_STALE_DAYS,
  quoteConfig,
  type QuoteMetalId,
} from '@/lib/quote.config';
import {
  formatBallparkRange,
  type BallparkSnapshot,
  type FinalQuoteSnapshot,
} from '@/lib/custom-request';

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

export type DesignQuotePrefill = {
  designId: string;
  email: string;
  arch: string;
  metalPublic: string;
  teeth: Record<string, string>;
  ballpark?: BallparkSnapshot | null;
  finalQuote?: FinalQuoteSnapshot | null;
  customNotes?: string;
  contactHandle?: string;
};

function initialMetal(prefill: DesignQuotePrefill): QuoteMetalId {
  if (prefill.ballpark?.metal) return prefill.ballpark.metal;
  if (prefill.finalQuote?.inputs.metal) return prefill.finalQuote.inputs.metal;
  const resolved = resolveBallparkMetal(prefill.metalPublic, 10);
  if (resolved) return resolved;
  return 'silver';
}

function initialVolume(metal: QuoteMetalId, teeth: Record<string, string>): string {
  if (metal === 'silver') {
    let v = 0;
    let n = 0;
    for (const style of Object.values(teeth)) {
      if (style === 'plain' || style === 'window' || style === 'deepcut') {
        v += quoteConfig.volumes[style];
        n += 1;
      }
    }
    return n ? String(Number(v.toFixed(4))) : '0.82';
  }
  const { volumeCm3, toothCount } = volumeCm3ForTeeth(teeth, metal);
  return toothCount ? String(Number(volumeCm3.toFixed(4))) : '0.82';
}

function initialTeethCount(teeth: Record<string, string>): string {
  const n = Object.values(teeth).filter(
    (s) => s === 'plain' || s === 'window' || s === 'deepcut',
  ).length;
  return String(n || 1);
}

export function AdminDesignQuotePanel({ prefill }: { prefill: DesignQuotePrefill }) {
  const styleSummary = summarizeTeethStyles(prefill.teeth);
  const startMetal = initialMetal(prefill);
  const [metal, setMetal] = useState<QuoteMetalId>(startMetal);
  const [volume, setVolume] = useState(() => initialVolume(startMetal, prefill.teeth));
  const [teeth, setTeeth] = useState(() => initialTeethCount(prefill.teeth));
  const [spot, setSpot] = useState(String(quoteConfig.goldSpot.usdPerTroyOz));
  const [margin, setMargin] = useState(String(quoteConfig.targetMarginDefault));
  const [foundryCasting, setFoundryCasting] = useState(
    prefill.finalQuote?.inputs.foundryCastingUsd != null
      ? String(prefill.finalQuote.inputs.foundryCastingUsd)
      : '',
  );
  const [sellPrice, setSellPrice] = useState(
    prefill.finalQuote ? String(prefill.finalQuote.priceUsd) : '',
  );
  const [quoteNotes, setQuoteNotes] = useState(prefill.finalQuote?.notes ?? '');
  const [savedFinal, setSavedFinal] = useState(prefill.finalQuote ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needsSpot = metal === 'gold10k' || metal === 'gold14k';
  const spotStale = isGoldSpotStale();

  const computed = useMemo(() => {
    try {
      const foundry = foundryCasting.trim() ? Number(foundryCasting) : null;
      const result = calculateQuote({
        metal,
        volumeCm3: Number(volume),
        teeth: Number(teeth),
        spotPerTroyOz: needsSpot ? Number(spot) : undefined,
        targetMargin: Number(margin),
        castingCostOverrideUsd:
          foundry != null && Number.isFinite(foundry) ? foundry : null,
      });
      return { result, error: null as string | null };
    } catch (e) {
      return {
        result: null,
        error: e instanceof Error ? e.message : 'Quote failed',
      };
    }
  }, [metal, volume, teeth, spot, margin, foundryCasting, needsSpot]);

  const { result, error } = computed;
  const effectiveSell =
    sellPrice.trim() && Number.isFinite(Number(sellPrice))
      ? Number(sellPrice)
      : result?.formulaPrice ?? 0;

  const ballpark = prefill.ballpark ?? null;

  async function saveFinalQuote() {
    if (!result) return;
    setBusy(true);
    setMsg(null);
    try {
      const priceUsd =
        sellPrice.trim() && Number.isFinite(Number(sellPrice))
          ? Number(sellPrice)
          : result.formulaPrice;
      const res = await fetch(`/api/admin/designs/${prefill.designId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalQuote: {
            priceUsd,
            notes: quoteNotes,
            inputs: {
              metal,
              volumeCm3: Number(volume),
              teeth: Number(teeth),
              spotPerTroyOz: needsSpot ? Number(spot) : null,
              targetMargin: Number(margin),
              foundryCastingUsd: foundryCasting.trim()
                ? Number(foundryCasting)
                : null,
              formulaPrice: result.formulaPrice,
              styleSummary,
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setSavedFinal(data.custom?.finalQuote ?? null);
      setSellPrice(String(priceUsd));
      setMsg('Final quote saved on design');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyEmailText() {
    if (!result) return;
    const priceUsd =
      sellPrice.trim() && Number.isFinite(Number(sellPrice))
        ? Number(sellPrice)
        : result.formulaPrice;
    const text = buildQuoteEmailText({
      priceUsd,
      metal,
      teethSummary: styleSummary,
    });
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Quote email text copied');
    } catch {
      setMsg('Could not copy — select and copy manually below');
      window.prompt('Copy quote email text:', text);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-bg-elevated p-4">
      <div>
        <h2 className="font-display text-lg text-silver-bright">Quote calculator</h2>
        <p className="mt-1 text-xs text-steel">
          Prefill from design · {prefill.email} · arch {prefill.arch} · {styleSummary}
        </p>
        {spotStale && (
          <p
            role="alert"
            className="mt-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            Gold spot in config is older than {GOLD_SPOT_STALE_DAYS} days (updated{' '}
            {quoteConfig.goldSpot.updatedAt}).
          </p>
        )}
      </div>

      {ballpark && (
        <div className="rounded-md border border-border/80 bg-bg px-3 py-2 text-sm">
          <p className="text-xs tracking-wide text-steel uppercase">
            Customer ballpark (saved)
          </p>
          <p className="mt-1 text-silver-bright">
            {formatBallparkRange(ballpark.low, ballpark.high)}
          </p>
          <p className="mt-0.5 text-xs text-steel">
            {ballpark.metal} · config {ballpark.configVersion}
          </p>
        </div>
      )}

      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block text-sm text-text-muted">
          Metal / karat
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
          Style mix (from design)
          <input
            readOnly
            value={styleSummary}
            className="mt-1 w-full rounded-md border border-border bg-bg/60 px-3 py-2 text-text"
          />
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
        {needsSpot && (
          <label className="block text-sm text-text-muted sm:col-span-2">
            Spot $/troy oz (from config — editable)
            <input
              value={spot}
              onChange={(e) => setSpot(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            />
          </label>
        )}
        <label className="block text-sm text-text-muted">
          Target margin (0–1)
          <input
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted">
          Foundry&apos;s actual casting quote ($)
          <input
            value={foundryCasting}
            onChange={(e) => setFoundryCasting(e.target.value)}
            placeholder="Optional — replaces formula casting"
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted sm:col-span-2">
          Quote / sell price ($)
          <input
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder={result ? String(result.formulaPrice) : ''}
            className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
          />
        </label>
        <label className="block text-sm text-text-muted sm:col-span-2">
          Quote notes (saved with final quote)
          <textarea
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={3}
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
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-text-muted">Formula price</dt>
              <dd className="font-display text-xl text-silver-bright">
                {money(result.formulaPrice)}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Per tooth</dt>
              <dd>
                {result.pricePerTooth != null ? money(result.pricePerTooth) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Margin at sell price</dt>
              <dd>{pct(result.marginAtPrice(effectiveSell))}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Effective $/hr</dt>
              <dd>{money(result.effectiveHourly(effectiveSell))}</dd>
            </div>
          </dl>

          {ballpark && (
            <div className="rounded-md border border-border px-3 py-2 text-sm">
              <p className="text-xs tracking-wide text-steel uppercase">
                vs customer ballpark
              </p>
              <p className="mt-1 text-text-muted">
                Customer saw {formatBallparkRange(ballpark.low, ballpark.high)}. New
                formula {money(result.formulaPrice)}
                {result.formulaPrice < ballpark.low
                  ? ` (${money(ballpark.low - result.formulaPrice)} under low)`
                  : result.formulaPrice > ballpark.high
                    ? ` (${money(result.formulaPrice - ballpark.high)} over high)`
                    : ' (inside band)'}
                .
              </p>
              {sellPrice.trim() && Number.isFinite(Number(sellPrice)) && (
                <p className="mt-1 text-text-muted">
                  Quote price {money(Number(sellPrice))} vs mid of band{' '}
                  {money((ballpark.low + ballpark.high) / 2)} →{' '}
                  {Number(sellPrice) - (ballpark.low + ballpark.high) / 2 >= 0
                    ? `+${money(Number(sellPrice) - (ballpark.low + ballpark.high) / 2)}`
                    : money(Number(sellPrice) - (ballpark.low + ballpark.high) / 2)}{' '}
                  vs mid.
                </p>
              )}
            </div>
          )}

          <div>
            <h3 className="font-display text-base text-silver-bright">Breakdown</h3>
            <ul className="mt-2 divide-y divide-border text-sm">
              {result.lineItems.map((row) => (
                <li key={row.label} className="flex justify-between py-2">
                  <span className="text-text-muted">{row.label}</span>
                  <span>{money(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveFinalQuote()}
              className="min-h-11 rounded-md bg-silver-bright px-4 py-2 text-sm font-semibold text-bg hover:bg-silver disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save final quote'}
            </button>
            <button
              type="button"
              onClick={() => void copyEmailText()}
              className="min-h-11 rounded-md border border-border px-4 py-2 text-sm text-silver hover:border-silver"
            >
              Copy quote email text
            </button>
          </div>

          {savedFinal && (
            <p className="text-xs text-steel">
              Last saved: {money(savedFinal.priceUsd)} on{' '}
              {new Date(savedFinal.savedAt).toLocaleString()} ·{' '}
              {quoteMetalLabel(savedFinal.inputs.metal)}
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-ok">{msg}</p>}
    </section>
  );
}
