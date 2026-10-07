'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';

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

export function HeroGrill() {
  const [failed, setFailed] = useState(false);
  const onFallback = useCallback(() => setFailed(true), []);

  if (failed) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-gradient-to-b from-bg-soft to-bg">
        <div className="text-center">
          <p className="font-display text-5xl tracking-tight text-silver/40">Ag</p>
          <p className="mt-2 text-sm text-text-muted">Sterling silver grillz</p>
        </div>
      </div>
    );
  }

  return <GrillCanvas onFallback={onFallback} className="h-full min-h-[320px] w-full" />;
}
