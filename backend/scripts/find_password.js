/**
 * Lấy hash của password admin để biết mật khẩu thực tế
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const p = new PrismaClient();

async function main() {
  const user = await p.user.findUnique({
    where: { username: 'admin' },
    select: { id: true, username: true, passwordHash: true, role: true }
  });
  console.log('User admin:', JSON.stringify({ id: user.id, username: user.username, role: user.role }));
  console.log('Password hash:', user.passwordHash);

  // Test common passwords
  const candidates = ['123456', 'Thaco@1234$', 'admin', 'admin123', 'Admin123', 'thaco123', 'Thaco@123', 'password', 'thaco@agri', 'admin@123', 'Thaco123'];
  for (const pw of candidates) {
    const ok = await bcrypt.compare(pw, user.passwordHash);
    if (ok) {
      console.log(`✅ Password is: "${pw}"`);
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
