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
  const databaseId = process.env.APPWRITE_DATABASE_ID ?? 'jmcanboy';

  const missing: string[] = [];
  if (!endpoint) missing.push('APPWRITE_ENDPOINT / NEXT_PUBLIC_APPWRITE_ENDPOINT');
  if (!projectId) missing.push('APPWRITE_PROJECT_ID / NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  if (!apiKey) missing.push('APPWRITE_API_KEY');
  if (missing.length) {
    console.error('Missing env:', missing.join(', '));
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
    await tables.updateRow({
      databaseId,
      tableId: 'settings',
      rowId,
      data: payload,
    });
    console.log('keepalive updated', rowId);
  } catch {
    await tables.createRow({
      databaseId,
      tableId: 'settings',
      rowId: rowId || ID.unique(),
      data: payload,
    });
    console.log('keepalive created', rowId);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
