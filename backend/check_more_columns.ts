
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables = ['ord_pagos', 'ord_devoluciones', 'inv_movimientos_inventario'];
  for (const table of tables) {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = '${table}'
    `);
    console.log(`Columns in ${table}:`, columns);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
