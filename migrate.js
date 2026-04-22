#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Usage:
 *   node migrate.js up       - Run all pending migrations
 *   node migrate.js down     - Rollback last migration
 *   node migrate.js status   - Show migration status
 */

require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = 'migrations';

async function getDatabaseConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'babadminton',
    multipleStatements: true
  });
}

async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getExecutedMigrations(connection) {
  const [rows] = await connection.query(`
    SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id
  `);
  return rows.map(row => row.name);
}

async function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('No migrations directory found');
    return [];
  }

  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.js'))
    .sort();
}

async function runUp(connection) {
  const executed = await getExecutedMigrations(connection);
  const files = await getMigrationFiles();
  const pending = files.filter(file => !executed.includes(file));

  if (pending.length === 0) {
    console.log('✅ No pending migrations');
    return;
  }

  console.log(`📝 Running ${pending.length} migration(s)...\n`);

  for (const file of pending) {
    console.log(`▶️  Running: ${file}`);

    try {
      const migration = require(path.join(MIGRATIONS_DIR, file));

      if (typeof migration.up !== 'function') {
        throw new Error('Migration must export an up() function');
      }

      await migration.up(connection);

      await connection.query(`
        INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)
      `, [file]);

      console.log(`✅ Completed: ${file}\n`);
    } catch (error) {
      console.error(`❌ Failed: ${file}`);
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }
  }

  console.log('✅ All migrations completed successfully');
}

async function runDown(connection) {
  const executed = await getExecutedMigrations(connection);

  if (executed.length === 0) {
    console.log('✅ No migrations to rollback');
    return;
  }

  const lastMigration = executed[executed.length - 1];
  console.log(`📝 Rolling back: ${lastMigration}\n`);

  try {
    const migration = require(path.join(MIGRATIONS_DIR, lastMigration));

    if (typeof migration.down !== 'function') {
      throw new Error('Migration must export a down() function');
    }

    await migration.down(connection);

    await connection.query(`
      DELETE FROM ${MIGRATIONS_TABLE} WHERE name = ?
    `, [lastMigration]);

    console.log(`✅ Rollback completed: ${lastMigration}`);
  } catch (error) {
    console.error(`❌ Rollback failed: ${lastMigration}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

async function showStatus(connection) {
  const executed = await getExecutedMigrations(connection);
  const files = await getMigrationFiles();

  console.log('\n📊 Migration Status\n');
  console.log('Applied:');

  if (executed.length === 0) {
    console.log('  (none)');
  } else {
    for (const file of executed) {
      console.log(`  ✅ ${file}`);
    }
  }

  console.log('\nPending:');

  const pending = files.filter(file => !executed.includes(file));
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    for (const file of pending) {
      console.log(`  ⏳ ${file}`);
    }
  }

  console.log('');
}

async function main() {
  const command = process.argv[2];

  if (!['up', 'down', 'status'].includes(command)) {
    console.log('Usage: node migrate.js <command>');
    console.log('');
    console.log('Commands:');
    console.log('  up      - Run all pending migrations');
    console.log('  down    - Rollback last migration');
    console.log('  status  - Show migration status');
    process.exit(1);
  }

  let connection;

  try {
    console.log('🏸 BaBadminton - Database Migration Tool\n');
    console.log('📡 Connecting to database...');

    connection = await getDatabaseConnection();
    await ensureMigrationsTable(connection);

    console.log('✅ Connected\n');

    switch (command) {
    case 'up':
      await runUp(connection);
      break;
    case 'down':
      await runDown(connection);
      break;
    case 'status':
      await showStatus(connection);
      break;
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
