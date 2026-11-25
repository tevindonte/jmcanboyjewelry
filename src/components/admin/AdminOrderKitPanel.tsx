'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  kitBuyLabelForTray,
  kitBuyUrlForTray,
  type KitSource,
  type TraySize,
} from '@/lib/kit-sources.config';
import { traySizeLabel } from '@/lib/admin-notify';

export function AdminOrderKitPanel({
  traySize,
}: {
  traySize: TraySize | undefined;
}) {
  const [sources, setSources] = useState<KitSource[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/admin/kit-sources');
      const data = await res.json();
      if (res.ok) setSources(data.sources ?? []);
    })();
  }, []);

  const buyUrl = kitBuyUrlForTray(traySize, sources);
  const match = sources.find(
    (s) => s.traySize === (traySize === 'medium' ? 'medium' : 'large'),
  );

  return (
    <div className="mt-4 rounded-md border border-border bg-bg-elevated p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs tracking-wide text-steel uppercase">Kit sources</p>
        <Link href="/admin/kit-sources" className="text-xs text-silver underline">
          Edit sources
        </Link>
      </div>
      <p className="mt-2 text-text-muted">
        Tray: {traySizeLabel(traySize)}
        {match?.seenPriceUsd != null ? ` · seen ~$${match.seenPriceUsd}` : ''}
      </p>
      {buyUrl ? (
        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-silver-bright px-4 py-2 text-sm font-semibold text-bg hover:bg-silver"
        >
          {kitBuyLabelForTray(traySize)}
        </a>
      ) : (
        <p className="mt-2 text-steel">No buy URL configured for this tray size.</p>
      )}
      {match?.notes && (
        <p className="mt-3 whitespace-pre-wrap text-xs text-steel">{match.notes}</p>
      )}
    </div>
  );
}
