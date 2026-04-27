
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- USUARIOS Y ROLES ---');
  const usuarios = await prisma.seg_usuarios.findMany({
    include: {
      roles: {
        include: {
          rol: true
        }
      }
    }
  });
  
  usuarios.forEach(u => {
    console.log(`User: ${u.email}, Roles: ${u.roles.map(r => r.rol.nombre).join(', ')}`);
  });

  console.log('\n--- ROLES DISPONIBLES ---');
  const roles = await prisma.seg_roles.findMany();
  console.log(JSON.stringify(roles, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
