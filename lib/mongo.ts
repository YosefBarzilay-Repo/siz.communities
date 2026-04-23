import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __siz_mongo_client: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var __siz_mongo_client_promise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "siz_communities";
const isProduction = process.env.NODE_ENV === "production";

const clientOptions = {};

export const hasMongoConfig = Boolean(uri);

export const getMongoClient = async () => {
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  if (globalThis.__siz_mongo_client) {
    return globalThis.__siz_mongo_client;
  }

  if (!globalThis.__siz_mongo_client_promise) {
    const client = new MongoClient(uri, clientOptions);
    globalThis.__siz_mongo_client_promise = client.connect();
  }

  globalThis.__siz_mongo_client = await globalThis.__siz_mongo_client_promise;
  return globalThis.__siz_mongo_client;
};

export const getDb = async (): Promise<Db> => {
  const client = await getMongoClient();
  return client.db(dbName);
};

export const getDbOrNull = async (): Promise<Db | null> => {
  if (!uri) {
    if (isProduction) {
      throw new Error("MONGODB_URI is required in production");
    }
    return null;
  }

  try {
    return await getDb();
  } catch (error) {
    if (isProduction) {
      throw error;
    }
    console.error("Mongo connection failed; using in-memory fallback for this request.", error);
    return null;
  }
};
