import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.ord_ordenes.count();
  console.log('Total orders:', count);
  
  const orders = await prisma.ord_ordenes.findMany({
    include: {
      estado: true
    }
  });
  console.log('Orders with states:', JSON.stringify(orders, null, 2));

  const estados = await prisma.ord_estados_orden.findMany();
  console.log('Available states:', JSON.stringify(estados, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
