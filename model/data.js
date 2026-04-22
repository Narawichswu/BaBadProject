// ============================================
// 🏸 BaBadminton — Data Model (MySQL)
// Async data layer using mysql2/promise
// ============================================

const { pool } = require('./database');
const bcrypt = require('bcrypt');

// ── Helper: Parse facilities string to array ──
function parseFacilities(facilitiesStr) {
  if (!facilitiesStr) return [];
  return facilitiesStr.split(',').map(f => f.trim()).filter(f => f);
}

// ── Helper: Map DB row to court object ──
function mapCourt(row) {
  return {
    id: row.id,
    name: row.name,
    courtType: row.court_type,
    surface: row.surface,
    pricePerHour: row.price_per_hour,
    facilities: parseFacilities(row.facilities),
    description: row.description
  };
}

// ── Helper: Map DB row to booking object ──
function mapBooking(row) {
  return {
    id: row.id,
    courtId: row.court_id,
    date: row.booking_date instanceof Date
      ? row.booking_date.toISOString().split('T')[0]
      : String(row.booking_date).split('T')[0],
    startTime: row.start_time,
    endTime: row.end_time,
    userId: row.user_id,
    status: row.status,
    createdAt: row.created_at
  };
}

module.exports = {
  // ══════════════════════════════════════
  // User Management
  // ══════════════════════════════════════

  findUser: async (username, password) => {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    
    if (user && user.password_hash) {
      const match = await bcrypt.compare(password, user.password_hash);
      if (match) return user;
    }
    
    // Fallback for plain-text (if any left)
    if (user && user.password === password) {
      return user;
    }
    
    return null;
  },

  findOrCreateGoogleUser: async (profile) => {
    const email = profile.emails[0].value;
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND role != ?',
      [email, 'admin']
    );

    if (rows.length > 0) return rows[0];

    const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
    const [result] = await pool.query(
      'INSERT INTO users (username, password, role, email, avatar) VALUES (?, NULL, ?, ?, ?)',
      [profile.displayName, 'user', email, avatar]
    );

    return {
      id: result.insertId,
      username: profile.displayName,
      password: null,
      role: 'user',
      email,
      avatar
    };
  },

  findUserById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  getUsers: async () => {
    const [rows] = await pool.query('SELECT * FROM users');
    return rows;
  },

  // ══════════════════════════════════════
  // Court Management
  // ══════════════════════════════════════

  getCourts: async () => {
    const [rows] = await pool.query('SELECT * FROM courts ORDER BY id');
    return rows.map(mapCourt);
  },

  getCourtById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM courts WHERE id = ?', [parseInt(id)]);
    return rows[0] ? mapCourt(rows[0]) : null;
  },

  addCourt: async (courtData) => {
    const facilities = Array.isArray(courtData.facilities)
      ? courtData.facilities.join(',')
      : (courtData.facilities || '');

    const [result] = await pool.query(
      'INSERT INTO courts (name, court_type, surface, price_per_hour, facilities, description) VALUES (?, ?, ?, ?, ?, ?)',
      [
        courtData.name,
        courtData.courtType || 'double',
        courtData.surface || 'synthetic',
        parseInt(courtData.pricePerHour) || 200,
        facilities,
        courtData.description || ''
      ]
    );

    return { id: result.insertId, ...courtData };
  },

  // ══════════════════════════════════════
  // Booking Management
  // ══════════════════════════════════════

  getBookings: async () => {
    const [rows] = await pool.query('SELECT * FROM bookings ORDER BY booking_date DESC, start_time');
    return rows.map(mapBooking);
  },

  getBookingById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [parseInt(id)]);
    return rows[0] ? mapBooking(rows[0]) : null;
  },

  getUserBookings: async (userId) => {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC',
      [userId]
    );
    return rows.map(mapBooking);
  },

  addBooking: async (courtId, date, startTime, endTime, userId) => {
    const [result] = await pool.query(
      'INSERT INTO bookings (court_id, booking_date, start_time, end_time, user_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [parseInt(courtId), date, startTime, endTime, userId, 'pending']
    );
    return {
      id: result.insertId,
      courtId: parseInt(courtId),
      date,
      startTime,
      endTime,
      userId,
      status: 'pending'
    };
  },

  // ══════════════════════════════════════
  // Overbooking Prevention
  // ══════════════════════════════════════

  hasConflictingBooking: async (courtId, date, startTime, endTime, excludeBookingId) => {
    let query = `
      SELECT COUNT(*) as count FROM bookings
      WHERE court_id = ? AND booking_date = ?
      AND status IN ('pending', 'approved')
      AND (
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?) OR
        (start_time <= ? AND end_time >= ?)
      )
    `;
    const params = [parseInt(courtId), date, startTime, endTime, startTime, endTime, startTime, endTime];

    if (excludeBookingId) {
      query += ' AND id != ?';
      params.push(parseInt(excludeBookingId));
    }

    const [rows] = await pool.query(query, params);
    return rows[0].count > 0;
  },

  hasApprovedBooking: async (courtId, date, startTime, endTime) => {
    const [rows] = await pool.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE court_id = ? AND booking_date = ?
      AND status IN ('pending', 'approved')
      AND (
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?) OR
        (start_time <= ? AND end_time >= ?)
      )
    `, [parseInt(courtId), date, startTime, endTime, startTime, endTime, startTime, endTime]);
    return rows[0].count > 0;
  },

  isCourtAvailable: async (courtId, date, startTime, endTime) => {
    const [rows] = await pool.query(`
      SELECT COUNT(*) as count FROM bookings
      WHERE court_id = ? AND booking_date = ?
      AND status IN ('pending', 'approved')
      AND (
        (start_time >= ? AND start_time < ?) OR
        (end_time > ? AND end_time <= ?) OR
        (start_time <= ? AND end_time >= ?)
      )
    `, [parseInt(courtId), date, startTime, endTime, startTime, endTime, startTime, endTime]);
    return rows[0].count === 0;
  },

  // ══════════════════════════════════════
  // Search with Filters
  // ══════════════════════════════════════

  searchAvailableCourts: async (date, startTime, endTime, courtType, surface) => {
    // Get filtered courts
    let courtQuery = 'SELECT * FROM courts WHERE 1=1';
    const courtParams = [];

    if (courtType && courtType !== 'all') {
      courtQuery += ' AND court_type = ?';
      courtParams.push(courtType);
    }
    if (surface && surface !== 'all') {
      courtQuery += ' AND surface = ?';
      courtParams.push(surface);
    }

    const [courts] = await pool.query(courtQuery, courtParams);

    // For each court, check availability
    const results = [];
    for (const court of courts) {
      // Check for any conflict
      const [conflictRows] = await pool.query(`
        SELECT status FROM bookings
        WHERE court_id = ? AND booking_date = ?
        AND status IN ('pending', 'approved')
        AND (
          (start_time >= ? AND start_time < ?) OR
          (end_time > ? AND end_time <= ?) OR
          (start_time <= ? AND end_time >= ?)
        )
      `, [court.id, date, startTime, endTime, startTime, endTime, startTime, endTime]);

      let availability = 'available';
      if (conflictRows.length > 0) {
        const hasApproved = conflictRows.some(r => r.status === 'approved');
        availability = hasApproved ? 'unavailable' : 'pending';
      }

      results.push({
        ...mapCourt(court),
        availability
      });
    }

    return results;
  },

  // ══════════════════════════════════════
  // Booking Actions
  // ══════════════════════════════════════

  approveBooking: async (bookingId) => {
    await pool.query('UPDATE bookings SET status = ? WHERE id = ?', ['approved', parseInt(bookingId)]);
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [parseInt(bookingId)]);
    return rows[0] ? mapBooking(rows[0]) : null;
  },

  removeBooking: async (bookingId) => {
    const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [parseInt(bookingId)]);
    const booking = rows[0] ? mapBooking(rows[0]) : null;
    await pool.query('DELETE FROM bookings WHERE id = ?', [parseInt(bookingId)]);
    return booking;
  },

  // ── Helpers ──
  getRooms: async () => {
    const [rows] = await pool.query('SELECT * FROM courts ORDER BY id');
    return rows.map(mapCourt);
  }
};
