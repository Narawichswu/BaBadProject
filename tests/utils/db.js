require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'babadminton',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function removeTestCourt(courtName) {
  try {
    const conn = await pool.getConnection();
    // First remove any test bookings associated with this court
    await conn.query(`
      DELETE b FROM bookings b 
      JOIN courts c ON b.court_id = c.id 
      WHERE c.name = ?
    `, [courtName]);
    await conn.query('DELETE FROM courts WHERE name = ?', [courtName]);
    conn.release();
  } catch (err) {
    console.error('Error removing test court:', err);
  }
}

async function removeTestBooking(userId, date) {
  try {
    const conn = await pool.getConnection();
    await conn.query('DELETE FROM bookings WHERE user_id = ? AND booking_date = ?', [userId, date]);
    conn.release();
  } catch(err) {
    console.error('Error removing test booking:', err);
  }
}

async function disconnectDb() {
  await pool.end();
}

module.exports = { removeTestCourt, removeTestBooking, disconnectDb };
