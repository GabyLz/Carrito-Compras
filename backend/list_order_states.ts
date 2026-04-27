
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const estados = await prisma.ord_estados_orden.findMany();
  console.log('--- ESTADOS DE ORDEN ---');
  console.log(JSON.stringify(estados, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
