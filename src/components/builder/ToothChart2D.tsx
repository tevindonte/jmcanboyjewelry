'use client';

import { useBuilderStore } from '@/store/builder-store';
import type { ToothId } from '@/lib/pricing';
import { toothIdsForArch } from '@/lib/pricing';
import type { ToothStyle } from '@/lib/pricing.config';

const STYLE_SHORT: Record<Exclude<ToothStyle, 'none'>, string> = {
  plain: 'Plain',
  window: 'Win',
  deepcut: 'Deep',
};

/** Vertical offset along a shallow arch (px). */
function curveOffset(index: number, count: number, flipY: boolean, amp: number) {
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const bump = 4 * t * (1 - t);
  return (flipY ? 1 : -1) * bump * amp;
}

function MiniStyleMark({ style }: { style: Exclude<ToothStyle, 'none'> }) {
  if (style === 'plain') {
    return (
      <svg viewBox="0 0 16 18" className="h-3.5 w-3 shrink-0 sm:h-4 sm:w-3.5" aria-hidden>
        <path d="M3 15 Q2 9 3 5 Q8 2 13 5 Q14 9 13 15 Z" fill="currentColor" />
      </svg>
    );
  }
  if (style === 'window') {
    return (
      <svg viewBox="0 0 16 18" className="h-3.5 w-3 shrink-0 sm:h-4 sm:w-3.5" aria-hidden>
        <path d="M3 15 Q2 9 3 5 Q8 2 13 5 Q14 9 13 15 Z" fill="currentColor" />
        <ellipse cx="8" cy="8" rx="2.4" ry="3" className="fill-bg" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 18" className="h-3.5 w-3 shrink-0 sm:h-4 sm:w-3.5" aria-hidden>
      <path d="M3 15 Q2 9 3 5 Q8 2 13 5 Q14 9 13 12 L12 15 Z" fill="currentColor" />
    </svg>
  );
}

function ToothMark({ id }: { id: ToothId }) {
  const style = useBuilderStore((s) => s.teeth[id] ?? 'none');
  const selected = useBuilderStore((s) => s.selected.includes(id));
  const hovered = useBuilderStore((s) => s.hovered === id);
  const tapTooth = useBuilderStore((s) => s.tapTooth);
  const setHovered = useBuilderStore((s) => s.setHovered);
  const capped = style !== 'none';
  const num = id.replace(/^[UL]/, '');

  return (
    <button
      type="button"
      onClick={() => tapTooth(id)}
      onPointerEnter={() => setHovered(id)}
      onPointerLeave={() => setHovered(null)}
      aria-label={`Tooth ${id}${capped ? `, ${style}` : ''}`}
      aria-pressed={selected}
      className={[
        // Fill slot width — equal spacing across the full panel, no end overlap
        'flex h-16 w-full min-h-[4rem] flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all sm:h-[4.75rem] sm:min-h-[4.75rem]',
        capped
          ? 'border-silver/65 bg-gradient-to-b from-silver-bright/50 to-steel/40 text-silver-bright'
          : 'border-steel/50 bg-bg-soft text-silver-bright',
        selected
          ? 'z-20 scale-[1.06] border-silver-bright bg-silver/30 shadow-[0_0_0_3px_rgba(232,234,239,0.5)]'
          : '',
        hovered && !selected
          ? 'z-10 scale-[1.04] border-silver-bright/80 shadow-[0_0_0_2px_rgba(200,204,212,0.4)]'
          : '',
        style === 'window' ? 'outline outline-2 outline-offset-[-9px] outline-bg/90' : '',
        style === 'deepcut' ? 'shadow-[inset_0_-9px_0_rgba(0,0,0,0.4)]' : '',
      ].join(' ')}
    >
      <span className="text-lg font-bold leading-none tracking-tight text-silver-bright sm:text-xl">
        {num}
      </span>
      {capped ? (
        <span className="flex items-center justify-center gap-0.5 text-[10px] font-semibold leading-none text-silver-bright sm:text-[11px]">
          <MiniStyleMark style={style as Exclude<ToothStyle, 'none'>} />
          {STYLE_SHORT[style as Exclude<ToothStyle, 'none'>]}
        </span>
      ) : (
        <span className="h-3.5 text-[10px] leading-none text-steel-dim sm:h-4">·</span>
      )}
    </button>
  );
}

function ArchRow({
  ids,
  label,
  flipY,
}: {
  ids: ToothId[];
  label: string;
  flipY: boolean;
}) {
  const amp = 42;
  return (
    <div className="w-full">
      <p className="mb-4 text-center text-xs font-semibold tracking-[0.16em] text-steel uppercase">
        {label}
      </p>
      <div className="relative w-full pt-1 pb-2">
        <svg
          viewBox="0 0 100 36"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-1 top-[42%] h-14 w-[calc(100%-0.5rem)] -translate-y-1/2 text-border sm:h-16"
          aria-hidden
        >
          <path
            d={flipY ? 'M 1 6 Q 50 32 99 6' : 'M 1 30 Q 50 4 99 30'}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
            opacity="0.5"
          />
        </svg>
        <div className="relative flex w-full items-start gap-1.5 sm:gap-2.5">
          {ids.map((id, i) => (
            <div
              key={id}
              className="min-w-0 flex-1"
              style={{
                transform: `translateY(${curveOffset(i, ids.length, flipY, amp)}px)`,
                paddingTop: flipY ? 0 : amp * 0.15,
                paddingBottom: flipY ? amp * 0.15 : 0,
              }}
            >
              <ToothMark id={id} />
            </div>
          ))}
        </div>
        {/* Room for the curve so teeth aren't clipped */}
        <div style={{ height: amp * 0.55 }} aria-hidden />
      </div>
    </div>
  );
}

export function ToothChart2D() {
  const arch = useBuilderStore((s) => s.arch);
  const top = toothIdsForArch('top');
  const bottom = toothIdsForArch('bottom');

  return (
    <div
      className="flex w-full flex-col items-stretch gap-6 py-1 sm:gap-8 sm:py-2"
      role="group"
      aria-label="Tooth style chart"
    >
      {(arch === 'top' || arch === 'both') && (
        <ArchRow ids={top} label="Top" flipY={false} />
      )}
      {(arch === 'bottom' || arch === 'both') && (
        <ArchRow ids={bottom} label="Bottom" flipY={true} />
      )}
    </div>
  );
}
