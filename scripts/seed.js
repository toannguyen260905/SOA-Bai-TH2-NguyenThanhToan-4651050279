const bcrypt = require('bcryptjs');
const { getConfig } = require('../src/config');
const { openDatabase } = require('../src/db');
const { createUserRepository } = require('../src/repositories/user.repository');

async function main() {
  const db = openDatabase(getConfig().dbPath);
  try {
    const users = createUserRepository(db);
    if (users.findByName('student')) {
      console.log('Tài khoản student đã tồn tại.');
      return;
    }
    const passwordHash = await bcrypt.hash('Student@123', 12);
    users.create('student', passwordHash);
    console.log('Đã tạo tài khoản mẫu: student / Student@123');
  } finally {
    db.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
