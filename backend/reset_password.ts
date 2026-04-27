
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Demo123456!';
  const hashed = await bcrypt.hash(password, 12);
  const emails = [
    'admin@ecommerce.com',
    'admin.demo@tienda.local',
    'ventas.demo@tienda.local',
    'inventario.demo@tienda.local',
    'vendedor.demo@tienda.local',
    'cliente.demo@tienda.local',
    'demo@example.com',
  ];

  for (const email of emails) {
    await prisma.seg_usuarios.upsert({
      where: { email },
      update: { password_hash: hashed },
      create: {
        email,
        password_hash: hashed,
        activo: true,
      },
    });
  }

  console.log(`Password reset to ${password} for demo accounts`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
