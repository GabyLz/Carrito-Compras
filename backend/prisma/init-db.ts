
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const sqlFilePath = path.join(__dirname, '../../sql/create_database.sql');

async function initDb() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default postgres db first
    password: '123456',
    port: 5432,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Create database if not exists
    try {
      await client.query('CREATE DATABASE ecommerce_db');
      console.log('Database ecommerce_db created');
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log('Database ecommerce_db already exists');
      } else {
        throw err;
      }
    }
    await client.end();

    // Connect to the new database
    const dbClient = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'ecommerce_db',
      password: '123456',
      port: 5432,
    });

    await dbClient.connect();
    console.log('Connected to ecommerce_db');

    // Clean public schema to ensure a fresh start
    await dbClient.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Public schema cleaned');

    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL by semicolons, but be careful with functions/triggers
    // For simplicity, we can try to run the whole thing, or split by a more robust way
    // The script provided seems to be standard SQL.
    
    // Some psql specific commands like \connect need to be removed
    // Also remove the CREATE DATABASE part as we already did that
    const cleanSql = sql
      .replace(/CREATE DATABASE[\s\S]*?OWNER = postgres;/g, '')
      .replace(/\\connect ecommerce_db;/g, '');

    await dbClient.query(cleanSql);
    console.log('SQL script executed successfully');

    await dbClient.end();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDb();
