/**
 * Migration 001: Add password hashing support
 * 
 * This migration:
 * 1. Adds password_hash column to users table
 * 2. Migrates existing plain-text passwords to bcrypt hashes
 * 
 * Run with: node migrate.js up
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

exports.up = async (connection) => {
  console.log('Running migration 001: Add password hash support');

  // Check if password_hash column exists
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'password_hash'
  `);

  if (columns.length > 0) {
    console.log('  ⚠️  password_hash column already exists, skipping');
    return;
  }

  console.log('  📝 Adding password_hash column...');
  await connection.query(`
    ALTER TABLE users 
    ADD COLUMN password_hash VARCHAR(255) NULL
  `);
  console.log('  ✅ password_hash column added');

  // Migrate existing passwords
  console.log('  🔐 Migrating existing passwords...');
  const [users] = await connection.query(`
    SELECT id, email, password
    FROM users
    WHERE password IS NOT NULL AND password != ''
  `);

  let migrated = 0;
  for (const user of users) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      await connection.query(`
        UPDATE users 
        SET password_hash = ?
        WHERE id = ?
      `, [hashedPassword, user.id]);
      migrated++;
      console.log(`    ✓ Migrated: ${user.email}`);
    } catch (error) {
      console.error(`    ✗ Failed to migrate ${user.email}: ${error.message}`);
    }
  }

  console.log(`  ✅ Migrated ${migrated}/${users.length} users`);
};

exports.down = async (connection) => {
  console.log('Rolling back migration 001: Remove password hash support');

  // Check if password_hash column exists
  const [columns] = await connection.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'password_hash'
  `);

  if (columns.length === 0) {
    console.log('  ⚠️  password_hash column does not exist, skipping rollback');
    return;
  }

  console.log('  🗑️  Dropping password_hash column...');
  await connection.query('ALTER TABLE users DROP COLUMN password_hash');
  console.log('  ✅ password_hash column dropped');
};
