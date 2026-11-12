'use client';

import { useId, useState } from 'react';

export type FaqItem = { q: string; a: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const baseId = useId();
  const [open, setOpen] = useState<Record<number, boolean>>({});

  return (
    <div className="mt-8 divide-y divide-border">
      {items.map((item, i) => {
        const expanded = Boolean(open[i]);
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div key={item.q} className="py-2">
            <h3 className="font-medium text-silver-bright">
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span>{item.q}</span>
                <span className="shrink-0 text-steel" aria-hidden>
                  {expanded ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!expanded}
              className="pb-4 text-sm leading-relaxed text-text-muted"
            >
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
