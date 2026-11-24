/**
 * Writes a heartbeat into the settings table so free Appwrite projects see
 * recent Console-adjacent API activity. Not guaranteed — Appwrite may still
 * pause for inactivity; paid plan is the reliable fix.
 *
 * Usage (local): npx tsx scripts/keepalive-appwrite.ts
 * Usage (CI): GitHub Action .github/workflows/keepalive-appwrite.yml
 */
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Client, TablesDB, ID } from 'node-appwrite';

loadEnv({ path: resolve(process.cwd(), '.env.local') });

/** Fingerprint that avoids GitHub masking the whole secret value in logs. */
function fingerprint(label: string, value: string) {
  const len = value.length;
  const head = [...value.slice(0, 4)].join(' ');
  const tail = [...value.slice(-4)].join(' ');
  console.log(`${label}: len=${len} head=[${head}] tail=[${tail}]`);
}

async function listDatabases(tables: TablesDB) {
  try {
    const res = await tables.list();
    const rows = (res as { databases?: Array<{ $id: string; name: string }> }).databases ?? [];
    if (!rows.length) {
      console.error('No databases in this project (wrong PROJECT_ID, or project is empty/paused).');
      return;
    }
    console.error('Databases in this project:');
    for (const db of rows) {
      console.error(`  - id=${db.$id}  name=${db.name}`);
    }
  } catch (listErr) {
    console.error(
      'Could not list databases (API key needs databases.read):',
      listErr instanceof Error ? listErr.message : listErr,
    );
  }
}

async function main() {
  const endpoint =
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? process.env.APPWRITE_ENDPOINT ?? '';
  const projectId =
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID ?? '';
  const apiKey = process.env.APPWRITE_API_KEY ?? '';
  // Must be the Console database *ID* (e.g. 6ac643...), not the display name.
  const databaseId = process.env.APPWRITE_DATABASE_ID ?? '';

  const missing: string[] = [];
  if (!endpoint) missing.push('APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_ENDPOINT');
  if (!projectId) missing.push('APPWRITE_PROJECT_ID / NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  if (!apiKey) missing.push('APPWRITE_API_KEY');
  if (!databaseId) missing.push('APPWRITE_DATABASE_ID');
  if (missing.length) {
    console.error('Missing env:', missing.join(', '));
    process.exit(1);
  }
  if (databaseId === 'jmcanboy') {
    console.error(
      'APPWRITE_DATABASE_ID is set to "jmcanboy" (the name). Use the Console database ID instead (Databases → open DB → copy ID).',
    );
    process.exit(1);
  }

  console.log('endpoint:', endpoint);
  fingerprint('project', projectId);
  fingerprint('database', databaseId);
  fingerprint('apiKey', apiKey);

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tables = new TablesDB(client);
  const rowId = 'keepalive_at';
  const payload = {
    value_json: JSON.stringify({
      at: new Date().toISOString(),
      source: process.env.KEEPALIVE_SOURCE ?? 'script',
    }),
  };

  try {
    await tables.updateRow({
      databaseId,
      tableId: 'settings',
      rowId,
      data: payload,
    });
    console.log('keepalive updated', rowId);
    return;
  } catch (updateErr) {
    const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
    if (/could not be found|not found/i.test(msg) && /database/i.test(msg)) {
      console.error(msg);
      await listDatabases(tables);
      throw new Error(
        'Database ID not found in this project. Copy an id= value from the list above into the APPWRITE_DATABASE_ID secret (and confirm PROJECT_ID).',
      );
    }
    // Row missing — create it
    try {
      await tables.createRow({
        databaseId,
        tableId: 'settings',
        rowId: rowId || ID.unique(),
        data: payload,
      });
      console.log('keepalive created', rowId);
    } catch (createErr) {
      const cmsg = createErr instanceof Error ? createErr.message : String(createErr);
      if (/could not be found|not found/i.test(cmsg) && /database/i.test(cmsg)) {
        console.error(cmsg);
        await listDatabases(tables);
      }
      throw createErr;
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
