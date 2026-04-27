import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Roles
  const roleNames = ['ADMIN', 'GERENTE_VENTAS', 'GERENTE_INVENTARIO', 'VENDEDOR', 'CLIENTE'];
  const rolesByName: Record<string, { id: number; nombre: string }> = {};
  for (const roleName of roleNames) {
    const rol = await prisma.seg_roles.upsert({
      where: { nombre: roleName },
      update: {},
      create: { nombre: roleName },
    });
    rolesByName[roleName] = { id: rol.id, nombre: rol.nombre };
  }

  // Estados de orden requeridos
  const estados = ['pendiente_pago', 'pagada', 'en_proceso', 'enviada', 'entregada', 'cancelada', 'devuelta'];
  for (const nombre of estados) {
    await prisma.ord_estados_orden.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // Metodos base
  await prisma.ord_metodos_envio.upsert({
    where: { nombre: 'Envio estandar' },
    update: {},
    create: { nombre: 'Envio estandar', costo: 18, tiempo_estimado: '2-4 dias' },
  });

  await prisma.ord_metodos_pago.upsert({
    where: { nombre: 'Tarjeta' },
    update: { activo: true },
    create: { nombre: 'Tarjeta', activo: true },
  });

  await prisma.ord_metodos_pago.upsert({
    where: { nombre: 'Transferencia' },
    update: { activo: true },
    create: { nombre: 'Transferencia', activo: true },
  });

  // Categorías
  const cat1 = await prisma.cat_categorias.upsert({
    where: { nombre: 'Electrónica' },
    update: {},
    create: { nombre: 'Electrónica', descripcion: 'Gadgets y más' }
  });

  // Productos
  const prod1 = await prisma.cat_productos.findUnique({
    where: { sku: 'PROD-001' }
  });

  if (!prod1) {
    await prisma.cat_productos.create({
      data: {
        sku: 'PROD-001',
        nombre: 'Smartphone XYZ',
        descripcion_corta: 'El mejor smartphone',
        precio_costo: 300,
        precio_venta: 599.99,
        stock_general: 50,
        id_categoria: cat1.id
      }
    });
  }

  // Usuarios de prueba
  const passwordPlano = 'Demo123456!';
  const hash = await bcrypt.hash(passwordPlano, 10);

  const createUserWithRole = async (params: {
    email: string;
    nombre: string;
    apellido: string;
    roleName: keyof typeof rolesByName;
  }) => {
    const cli = await prisma.cli_clientes.upsert({
      where: { email: params.email },
      update: { nombre: params.nombre, apellido: params.apellido, activo: true },
      create: { email: params.email, nombre: params.nombre, apellido: params.apellido, activo: true },
    });

    const user = await prisma.seg_usuarios.upsert({
      where: { email: params.email },
      update: { password_hash: hash, id_cliente: cli.id, activo: true },
      create: { email: params.email, password_hash: hash, id_cliente: cli.id, activo: true },
    });

    await prisma.seg_usuario_rol.upsert({
      where: { id_usuario_id_rol: { id_usuario: user.id, id_rol: rolesByName[params.roleName].id } },
      update: {},
      create: { id_usuario: user.id, id_rol: rolesByName[params.roleName].id },
    });
  };

  await createUserWithRole({ email: 'cliente.demo@tienda.local', nombre: 'Cliente', apellido: 'Demo', roleName: 'CLIENTE' });
  await createUserWithRole({ email: 'admin.demo@tienda.local', nombre: 'Admin', apellido: 'Demo', roleName: 'ADMIN' });
  await createUserWithRole({ email: 'ventas.demo@tienda.local', nombre: 'Gerente', apellido: 'Ventas', roleName: 'GERENTE_VENTAS' });
  await createUserWithRole({ email: 'inventario.demo@tienda.local', nombre: 'Gerente', apellido: 'Inventario', roleName: 'GERENTE_INVENTARIO' });
  await createUserWithRole({ email: 'vendedor.demo@tienda.local', nombre: 'Vendedor', apellido: 'Demo', roleName: 'VENDEDOR' });

  console.log('✅ Seed completado');
  console.log('Usuarios demo:');
  console.log(' - cliente.demo@tienda.local / Demo123456!');
  console.log(' - admin.demo@tienda.local / Demo123456!');
  console.log(' - ventas.demo@tienda.local / Demo123456!');
  console.log(' - inventario.demo@tienda.local / Demo123456!');
  console.log(' - vendedor.demo@tienda.local / Demo123456!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
