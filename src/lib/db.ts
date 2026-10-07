/**
 * Thin Appwrite document helpers (server / API-key only).
 * Public pages never talk to Appwrite directly — only via our routes.
 */
import { createAdminClient, ID, Query } from '@/lib/appwrite/admin';
import { APPWRITE } from '@/lib/appwrite/ids';

const dbId = () => APPWRITE.databaseId;
const col = APPWRITE.collections;

export type Doc = Record<string, unknown> & { $id: string; $createdAt?: string };

function stripMeta(doc: Doc): Doc {
  return doc;
}

export async function listDocs(
  collectionId: string,
  queries: string[] = [],
): Promise<{ documents: Doc[]; total: number }> {
  const { databases } = createAdminClient();
  const res = await databases.listDocuments(dbId(), collectionId, queries);
  return {
    documents: res.documents as unknown as Doc[],
    total: res.total,
  };
}

export async function getDoc(collectionId: string, id: string): Promise<Doc | null> {
  try {
    const { databases } = createAdminClient();
    return (await databases.getDocument(dbId(), collectionId, id)) as unknown as Doc;
  } catch {
    return null;
  }
}

export async function createDoc(
  collectionId: string,
  data: Record<string, unknown>,
  id?: string,
): Promise<Doc> {
  const { databases } = createAdminClient();
  return (await databases.createDocument(
    dbId(),
    collectionId,
    id ?? ID.unique(),
    data,
  )) as unknown as Doc;
}

export async function updateDoc(
  collectionId: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Doc> {
  const { databases } = createAdminClient();
  return (await databases.updateDocument(
    dbId(),
    collectionId,
    id,
    data,
  )) as unknown as Doc;
}

export async function deleteDoc(collectionId: string, id: string): Promise<void> {
  const { databases } = createAdminClient();
  await databases.deleteDocument(dbId(), collectionId, id);
}

export async function findOne(
  collectionId: string,
  queries: string[],
): Promise<Doc | null> {
  const { documents } = await listDocs(collectionId, [...queries, Query.limit(1)]);
  return documents[0] ?? null;
}

/** Settings: document $id = key, attribute value_json = JSON string */
export async function getSetting(key: string): Promise<unknown> {
  const doc = await getDoc(col.settings, key);
  if (!doc) return undefined;
  const raw = doc.value_json;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const payload = { value_json: JSON.stringify(value) };
  const existing = await getDoc(col.settings, key);
  if (existing) await updateDoc(col.settings, key, payload);
  else await createDoc(col.settings, payload, key);
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const { documents } = await listDocs(col.settings, [Query.limit(100)]);
  const out: Record<string, unknown> = {};
  for (const d of documents) {
    const raw = d.value_json;
    try {
      out[d.$id] = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      out[d.$id] = raw;
    }
  }
  return out;
}

export { col, Query, ID, stripMeta, APPWRITE };
