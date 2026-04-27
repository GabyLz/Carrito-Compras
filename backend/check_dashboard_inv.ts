
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ESTADOS DE ORDEN ---');
  const estados = await prisma.ord_estados_orden.findMany();
  console.log(JSON.stringify(estados, null, 2));

  console.log('\n--- CONTEO DE STOCK ---');
  const stockCount = await prisma.inv_stock_producto.count();
  console.log(`Total registros en inv_stock_producto: ${stockCount}`);

  console.log('\n--- MUESTRA DE STOCK ---');
  const sampleStock = await prisma.inv_stock_producto.findMany({
    take: 5,
    include: {
      producto: true,
      almacen: true
    }
  });
  console.log(JSON.stringify(sampleStock, null, 2));

  console.log('\n--- ORDENES Y SUS ESTADOS ---');
  const ordenes = await prisma.ord_ordenes.findMany({
    include: {
      estado: true
    }
  });
  ordenes.forEach(o => {
    console.log(`Orden #${o.id}: Total=${o.total}, Estado=${o.estado.nombre} (ID=${o.id_estado})`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
