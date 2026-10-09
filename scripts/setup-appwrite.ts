/**
 * Idempotent Appwrite schema setup for JMCANBOY Jewelry.
 * Usage: npm run setup:appwrite
 *
 * Never prints APPWRITE_API_KEY. Never deletes or overwrites data.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import {
  Client,
  Databases,
  TablesDB,
  DatabasesIndexType,
  TablesDBIndexType,
} from 'node-appwrite';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

// ---------------------------------------------------------------------------
// Config / schema
// ---------------------------------------------------------------------------

type ColKind = 'string' | 'integer' | 'float';
type ColDef = { key: string; kind: ColKind; size?: number; required?: boolean };
type IndexDef = { key: string; type: 'key' | 'unique'; attrs: string[] };

type TableDef = {
  id: string;
  name: string;
  columns: ColDef[];
  indexes: IndexDef[];
};

const TABLES: TableDef[] = [
  {
    id: 'settings',
    name: 'settings',
    columns: [{ key: 'value_json', kind: 'string', size: 4096, required: true }],
    indexes: [],
  },
  {
    id: 'waitlist_entries',
    name: 'waitlist_entries',
    columns: [
      { key: 'email', kind: 'string', size: 254 },
      { key: 'name', kind: 'string', size: 120 },
      { key: 'phone', kind: 'string', size: 40 },
      { key: 'referral_code', kind: 'string', size: 32 },
      { key: 'referred_by', kind: 'string', size: 32 },
      { key: 'unsubscribe_token', kind: 'string', size: 64 },
      { key: 'unsubscribed_at', kind: 'string', size: 40 },
      { key: 'notified_at', kind: 'string', size: 40 },
    ],
    indexes: [
      { key: 'unique_email', type: 'unique', attrs: ['email'] },
      { key: 'unique_referral_code', type: 'unique', attrs: ['referral_code'] },
      { key: 'unique_unsubscribe_token', type: 'unique', attrs: ['unsubscribe_token'] },
      { key: 'key_referred_by', type: 'key', attrs: ['referred_by'] },
    ],
  },
  {
    id: 'designs',
    name: 'designs',
    columns: [
      { key: 'email', kind: 'string', size: 254 },
      { key: 'arch', kind: 'string', size: 16 },
      { key: 'teeth_json', kind: 'string', size: 20000 },
      { key: 'metal', kind: 'string', size: 16 },
      { key: 'estimate_cents', kind: 'integer' },
    ],
    indexes: [],
  },
  {
    id: 'orders',
    name: 'orders',
    columns: [
      { key: 'access_token', kind: 'string', size: 64 },
      { key: 'design_id', kind: 'string', size: 36 },
      { key: 'email', kind: 'string', size: 254 },
      { key: 'name', kind: 'string', size: 120 },
      { key: 'phone', kind: 'string', size: 40 },
      { key: 'fulfillment', kind: 'string', size: 32 },
      { key: 'status', kind: 'string', size: 40 },
      { key: 'tier', kind: 'string', size: 16 },
      { key: 'metal', kind: 'string', size: 16 },
      { key: 'price_override_cents', kind: 'integer' },
      { key: 'media_consent_at', kind: 'string', size: 40 },
      { key: 'total_cents', kind: 'integer' },
      { key: 'deposit_cents', kind: 'integer' },
      { key: 'balance_cents', kind: 'integer' },
      { key: 'stripe_deposit_session_id', kind: 'string', size: 128 },
      { key: 'stripe_balance_session_id', kind: 'string', size: 128 },
      { key: 'price_snapshot_json', kind: 'string', size: 20000 },
      { key: 'terms_version', kind: 'string', size: 40 },
      { key: 'terms_accepted_at', kind: 'string', size: 40 },
      { key: 'terms_accepted_ip', kind: 'string', size: 64 },
      { key: 'shipping_address_json', kind: 'string', size: 2000 },
      { key: 'tracking_number', kind: 'string', size: 120 },
    ],
    indexes: [
      { key: 'unique_access_token', type: 'unique', attrs: ['access_token'] },
      { key: 'key_design_id', type: 'key', attrs: ['design_id'] },
      { key: 'key_email', type: 'key', attrs: ['email'] },
      { key: 'key_status', type: 'key', attrs: ['status'] },
      { key: 'key_tier', type: 'key', attrs: ['tier'] },
    ],
  },
  {
    id: 'order_events',
    name: 'order_events',
    columns: [
      { key: 'order_id', kind: 'string', size: 36 },
      { key: 'type', kind: 'string', size: 64 },
      { key: 'note', kind: 'string', size: 2000 },
    ],
    indexes: [{ key: 'key_order_id', type: 'key', attrs: ['order_id'] }],
  },
  {
    id: 'mold_photos',
    name: 'mold_photos',
    columns: [
      { key: 'order_id', kind: 'string', size: 36 },
      { key: 'storage_path', kind: 'string', size: 64 },
      { key: 'status', kind: 'string', size: 16 },
      { key: 'reviewer_note', kind: 'string', size: 2000 },
    ],
    indexes: [{ key: 'key_order_id', type: 'key', attrs: ['order_id'] }],
  },
  {
    id: 'stripe_webhook_events',
    name: 'stripe_webhook_events',
    columns: [{ key: 'type', kind: 'string', size: 128 }],
    indexes: [],
  },
  {
    id: 'spot_prices',
    name: 'spot_prices',
    columns: [
      { key: 'usd_per_oz', kind: 'float' },
      { key: 'source', kind: 'string', size: 64 },
      { key: 'fetched_at', kind: 'string', size: 40 },
    ],
    indexes: [],
  },
];

/** value_json holds a JSON-encoded value (including quote marks for strings). */
const SETTINGS_SEED: Record<string, string> = {
  site_mode: JSON.stringify('waitlist'), // -> "waitlist"
  site_public: JSON.stringify(false), // -> false
  founding_slots_total: JSON.stringify(5), // -> 5
  applied_spot: JSON.stringify(61.19), // -> 61.19
};

