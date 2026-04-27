
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.seg_usuarios.findMany({
    include: {
      roles: {
        include: {
          rol: true
        }
      }
    }
  });
  console.log('--- USUARIOS ---');
  usuarios.forEach(u => {
    console.log(`Email: ${u.email}, Activo: ${u.activo}, Roles: ${u.roles.map(r => r.rol.nombre).join(', ')}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
