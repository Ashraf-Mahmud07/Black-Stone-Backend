import mongoose from 'mongoose';
import config from '../config';

type TConnectionCache = {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
};

/**
 * Serverless platforms (Vercel) reuse a warm process across invocations but may also start
 * many of them. Caching the connection on `globalThis` keeps one connection per instance
 * instead of opening a new one on every request.
 */
const globalCache = globalThis as typeof globalThis & { __mongooseCache?: TConnectionCache };

const cache: TConnectionCache = globalCache.__mongooseCache ?? { conn: null, promise: null };
globalCache.__mongooseCache = cache;

export const connectToDatabase = async (): Promise<typeof mongoose> => {
	if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

	if (!config.database_url) {
		throw new Error('DATABASE_URL is not configured!');
	}

	if (!cache.promise) {
		cache.promise = mongoose
			.connect(config.database_url, {
				serverSelectionTimeoutMS: 10000,
				maxPoolSize: 10
			})
			.catch((error) => {
				// a failed attempt must not be cached, otherwise every later request reuses it
				cache.promise = null;
				throw error;
			});
	}

	cache.conn = await cache.promise;
	return cache.conn;
};

export default connectToDatabase;
