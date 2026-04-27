
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING STOCK ---');
  
  // 1. Ensure an warehouse exists
  let almacen = await prisma.inv_almacenes.findFirst();
  if (!almacen) {
    almacen = await prisma.inv_almacenes.create({
      data: {
        nombre: 'Almacén Central',
        ubicacion: 'Sede Principal'
      }
    });
    console.log('Created warehouse:', almacen.nombre);
  } else {
    console.log('Using existing warehouse:', almacen.nombre);
  }

  // 2. Get all active products
  const productos = await prisma.cat_productos.findMany({
    where: { estado_producto: 'activo' }
  });
  console.log(`Found ${productos.length} active products`);

  // 3. Seed stock for each product if it doesn't exist
  for (const p of productos) {
    const existingStock = await prisma.inv_stock_producto.findFirst({
      where: { id_producto: p.id, id_almacen: almacen.id }
    });

    if (!existingStock) {
      const cantidad = Math.floor(Math.random() * 50) + 10; // Random stock between 10 and 60
      await prisma.inv_stock_producto.create({
        data: {
          id_producto: p.id,
          id_almacen: almacen.id,
          cantidad: cantidad
        }
      });
      
      // Update stock_general in cat_productos
      await prisma.cat_productos.update({
        where: { id: p.id },
        data: { stock_general: cantidad }
      });
      
      console.log(`Seeded ${cantidad} units for product: ${p.nombre}`);
    } else if (existingStock.cantidad === 0) {
      const cantidad = 25;
      await prisma.inv_stock_producto.update({
        where: { id: existingStock.id },
        data: { cantidad: cantidad }
      });
      await prisma.cat_productos.update({
        where: { id: p.id },
        data: { stock_general: cantidad }
      });
      console.log(`Updated 0 stock to ${cantidad} for product: ${p.nombre}`);
    }
  }

  console.log('Stock seeding completed.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
