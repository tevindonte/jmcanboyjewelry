import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Public builder must not import quote / quote.config (spot, casting, labor, margin).
 * Ballparks come from /api/estimate which returns only { low, high }.
 */
const PUBLIC_CLIENT_FILES = [
  'src/components/builder/BuilderControls.tsx',
  'src/components/builder/SaveDesignPanel.tsx',
  'src/store/builder-store.ts',
  'src/lib/pricing.ts',
  'src/lib/pricing.config.ts',
  'src/lib/custom-request.ts',
];

const FORBIDDEN = [
  "from '@/lib/quote'",
  'from "@/lib/quote"',
  "from '@/lib/quote.config'",
  'from "@/lib/quote.config"',
  'from "./quote"',
  'from "./quote.config"',
];

describe('ballpark client isolation', () => {
  it('public builder files do not import quote modules', () => {
    for (const rel of PUBLIC_CLIENT_FILES) {
      const src = readFileSync(resolve(process.cwd(), rel), 'utf8');
      for (const needle of FORBIDDEN) {
        expect(src.includes(needle), `${rel} must not contain ${needle}`).toBe(false);
      }
      expect(src.includes('processingPerGram'), rel).toBe(false);
      expect(src.includes('hourlyRate'), rel).toBe(false);
      expect(src.includes('targetMarginDefault'), rel).toBe(false);
      expect(src.includes('usdPerTroyOz'), rel).toBe(false);
    }
  });

  it('estimate API response helper only exposes low/high shape in route', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/app/api/estimate/route.ts'),
      'utf8',
    );
    expect(src).toMatch(/\{ low: band\.low, high: band\.high \}/);
    expect(src).not.toMatch(/formulaPrice|castingCost|laborCost|spotPerTroyOz/);
  });
});
