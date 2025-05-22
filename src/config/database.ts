import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import config from './config';
import logger from './logger';

let db: Database | null = null;

export async function initializeDatabase(): Promise<Database> {
  if (db) {
    return db;
  }

  try {
    db = await open({
      filename: config.database.path,
      driver: sqlite3.Database,
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Create tables
    await createTables();
    
    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

async function createTables() {
  if (!db) throw new Error('Database not initialized');

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Cities table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      country TEXT DEFAULT 'UK',
      weather_com_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Weather data table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weather_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_id INTEGER NOT NULL,
      temperature REAL,
      weather_condition TEXT,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    )
  `);

  // User favorites table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      city_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, city_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
    )
  `);

  // Insert default UK cities
  const ukCities = [
    { name: 'London', code: 'UKXX0085:1:UK' },
    { name: 'Birmingham', code: 'UKXX0016:1:UK' },
    { name: 'Manchester', code: 'UKXX0095:1:UK' },
    { name: 'Glasgow', code: 'UKXX0061:1:UK' },
    { name: 'Leeds', code: 'UKXX0084:1:UK' },
  ];

  for (const city of ukCities) {
    await db.run(
      'INSERT OR IGNORE INTO cities (name, weather_com_code) VALUES (?, ?)',
      [city.name, city.code]
    );
  }

  // Insert hardcoded test users
  const testUsers = [
    { email: 'testuser@example.com', password: 'password123', name: 'Test User' },
    { email: 'demo@example.com', password: 'demo123', name: 'Demo User' },
  ];

  const bcrypt = require('bcryptjs');
  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db.run(
      'INSERT OR IGNORE INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [user.email, hashedPassword, user.name]
    );
  }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    logger.info('Database connection closed');
  }
}