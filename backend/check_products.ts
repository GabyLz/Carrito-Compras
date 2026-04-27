
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ESTADOS DE PRODUCTOS ---');
  const counts = await prisma.cat_productos.groupBy({
    by: ['estado_producto'],
    _count: { id: true }
  });
  console.log(JSON.stringify(counts, null, 2));

  console.log('\n--- MUESTRA DE PRODUCTOS (10) ---');
  const products = await prisma.cat_productos.findMany({
    take: 10,
    select: {
      id: true,
      nombre: true,
      estado_producto: true,
      stock_general: true
    }
  });
  console.log(JSON.stringify(products, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
