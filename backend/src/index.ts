import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Conectado a PostgreSQL');
    app.listen(config.port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
}

main();