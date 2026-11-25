import { describe, expect, it } from 'vitest';
import {
  defaultKitSources,
  kitBuyLabelForTray,
  kitBuyUrlForTray,
  mergeKitSources,
} from './kit-sources.config';
import { buildQuoteEmailText, summarizeTeethStyles } from './quote';

describe('kit sources', () => {
  it('seeds large and medium ebay URLs and a blank walmart backup', () => {
    expect(defaultKitSources).toHaveLength(3);
    const large = defaultKitSources.find((s) => s.id === 'large')!;
    const medium = defaultKitSources.find((s) => s.id === 'medium')!;
    const backup = defaultKitSources.find((s) => s.id === 'walmart_backup')!;
    expect(large.url).toContain('var=626863986712');
    expect(medium.url).toContain('var=626863986711');
    expect(large.seenPriceUsd).toBe(14.96);
    expect(backup.url).toBe('');
    expect(backup.sellerNote.toLowerCase()).toContain('norzero');
  });

  it('kitBuyUrlForTray picks variation by tray size', () => {
    expect(kitBuyUrlForTray('large')).toContain('626863986712');
    expect(kitBuyUrlForTray('medium')).toContain('626863986711');
    expect(kitBuyUrlForTray(undefined)).toContain('626863986712');
    expect(kitBuyLabelForTray('medium')).toContain('Medium');
  });

  it('mergeKitSources applies URL/notes overrides without dropping tray mapping', () => {
    const merged = mergeKitSources([
      { id: 'walmart_backup', url: 'https://example.com/kit', notes: 'filled' },
    ]);
    const backup = merged.find((s) => s.id === 'walmart_backup')!;
    expect(backup.url).toBe('https://example.com/kit');
    expect(backup.notes).toBe('filled');
    expect(merged.find((s) => s.id === 'large')!.traySize).toBe('large');
  });
});

describe('quote email text', () => {
  it('includes price, inclusion, upfront metal, and emailed terms', () => {
    const text = buildQuoteEmailText({
      priceUsd: 1200,
      metal: 'gold10k',
      teethSummary: '6× plain',
    });
    expect(text).toContain('Price: $1,200.00');
    expect(text).toContain("What's included");
    expect(text).toMatch(/Metal cost is paid upfront/i);
    expect(text).toMatch(/terms will be emailed/i);
    expect(text).not.toMatch(/ebay|oroax|walmart/i);
  });

  it('summarizeTeethStyles lists counts', () => {
    expect(
      summarizeTeethStyles({
        U2: 'plain',
        U3: 'plain',
        U4: 'window',
        U5: 'none',
      }),
    ).toBe('2× plain, 1× window');
  });
});
