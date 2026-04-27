
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ITEMS ORDEN ---');
  const items = await prisma.ord_items_orden.count();
  console.log(`Total items en ordenes: ${items}`);

  const sampleItems = await prisma.ord_items_orden.findMany({
    take: 5,
    include: {
      producto: true
    }
  });
  console.log('Muestra de items:', JSON.stringify(sampleItems, null, 2));

  console.log('\n--- CARRI TOS ---');
  const carritos = await prisma.ord_carritos.count();
  console.log(`Total carritos: ${carritos}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
