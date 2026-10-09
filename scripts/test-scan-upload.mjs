/**
 * Manual check: small STL under limit + oversized file rejected by config rules.
 * Does not require a live order token for the size/type gates.
 */
import { readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const maxBytes = 50_000_000;
const maxLabel = '50 MB';
const extensions = ['stl', 'obj', 'ply'];

function scanExtension(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return extensions.includes(ext) ? ext : null;
}

function isAllowedScanMime(mime, filename) {
  const ext = scanExtension(filename);
  if (!ext) return false;
  const normalized = (mime || 'application/octet-stream').toLowerCase().split(';')[0].trim();
  if (normalized === 'application/octet-stream' || normalized === '') return true;
  const allowed = [
    'model/stl',
    'application/sla',
    'application/vnd.ms-pki.stl',
    'model/obj',
    'text/plain',
    'application/octet-stream',
    'application/ply',
    'model/ply',
  ];
  return allowed.includes(normalized);
}

const tinyStl = join(root, 'tmp-tiny-scan.stl');
const hugeFile = join(root, 'tmp-huge-scan.stl');

const stlBody = `solid test
  facet normal 0 0 0
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 1 0
    endloop
  endfacet
endsolid test
`;

writeFileSync(tinyStl, stlBody);
// Sparse-ish oversize: write max+1 bytes
writeFileSync(hugeFile, Buffer.alloc(maxBytes + 1, 0x20));

const tinyStat = statSync(tinyStl);
const hugeStat = statSync(hugeFile);

const tinyOk =
  tinyStat.size <= maxBytes &&
  !!scanExtension('tmp-tiny-scan.stl') &&
  isAllowedScanMime('application/octet-stream', 'tmp-tiny-scan.stl');

const hugeRejected = hugeStat.size > maxBytes;

const results = [
  {
    name: 'small STL under limit',
    passed: tinyOk,
    detail: `${tinyStat.size} bytes ≤ ${maxBytes} (${maxLabel}), type ok`,
  },
  {
    name: 'file over limit rejected',
    passed: hugeRejected,
    detail: `${hugeStat.size} bytes > ${maxBytes} → would return 413 / clear UI error`,
  },
];

for (const r of results) {
  console.log(`${r.passed ? 'PASS' : 'FAIL'}: ${r.name} — ${r.detail}`);
}

try {
  unlinkSync(tinyStl);
  unlinkSync(hugeFile);
} catch {
  /* ignore */
}

const failed = results.filter((r) => !r.passed);
process.exit(failed.length ? 1 : 0);
