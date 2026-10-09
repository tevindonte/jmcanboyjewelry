import { describe, expect, it } from 'vitest';
import { siteConfig } from './site.config';
import {
  formatScanLimit,
  isAllowedScanMime,
  normalizeScanStatus,
  scanExtension,
  validateScanUpload,
} from './scans';

describe('scans helpers', () => {
  it('accepts stl/obj/ply extensions', () => {
    expect(scanExtension('mouth.STL')).toBe('stl');
    expect(scanExtension('arch.obj')).toBe('obj');
    expect(scanExtension('scan.ply')).toBe('ply');
    expect(scanExtension('photo.jpg')).toBeNull();
  });

  it('allows octet-stream when extension is valid', () => {
    expect(isAllowedScanMime('application/octet-stream', 'a.stl')).toBe(true);
    expect(isAllowedScanMime('model/stl', 'a.stl')).toBe(true);
    expect(isAllowedScanMime('image/jpeg', 'a.stl')).toBe(false);
    expect(isAllowedScanMime('application/octet-stream', 'a.exe')).toBe(false);
  });

  it('exposes Appwrite-aligned size limit label', () => {
    expect(siteConfig.dentistScan.maxBytes).toBe(50_000_000);
    expect(formatScanLimit()).toBe('50 MB');
  });

  it('normalizes scan status', () => {
    expect(normalizeScanStatus('received')).toBe('received');
    expect(normalizeScanStatus('approved')).toBe('approved');
    expect(normalizeScanStatus('needs_new_scan')).toBe('needs_new_scan');
    expect(normalizeScanStatus('nope')).toBe('');
  });

  it('accepts a small STL and rejects over-limit files', () => {
    const small = validateScanUpload({
      filename: 'tiny.stl',
      mime: 'application/octet-stream',
      size: 141,
    });
    expect(small).toBeNull();

    const huge = validateScanUpload({
      filename: 'huge.stl',
      mime: 'application/octet-stream',
      size: siteConfig.dentistScan.maxBytes + 1,
    });
    expect(huge?.code).toBe('file_too_large');
    expect(huge?.error).toContain('50 MB');
  });
});
