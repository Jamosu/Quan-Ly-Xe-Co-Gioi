const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const cols = await p.$queryRawUnsafe('DESCRIBE catalogs');
  console.log(cols.filter(c => c.Field === 'type'));
}
main().finally(() => process.exit(0));
