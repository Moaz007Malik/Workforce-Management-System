import dns from 'dns';
import mongoose from 'mongoose';

const globalCache = globalThis;

if (!globalCache._mongooseCache) {
  globalCache._mongooseCache = { conn: null, promise: null };
}

const cache = globalCache._mongooseCache;

export async function connectDB() {
  if (cache.conn) {
    return cache.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to backend/.env or Vercel env vars.');
  }

  if (process.env.FORCE_PUBLIC_DNS === 'true' || process.env.VERCEL) {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  }

  mongoose.set('strictQuery', true);

  const options = {
    family: 4,
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 45000,
  };

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, options).then((mongooseInstance) => {
      console.log('✓ Connected to MongoDB');
      return mongooseInstance;
    });
  }

  try {
    cache.conn = await cache.promise;
    await cache.conn.connection.db.admin().ping();
    return cache.conn;
  } catch (err) {
    cache.promise = null;
    cache.conn = null;
    const msg = err.message || '';
    if (msg.includes('querySrv')) {
      throw new Error(
        `${msg}\n\nDNS could not resolve your Atlas SRV host. Try:\n` +
        '1. Set Windows DNS to 8.8.8.8 / 1.1.1.1\n' +
        '2. Or use Atlas "Standard connection string" in backend/.env\n' +
        '3. Disable VPN blocking DNS'
      );
    }
    if (msg.includes('SSL') || msg.includes('tlsv1 alert internal error')) {
      throw new Error(
        'MongoDB Atlas SSL connection failed (tlsv1 alert internal error).\n\n' +
        'This is almost always Atlas Network Access — your IP is not allowed:\n' +
        '1. Atlas → Network Access → Add IP Address\n' +
        '2. Click "Add Current IP Address" OR use 0.0.0.0/0 for development\n' +
        '3. Wait 2 minutes, then run npm run seed again\n\n' +
        'Also check: cluster is not Paused, VPN/antivirus is off, password in .env is correct.'
      );
    }
    throw err;
  }
}

export async function disconnectDB() {
  if (cache.conn) {
    await mongoose.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
