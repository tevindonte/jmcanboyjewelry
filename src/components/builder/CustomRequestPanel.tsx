'use client';

import { useBuilderStore } from '@/store/builder-store';

export function CustomRequestPanel() {
  const customRequest = useBuilderStore((s) => s.customRequest);
  const customNotes = useBuilderStore((s) => s.customNotes);
  const customReferenceUrl = useBuilderStore((s) => s.customReferenceUrl);
  const setCustomRequest = useBuilderStore((s) => s.setCustomRequest);
  const setCustomNotes = useBuilderStore((s) => s.setCustomNotes);
  const setCustomReferenceUrl = useBuilderStore((s) => s.setCustomReferenceUrl);

  return (
    <section className="rounded-md border border-border bg-bg-elevated/50 p-3">
      <label className="flex min-h-11 items-start gap-2 text-sm text-silver-bright">
        <input
          type="checkbox"
          checked={customRequest}
          onChange={(e) => setCustomRequest(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Something else / custom request</span>
          <span className="mt-0.5 block text-xs font-normal text-steel">
            Don&apos;t see your style? Permanent-cut look, mixed metals, stones later,
            or anything not listed — describe it and we&apos;ll quote.
          </span>
        </span>
      </label>

      {customRequest && (
        <div className="mt-3 space-y-3">
          <label className="block text-sm text-text-muted">
            Describe what you want
            <textarea
              required
              rows={4}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Example: permanent-cut look on top 6, open face, gold with small stones later…"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-silver"
            />
          </label>
          <label className="block text-sm text-text-muted">
            Reference link <span className="text-steel-dim">(optional)</span>
            <input
              type="url"
              inputMode="url"
              value={customReferenceUrl}
              onChange={(e) => setCustomReferenceUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-silver"
            />
          </label>
          <p className="text-xs text-steel">
            Removable jewelry only. Custom requests are quote-only — no online deposit until
            we confirm price.
          </p>
        </div>
      )}
    </section>
  );
}
