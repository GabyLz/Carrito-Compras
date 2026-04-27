
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('password123', 12);
  await prisma.seg_usuarios.update({
    where: { email: 'admin@ecommerce.com' },
    data: { password_hash: hashed }
  });
  console.log('Password for admin@ecommerce.com reset to password123');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