const COLUMN_TIMEOUT_MS = 2 * 60 * 1000;
const POLL_MS = 2000;
/** TablesDB varchar max is 16381 — larger strings use text/string columns. */
const VARCHAR_MAX = 16381;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(step: string, status: 'created' | 'skipped' | 'failed' | 'ok' | 'info', detail = '') {
  const pad = status.toUpperCase().padEnd(7);
  console.log(`[${pad}] ${step}${detail ? ` — ${detail}` : ''}`);
}

function sdkVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'node_modules/node-appwrite/package.json'), 'utf8'),
    ) as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

function isExistsError(e: unknown): boolean {
  const err = e as { code?: number; type?: string; message?: string };
  if (err.code === 409) return true;
  const msg = `${err.type ?? ''} ${err.message ?? ''}`.toLowerCase();
  return msg.includes('already exists') || msg.includes('duplicate');
}

function isNotFound(e: unknown): boolean {
  const err = e as { code?: number };
  return err.code === 404;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireEnv(): {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
} {
  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? process.env.APPWRITE_ENDPOINT ?? '';
  const projectId =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID ?? '';
  const apiKey = process.env.APPWRITE_API_KEY ?? '';
  const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'jmcanboy';

  const missing: string[] = [];
  if (!endpoint) missing.push('NEXT_PUBLIC_APPWRITE_ENDPOINT (or APPWRITE_ENDPOINT)');
  if (!projectId) missing.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID (or APPWRITE_PROJECT_ID)');
  if (!apiKey) missing.push('APPWRITE_API_KEY');
  if (missing.length) {
    throw new Error(`Missing env in .env.local: ${missing.join(', ')}`);
  }

  return { endpoint, projectId, apiKey, databaseId };
}

type AttrLike = {
  key: string;
  type: string;
  status?: string;
  size?: number;
  required?: boolean;
};

type IndexLike = {
  key: string;
  type: string;
  status?: string;
  attributes?: string[];
  columns?: string[];
};

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

type Mode = 'tables' | 'collections';

type Driver = {
  mode: Mode;
  ensureDatabase: () => Promise<void>;
  ensureTable: (t: TableDef) => Promise<void>;
  listColumns: (tableId: string) => Promise<AttrLike[]>;
  createColumn: (tableId: string, col: ColDef) => Promise<void>;
  listIndexes: (tableId: string) => Promise<IndexLike[]>;
  createIndex: (tableId: string, idx: IndexDef) => Promise<void>;
  seedSettingsRow: (id: string, valueJson: string) => Promise<void>;
};

function createTablesDriver(tables: TablesDB, databaseId: string): Driver {
  return {
    mode: 'tables',
    async ensureDatabase() {
      try {
        await tables.get({ databaseId });
        log(`database ${databaseId}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await tables.create({ databaseId, name: databaseId, enabled: true });
        log(`database ${databaseId}`, 'created');
      }
    },
    async ensureTable(t) {
      try {
        await tables.getTable({ databaseId, tableId: t.id });
        log(`table ${t.id}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await tables.createTable({
          databaseId,
          tableId: t.id,
          name: t.name,
          permissions: [],
          rowSecurity: false,
          enabled: true,
        });
        log(`table ${t.id}`, 'created', 'empty permissions, rowSecurity=false');
      }
    },
    async listColumns(tableId) {
      const res = await tables.listColumns({ databaseId, tableId });
      return res.columns as unknown as AttrLike[];
    },
    async createColumn(tableId, col) {
      const required = col.required === true;
      if (col.kind === 'integer') {
        await tables.createIntegerColumn({ databaseId, tableId, key: col.key, required });
        return;
      }
      if (col.kind === 'float') {
        await tables.createFloatColumn({ databaseId, tableId, key: col.key, required });
        return;
      }
      const size = col.size ?? 255;
      if (size > VARCHAR_MAX) {
        await tables.createStringColumn({
          databaseId,
          tableId,
          key: col.key,
          size,
          required,
        });
      } else {
        await tables.createVarcharColumn({
          databaseId,
          tableId,
          key: col.key,
          size,
          required,
        });
      }
    },
    async listIndexes(tableId) {
      const res = await tables.listIndexes({ databaseId, tableId });
      return res.indexes as unknown as IndexLike[];
    },
    async createIndex(tableId, idx) {
      await tables.createIndex({
        databaseId,
        tableId,
        key: idx.key,
        type:
          idx.type === 'unique' ? TablesDBIndexType.Unique : TablesDBIndexType.Key,
        columns: idx.attrs,
      });
    },
    async seedSettingsRow(id, valueJson) {
      try {
        await tables.getRow({ databaseId, tableId: 'settings', rowId: id });
        log(`seed settings/${id}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await tables.createRow({
          databaseId,
          tableId: 'settings',
          rowId: id,
          data: { value_json: valueJson },
          permissions: [],
        });
        log(`seed settings/${id}`, 'created');
      }
    },
  };
}

function createCollectionsDriver(databases: Databases, databaseId: string): Driver {
  return {
    mode: 'collections',
    async ensureDatabase() {
      try {
        await databases.get({ databaseId });
        log(`database ${databaseId}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await databases.create({ databaseId, name: databaseId, enabled: true });
        log(`database ${databaseId}`, 'created');
      }
    },
    async ensureTable(t) {
      try {
        await databases.getCollection({ databaseId, collectionId: t.id });
        log(`collection ${t.id}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await databases.createCollection({
          databaseId,
          collectionId: t.id,
          name: t.name,
          permissions: [],
          documentSecurity: false,
          enabled: true,
        });
        log(`collection ${t.id}`, 'created', 'empty permissions, documentSecurity=false');
      }
    },
    async listColumns(tableId) {
      const res = await databases.listAttributes({ databaseId, collectionId: tableId });
      return res.attributes as unknown as AttrLike[];
    },
    async createColumn(tableId, col) {
      const required = col.required === true;
      if (col.kind === 'integer') {
        await databases.createIntegerAttribute({
          databaseId,
          collectionId: tableId,
          key: col.key,
          required,
        });
        return;
      }
      if (col.kind === 'float') {
        await databases.createFloatAttribute({
          databaseId,
          collectionId: tableId,
          key: col.key,
          required,
        });
        return;
      }
      await databases.createStringAttribute({
        databaseId,
        collectionId: tableId,
        key: col.key,
        size: col.size ?? 255,
        required,
      });
    },
    async listIndexes(tableId) {
      const res = await databases.listIndexes({ databaseId, collectionId: tableId });
      return res.indexes as unknown as IndexLike[];
    },
    async createIndex(tableId, idx) {
      await databases.createIndex({
        databaseId,
        collectionId: tableId,
        key: idx.key,
        type:
          idx.type === 'unique'
            ? DatabasesIndexType.Unique
            : DatabasesIndexType.Key,
        attributes: idx.attrs,
      });
    },
    async seedSettingsRow(id, valueJson) {
      try {
        await databases.getDocument({
          databaseId,
          collectionId: 'settings',
          documentId: id,
        });
        log(`seed settings/${id}`, 'skipped', 'already exists');
      } catch (e) {
        if (!isNotFound(e)) throw e;
        await databases.createDocument({
          databaseId,
          collectionId: 'settings',
          documentId: id,
          data: { value_json: valueJson },
          permissions: [],
        });
        log(`seed settings/${id}`, 'created');
      }
    },
  };
}

async function detectDriver(
  tables: TablesDB,
  databases: Databases,
  databaseId: string,
): Promise<Driver> {
  // Prefer TablesDB (current Appwrite Cloud UI). Fall back to legacy Databases.
  try {
    await tables.listTables({ databaseId });
    log('API mode', 'ok', `TablesDB (node-appwrite ${sdkVersion()})`);
    return createTablesDriver(tables, databaseId);
  } catch (e) {
    if (isNotFound(e)) {
      // DB missing — still prefer TablesDB for create
      log('API mode', 'info', `TablesDB (database missing yet; node-appwrite ${sdkVersion()})`);
      return createTablesDriver(tables, databaseId);
    }
  }

  try {
    await databases.listCollections({ databaseId });
    log('API mode', 'ok', `legacy Databases (node-appwrite ${sdkVersion()})`);
    return createCollectionsDriver(databases, databaseId);
  } catch (e) {
    if (isNotFound(e)) {
      log('API mode', 'info', `legacy Databases (database missing; node-appwrite ${sdkVersion()})`);
      return createCollectionsDriver(databases, databaseId);
    }
    // Tables list failed for another reason — try collections probe differently
    log(
      'API mode',
      'info',
      `TablesDB probe failed; using TablesDB driver anyway (${sdkVersion()})`,
    );
    return createTablesDriver(tables, databaseId);
  }
}

// ---------------------------------------------------------------------------
// Column wait + create
// ---------------------------------------------------------------------------

async function ensureColumns(driver: Driver, table: TableDef) {
  const existing = await driver.listColumns(table.id);
  const byKey = new Map(existing.map((c) => [c.key, c]));

  for (const col of table.columns) {
    if (byKey.has(col.key)) {
      log(`column ${table.id}.${col.key}`, 'skipped', 'already exists');
      continue;
    }
    try {
      await driver.createColumn(table.id, col);
      log(
        `column ${table.id}.${col.key}`,
        'created',
        `${col.kind}${col.size ? `(${col.size})` : ''}${col.required ? ' required' : ''}`,
      );
    } catch (e) {
      if (isExistsError(e)) {
        log(`column ${table.id}.${col.key}`, 'skipped', 'already exists');
      } else {
        log(`column ${table.id}.${col.key}`, 'failed', (e as Error).message);
        throw e;
      }
    }
  }
}

async function waitColumnsAvailable(driver: Driver, table: TableDef) {
  const needed = new Set(table.columns.map((c) => c.key));
  const start = Date.now();

  while (Date.now() - start < COLUMN_TIMEOUT_MS) {
    const cols = await driver.listColumns(table.id);
    const relevant = cols.filter((c) => needed.has(c.key));
    const pending = relevant.filter((c) => c.status && c.status !== 'available');
    const missing = [...needed].filter((k) => !cols.some((c) => c.key === k));

    if (pending.length === 0 && missing.length === 0) {
      log(`columns ready ${table.id}`, 'ok', `${relevant.length} available`);
      return;
    }

    const detail = [
      ...pending.map((c) => `${c.key}:${c.status}`),
      ...missing.map((k) => `${k}:missing`),
    ].join(', ');
    log(`waiting columns ${table.id}`, 'info', detail);
    await sleep(POLL_MS);
  }

  throw new Error(
    `Timeout waiting for columns on ${table.id} to become available (${COLUMN_TIMEOUT_MS}ms)`,
  );
}

async function ensureIndexes(driver: Driver, table: TableDef) {
  if (table.indexes.length === 0) return;
  const existing = await driver.listIndexes(table.id);
  const byKey = new Map(existing.map((i) => [i.key, i]));

  for (const idx of table.indexes) {
    if (byKey.has(idx.key)) {
      log(`index ${table.id}.${idx.key}`, 'skipped', 'already exists');
      continue;
    }
    try {
      await driver.createIndex(table.id, idx);
      log(`index ${table.id}.${idx.key}`, 'created', `${idx.type}(${idx.attrs.join(',')})`);
    } catch (e) {
      if (isExistsError(e)) {
        log(`index ${table.id}.${idx.key}`, 'skipped', 'already exists');
      } else {
        log(`index ${table.id}.${idx.key}`, 'failed', (e as Error).message);
        throw e;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

function expectedStringType(size: number, mode: Mode): string[] {
  if (mode === 'tables') {
    return size > VARCHAR_MAX ? ['string', 'text'] : ['varchar', 'string'];
  }
  return ['string'];
}

function normalizeType(t: string): string {
  return t.toLowerCase();
}

async function verify(driver: Driver) {
  const errors: string[] = [];

  for (const table of TABLES) {
    const cols = await driver.listColumns(table.id);
    const indexes = await driver.listIndexes(table.id);
    const colMap = new Map(cols.map((c) => [c.key, c]));
    const idxMap = new Map(indexes.map((i) => [i.key, i]));

    log(`verify ${table.id}`, 'info', `${cols.length} columns, ${indexes.length} indexes`);

    for (const def of table.columns) {
      const got = colMap.get(def.key);
      if (!got) {
        errors.push(`${table.id}.${def.key}: MISSING column`);
        continue;
      }
      if (got.status && got.status !== 'available') {
        errors.push(`${table.id}.${def.key}: status=${got.status} (want available)`);
      }

      const t = normalizeType(got.type);
      if (def.kind === 'integer') {
        if (t !== 'integer') {
          errors.push(`${table.id}.${def.key}: type=${got.type} (want integer)`);
        }
      } else if (def.kind === 'float') {
        if (t !== 'float' && t !== 'double') {
          errors.push(`${table.id}.${def.key}: type=${got.type} (want float)`);
        }
      } else {
        const allowed = expectedStringType(def.size ?? 255, driver.mode);
        if (!allowed.includes(t)) {
          errors.push(
            `${table.id}.${def.key}: type=${got.type} (want one of ${allowed.join('|')})`,
          );
        }
        if (typeof got.size === 'number' && def.size != null && got.size !== def.size) {
          errors.push(
            `${table.id}.${def.key}: size=${got.size} (want ${def.size})`,
          );
        }
      }

      const wantRequired = def.required === true;
      if (typeof got.required === 'boolean' && got.required !== wantRequired) {
        errors.push(
          `${table.id}.${def.key}: required=${got.required} (want ${wantRequired})`,
        );
      }
    }

    for (const idx of table.indexes) {
      const got = idxMap.get(idx.key);
      if (!got) {
        errors.push(`${table.id}.${idx.key}: MISSING index`);
        continue;
      }
      if (normalizeType(got.type) !== idx.type) {
        errors.push(`${table.id}.${idx.key}: type=${got.type} (want ${idx.type})`);
      }
      const fields = got.columns ?? got.attributes ?? [];
      const same =
        fields.length === idx.attrs.length &&
        idx.attrs.every((a, i) => fields[i] === a);
      if (!same) {
        errors.push(
          `${table.id}.${idx.key}: fields=[${fields.join(',')}] (want [${idx.attrs.join(',')}])`,
        );
      }
    }
  }

  if (errors.length) {
    console.error('\nVERIFY FAILED:');
    for (const e of errors) console.error(`  - ${e}`);
    throw new Error(`${errors.length} schema verification error(s)`);
  }

  log('verify', 'ok', 'all tables/columns/indexes match schema');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { endpoint, projectId, apiKey, databaseId } = requireEnv();
  log('env', 'ok', `endpoint=${endpoint} project=${projectId} database=${databaseId}`);
  log('sdk', 'info', `node-appwrite@${sdkVersion()}`);

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const tables = new TablesDB(client);
  const databases = new Databases(client);
  const driver = await detectDriver(tables, databases, databaseId);

  await driver.ensureDatabase();

  for (const table of TABLES) {
    await driver.ensureTable(table);
    await ensureColumns(driver, table);
    await waitColumnsAvailable(driver, table);
    await ensureIndexes(driver, table);
  }

  log('seed settings', 'info', 'only missing rows');
  for (const [id, valueJson] of Object.entries(SETTINGS_SEED)) {
    try {
      await driver.seedSettingsRow(id, valueJson);
    } catch (e) {
      log(`seed settings/${id}`, 'failed', (e as Error).message);
      throw e;
    }
  }

  await verify(driver);
  console.log('\nAppwrite schema setup complete.');
}

main().catch((e) => {
  console.error('\nSetup failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
