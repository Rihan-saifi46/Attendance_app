import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

export async function setupTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
  }
}

export async function clearTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
}

export async function teardownTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await clearTestDatabase();
    await mongoose.disconnect();
  }
}
