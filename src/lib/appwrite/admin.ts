import {
  Client,
  Databases,
  TablesDB,
  Storage,
  Account,
  Users,
  ID,
  Query,
} from 'node-appwrite';

export { ID, Query };

function endpoint() {
  return (
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
    process.env.APPWRITE_ENDPOINT ??
    ''
  );
}

function projectId() {
  return (
    process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ??
    process.env.APPWRITE_PROJECT_ID ??
    ''
  );
}

export function createAdminClient() {
  const key = process.env.APPWRITE_API_KEY;
  const end = endpoint();
  const project = projectId();
  if (!end || !project || !key) {
    throw new Error('Missing Appwrite admin credentials');
  }

  const client = new Client().setEndpoint(end).setProject(project).setKey(key);

  return {
    client,
    /** Legacy Documents API — prefer `tables` for this project. */
    databases: new Databases(client),
    tables: new TablesDB(client),
    storage: new Storage(client),
    account: new Account(client),
    users: new Users(client),
  };
}

export function createSessionClient(sessionSecret: string) {
  const end = endpoint();
  const project = projectId();
  if (!end || !project) {
    throw new Error('Missing Appwrite project config');
  }

  const client = new Client()
    .setEndpoint(end)
    .setProject(project)
    .setSession(sessionSecret);

  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    tables: new TablesDB(client),
    storage: new Storage(client),
  };
}
