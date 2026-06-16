import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { connectDB } from './config/db.js';

const app = express();

const allowedOrigins = [
  ...(process.env.FRONTEND_URL || '').split(',').map((o) => o.trim()),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // When production frontend is on Vercel, allow preview deployment URLs too
  const frontendOnVercel = allowedOrigins.some((o) => o.includes('.vercel.app'));
  if (frontendOnVercel && /^https:\/\/[\w-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, origin || true);
      return;
    }
    console.warn(`CORS blocked origin: ${origin} (allowed: ${allowedOrigins.join(', ') || 'none configured'})`);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ error: err.message || 'Database connection failed' });
  }
});

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
