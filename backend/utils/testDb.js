import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { repos } from '../repositories/index.js';

async function test() {
  console.log('Testing MongoDB connection...\n');
  await connectDB();

  await repos.departments.replaceAll([{ id: '_test', name: 'Connection test' }]);
  const count = (await repos.departments.getAll()).length;
  await repos.departments.delete('_test');

  console.log(`\n✅ Read/write OK (${count} department record during test)`);
  await disconnectDB();
}

test().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
