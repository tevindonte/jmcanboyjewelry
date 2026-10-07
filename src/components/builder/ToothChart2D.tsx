'use client';

import { useBuilderStore } from '@/store/builder-store';
import type { ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';
import type { ToothStyle } from '@/lib/pricing.config';

const STYLE_LABEL: Record<ToothStyle, string> = {
  none: 'Off',
  plain: 'Plain',
  window: 'Window',
  deepcut: 'Deep cut',
};

function ToothButton({ id }: { id: ToothId }) {
  const style = useBuilderStore((s) => s.teeth[id] ?? 'none');
  const selected = useBuilderStore((s) => s.selected.includes(id));
  const cycleTooth = useBuilderStore((s) => s.cycleTooth);

  return (
    <button
      type="button"
      onClick={() => cycleTooth(id)}
      aria-label={`Tooth ${id}, style ${STYLE_LABEL[style]}. Activate to cycle style.`}
      aria-pressed={selected}
      className={[
        'flex h-12 w-9 flex-col items-center justify-center rounded-sm border text-[10px] transition-colors',
        style === 'none'
          ? 'border-border bg-bg-soft/40 text-steel-dim'
          : 'border-silver/40 bg-gradient-to-b from-silver-bright/30 to-steel/20 text-silver-bright',
        selected ? 'ring-2 ring-silver-bright ring-offset-1 ring-offset-bg' : '',
        style === 'window' ? 'outline outline-1 outline-offset-[-6px] outline-bg' : '',
        style === 'deepcut' ? 'shadow-[inset_0_-6px_0_rgba(0,0,0,0.35)]' : '',
      ].join(' ')}
    >
      <span className="font-medium">{id}</span>
      <span className="text-[8px] text-text-muted">{STYLE_LABEL[style]}</span>
    </button>
  );
}

export function ToothChart2D() {
  const arch = useBuilderStore((s) => s.arch);
  const top = toothIdsForArch('top').filter((id) =>
    arch === 'bottom' ? false : true,
  );
  const bottom = toothIdsForArch('bottom').filter((id) =>
    arch === 'top' ? false : true,
  );

  return (
    <div className="flex flex-col items-center gap-3 py-4" role="group" aria-label="Tooth style chart">
      {(arch === 'top' || arch === 'both') && (
        <div>
          <p className="mb-2 text-center text-xs text-text-muted">Top</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {top.map((id) => (
              <ToothButton key={id} id={id} />
            ))}
          </div>
        </div>
      )}
      {(arch === 'bottom' || arch === 'both') && (
        <div>
          <p className="mb-2 text-center text-xs text-text-muted">Bottom</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {bottom.map((id) => (
              <ToothButton key={id} id={id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
