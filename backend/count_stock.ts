import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const stockCount = await prisma.inv_stock_producto.count();
  console.log(`Total registros en inv_stock_producto: ${stockCount}`);
  
  const sampleStock = await prisma.inv_stock_producto.findMany({
    take: 5,
    include: {
      producto: true,
      almacen: true
    }
  });
  console.log('Muestra de stock:', JSON.stringify(sampleStock, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
