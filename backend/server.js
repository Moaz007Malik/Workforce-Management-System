import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { syncAllEmployees } from './services/employeeSyncService.js';

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  try {
    await syncAllEmployees();
  } catch (err) {
    console.warn('Employee sync on startup skipped:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 ProMgmt API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
