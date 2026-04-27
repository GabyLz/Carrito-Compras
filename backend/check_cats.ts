
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- CATEGORIAS ---');
  const categorias = await prisma.cat_categorias.findMany();
  console.log(JSON.stringify(categorias, null, 2));

  console.log('\n--- MARCAS ---');
  const marcas = await prisma.cat_marcas.findMany();
  console.log(JSON.stringify(marcas, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
