
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ESTADOS DE ORDEN ---');
  const estados = await prisma.ord_estados_orden.findMany();
  console.log(JSON.stringify(estados, null, 2));

  console.log('\n--- ORDENES ---');
  const ordenes = await prisma.ord_ordenes.findMany({
    include: {
      estado: true
    }
  });
  console.log(JSON.stringify(ordenes, null, 2));

  console.log('\n--- PRODUCTOS ---');
  const totalProductos = await prisma.cat_productos.count();
  const productosActivos = await prisma.cat_productos.count({ where: { estado_producto: 'activo' } });
  console.log(`Total: ${totalProductos}, Activos: ${productosActivos}`);

  console.log('\n--- STOCK ---');
  const totalStock = await prisma.inv_stock_producto.count();
  console.log(`Registros de stock: ${totalStock}`);

  console.log('\n--- USUARIOS ---');
  const totalUsuarios = await prisma.seg_usuarios.count();
  console.log(`Total usuarios: ${totalUsuarios}`);

  console.log('\n--- CLIENTES ---');
  const totalClientes = await prisma.cli_clientes.count();
  console.log(`Total clientes: ${totalClientes}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
