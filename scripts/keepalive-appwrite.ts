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
    try {
      await tables.updateRow({
        databaseId,
        tableId: 'settings',
        rowId,
        data: payload,
      });
      console.log('keepalive updated', rowId);
    } catch (updateErr) {
      const msg = updateErr instanceof Error ? updateErr.message : String(updateErr);
      if (/could not be found|not found/i.test(msg) && /database/i.test(msg)) {
        throw new Error(
          `${msg} — check APPWRITE_DATABASE_ID is the Console ID (not the name), and PROJECT_ID matches that project.`,
        );
      }
      await tables.createRow({
        databaseId,
        tableId: 'settings',
        rowId: rowId || ID.unique(),
        data: payload,
      });
      console.log('keepalive created', rowId);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
