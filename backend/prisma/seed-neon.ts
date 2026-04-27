import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no está definida');
  }

  const sqlFilePath = path.join(__dirname, '../../sql/create_database.sql');
  const sql = fs.readFileSync(sqlFilePath, 'utf8').replace(/\r\n/g, '\n');
  const seedMarker = '-- ============================================================\n-- DATOS SEMILLA';
  const seedStart = sql.indexOf(seedMarker);

  if (seedStart === -1) {
    throw new Error('No se encontró la sección de datos semilla en create_database.sql');
  }

  const cleanSql = sql.slice(seedStart);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos remota');
    await client.query(cleanSql);
    console.log('✅ SQL base cargado correctamente');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Error cargando la base de datos:', error);
  process.exit(1);
});