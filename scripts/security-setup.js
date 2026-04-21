#!/usr/bin/env node
/**
 * 🔐 BaBadminton - Security Setup Script
 * 
 * This script:
 * 1. Hashes all existing plain-text passwords
 * 2. Adds password_hash column to users table
 * 3. Validates password policy
 * 
 * Usage: node scripts/security-setup.js
 */

require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

async function main() {
  console.log('🏸 ═══════════════════════════════════════');
  console.log('   BaBadminton - Security Setup');
  console.log('═══════════════════════════════════════════\n');

  // Validate environment
  if (!process.env.DB_PASSWORD) {
    console.error('❌ Error: DB_PASSWORD not set in .env');
    process.exit(1);
  }

  let connection;

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'babadminton'
    });

    console.log('✅ Connected to database\n');

    // Check if password_hash column exists
    console.log('🔍 Checking database schema...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'password_hash'
    `, [process.env.DB_NAME || 'babadminton']);

    if (columns.length === 0) {
      console.log('📝 Adding password_hash column...');
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN password_hash VARCHAR(255) NULL
      `);
      console.log('✅ password_hash column added\n');
    } else {
      console.log('✅ password_hash column already exists\n');
    }

    // Get all users with plain-text passwords
    console.log('🔍 Finding users with plain-text passwords...');
    const [users] = await connection.query(`
      SELECT id, email, password, password_hash
      FROM users
      WHERE password IS NOT NULL
      AND (password_hash IS NULL OR password_hash = '')
    `);

    if (users.length === 0) {
      console.log('✅ All users already have hashed passwords\n');
    } else {
      console.log(`⚠️  Found ${users.length} user(s) with plain-text passwords\n`);
      
      // Hash passwords
      console.log('🔐 Hashing passwords...');
      for (const user of users) {
        console.log(`  - Hashing password for ${user.email}...`);
        
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        
        await connection.query(`
          UPDATE users 
          SET password_hash = ?
          WHERE id = ?
        `, [hashedPassword, user.id]);
        
        console.log(`    ✅ Hashed successfully`);
      }
      console.log('✅ All passwords hashed\n');
    }

    // Optional: Remove plain-text password column (commented out for safety)
    // Uncomment only after verifying all passwords are hashed and working
    /*
    console.log('🗑️  Removing plain-text password column...');
    await connection.query('ALTER TABLE users DROP COLUMN password');
    console.log('✅ password column removed\n');
    */

    // Verify password policy
    console.log('📋 Password Policy Recommendations:');
    console.log('  • Minimum 8 characters');
    console.log('  • At least 1 uppercase letter');
    console.log('  • At least 1 lowercase letter');
    console.log('  • At least 1 number');
    console.log('  • At least 1 special character\n');

    console.log('═══════════════════════════════════════════');
    console.log('✅ Security setup complete!');
    console.log('═══════════════════════════════════════════\n');

    console.log('⚠️  IMPORTANT NEXT STEPS:');
    console.log('  1. Test login functionality');
    console.log('  2. Update authController.js to use password_hash instead of password');
    console.log('  3. Add password validation on registration');
    console.log('  4. Consider removing the plain-text password column after testing\n');

  } catch (error) {
    console.error('\n❌ Error during security setup:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
