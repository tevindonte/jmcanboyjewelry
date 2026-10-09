'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { MetalId } from '@/lib/pricing.config';

const GrillCanvas = dynamic(
  () => import('@/components/builder/GrillCanvas').then((m) => m.GrillCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-text-muted">
        Loading…
      </div>
    ),
  },
);

const HERO_CYCLE: { id: MetalId; label: string }[] = [
  { id: 'silver', label: 'Silver' },
  { id: 'vermeil', label: 'Gold' },
];

const CYCLE_MS = 4200;
const FADE_MS = 480;

export function HeroGrill() {
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const onFallback = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (failed) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % HERO_CYCLE.length);
        // Brief beat so the new metal material can compile before fade-in
        window.setTimeout(() => setVisible(true), 120);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [failed]);

  if (failed) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-gradient-to-b from-bg-soft to-bg">
        <div className="text-center">
          <p className="font-display text-5xl tracking-tight text-silver/40">Ag</p>
          <p className="mt-2 text-sm text-text-muted">Custom grillz</p>
        </div>
      </div>
    );
  }

  const current = HERO_CYCLE[index];

  return (
    <div className="relative h-full w-full">
      <div
        className="h-full w-full transition-opacity duration-500 ease-out"
        style={{ opacity: visible ? 1 : 0.35 }}
      >
        <GrillCanvas
          onFallback={onFallback}
          mode="hero"
          interactive
          forceMetal={current.id}
          className="h-full min-h-[360px] w-full lg:min-h-0"
        />
      </div>
      <p
        className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 font-display text-xs font-semibold tracking-[0.2em] text-silver uppercase transition-opacity duration-500"
        style={{ opacity: visible ? 0.9 : 0 }}
        aria-live="polite"
      >
        {current.label}
      </p>
    </div>
  );
}
