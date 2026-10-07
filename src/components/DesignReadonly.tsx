'use client';

import type { ArchChoice, ToothStyle } from '@/lib/pricing.config';
import type { TeethMap, ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';

const STYLE_LABEL: Record<ToothStyle, string> = {
  none: 'Off',
  plain: 'Plain',
  window: 'Window',
  deepcut: 'Deep cut',
};

function ToothCell({ id, style }: { id: ToothId; style: ToothStyle }) {
  return (
    <div
      className={[
        'flex h-12 w-9 flex-col items-center justify-center rounded-sm border text-[10px]',
        style === 'none'
          ? 'border-border bg-bg-soft/40 text-steel-dim'
          : 'border-silver/40 bg-gradient-to-b from-silver-bright/30 to-steel/20 text-silver-bright',
      ].join(' ')}
      aria-label={`Tooth ${id}, ${STYLE_LABEL[style]}`}
    >
      <span className="font-medium">{id}</span>
      <span className="text-[8px] text-text-muted">{STYLE_LABEL[style]}</span>
    </div>
  );
}

export function DesignReadonly({ arch, teeth }: { arch: ArchChoice; teeth: TeethMap }) {
  const top = arch !== 'bottom' ? toothIdsForArch('top') : [];
  const bottom = arch !== 'top' ? toothIdsForArch('bottom') : [];

  return (
    <div className="mt-8 rounded-lg border border-border bg-bg-elevated p-4" role="img" aria-label="Saved tooth design">
      {top.length > 0 && (
        <div>
          <p className="mb-2 text-center text-xs text-text-muted">Top</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {top.map((id) => (
              <ToothCell key={id} id={id} style={(teeth[id] ?? 'none') as ToothStyle} />
            ))}
          </div>
        </div>
      )}
      {bottom.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-center text-xs text-text-muted">Bottom</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {bottom.map((id) => (
              <ToothCell key={id} id={id} style={(teeth[id] ?? 'none') as ToothStyle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
