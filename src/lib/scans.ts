import { siteConfig } from './site.config';

export type ScanExtension = (typeof siteConfig.dentistScan.extensions)[number];

export function scanExtension(filename: string): ScanExtension | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if ((siteConfig.dentistScan.extensions as readonly string[]).includes(ext)) {
    return ext as ScanExtension;
  }
  return null;
}

export function isAllowedScanMime(mime: string, filename: string): boolean {
  const ext = scanExtension(filename);
  if (!ext) return false;
  const normalized = (mime || 'application/octet-stream').toLowerCase().split(';')[0].trim();
  // Many browsers send octet-stream for STL/OBJ/PLY — accept when extension is valid.
  if (normalized === 'application/octet-stream' || normalized === '') return true;
  return (siteConfig.dentistScan.mimeTypes as readonly string[]).includes(normalized);
}

export function formatScanLimit(): string {
  return siteConfig.dentistScan.maxLabel;
}

export type ScanValidationError = {
  code: 'file_too_large' | 'invalid_type';
  error: string;
  maxBytes?: number;
  maxLabel?: string;
};

/** Server-side type + size gate (used by upload route and tests). */
export function validateScanUpload(input: {
  filename: string;
  mime: string;
  size: number;
}): ScanValidationError | null {
  const maxBytes = siteConfig.dentistScan.maxBytes;
  if (input.size > maxBytes) {
    return {
      code: 'file_too_large',
      error: `File too large (max ${formatScanLimit()})`,
      maxBytes,
      maxLabel: formatScanLimit(),
    };
  }
  if (!scanExtension(input.filename) || !isAllowedScanMime(input.mime, input.filename)) {
    return {
      code: 'invalid_type',
      error: `Upload a .${siteConfig.dentistScan.extensions.join(', .')} file`,
    };
  }
  return null;
}

export type ScanStatus = 'received' | 'approved' | 'needs_new_scan' | '';

export function normalizeScanStatus(value: unknown): ScanStatus {
  if (value === 'received' || value === 'approved' || value === 'needs_new_scan') {
    return value;
  }
  return '';
}
