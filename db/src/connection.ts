import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export type ConnectOptions = {
  uri: string;
  /** Build the declared indexes on connect. Handy locally, skip it in production. */
  syncIndexes?: boolean;
}

export async function connectToDatabase({ uri, syncIndexes = false }: ConnectOptions): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  const connection = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  if (syncIndexes) {
    await Promise.all(Object.values(connection.models).map((model) => model.syncIndexes()));
  }

  return connection;
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

/** Wipes every collection. Test helper — refuses to run against a non-test database. */
export async function clearDatabase(): Promise<void> {
  const { db, name } = mongoose.connection;
  if (!db) throw new Error('Not connected to a database.');
  if (!/test/i.test(name)) {
    throw new Error(`Refusing to clear database "${name}": its name does not contain "test".`);
  }

  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
