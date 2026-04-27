
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'
  `;
  console.log('--- TABLES IN DB ---');
  console.log(tables.map(t => t.tablename).sort());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
