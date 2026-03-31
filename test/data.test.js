// ============================================
// 🏸 BaBadminton — Unit Tests: Data Model
// Tests for model/data.js (15 test cases)
// Uses mocked MySQL pool
// ============================================

// ── Mock MySQL pool ──
const mockQuery = jest.fn();
jest.mock('../model/database', () => ({
  pool: { query: mockQuery },
  initDatabase: jest.fn()
}));

const data = require('../model/data');

// ── Reset mocks before each test ──
beforeEach(() => {
  mockQuery.mockReset();
});

// ═══════════════════════════════════════════
// Test Suite 1: User Management
// ═══════════════════════════════════════════

describe('User Management', () => {

  // TC-01: findUser with valid credentials
  test('TC-01: findUser should return user for valid credentials', async () => {
    const mockUser = { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@test.com' };
    mockQuery.mockResolvedValueOnce([[mockUser]]);

    const result = await data.findUser('admin', 'admin123');

    expect(result).toEqual(mockUser);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      ['admin', 'admin123']
    );
  });

  // TC-02: findUser with invalid credentials
  test('TC-02: findUser should return null for invalid credentials', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const result = await data.findUser('admin', 'wrongpassword');

    expect(result).toBeNull();
  });

  // TC-03: findUserById with existing user
  test('TC-03: findUserById should return user when found', async () => {
    const mockUser = { id: 2, username: 'user1', role: 'user' };
    mockQuery.mockResolvedValueOnce([[mockUser]]);

    const result = await data.findUserById(2);

    expect(result).toEqual(mockUser);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [2]);
  });

  // TC-04: findUserById with non-existing user
  test('TC-04: findUserById should return null for non-existing user', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const result = await data.findUserById(999);

    expect(result).toBeNull();
  });

  // TC-05: getUsers should return all users
  test('TC-05: getUsers should return array of all users', async () => {
    const mockUsers = [
      { id: 1, username: 'admin', role: 'admin' },
      { id: 2, username: 'user1', role: 'user' },
      { id: 3, username: 'user2', role: 'user' }
    ];
    mockQuery.mockResolvedValueOnce([mockUsers]);

    const result = await data.getUsers();

    expect(result).toHaveLength(3);
    expect(result[0].username).toBe('admin');
    expect(result[2].username).toBe('user2');
  });

  // TC-06: findOrCreateGoogleUser — existing user
  test('TC-06: findOrCreateGoogleUser should return existing user', async () => {
    const existingUser = { id: 5, username: 'Google User', email: 'guser@gmail.com', role: 'user' };
    mockQuery.mockResolvedValueOnce([[existingUser]]);

    const profile = {
      displayName: 'Google User',
      emails: [{ value: 'guser@gmail.com' }],
      photos: [{ value: 'http://photo.url' }]
    };

    const result = await data.findOrCreateGoogleUser(profile);

    expect(result).toEqual(existingUser);
    expect(mockQuery).toHaveBeenCalledTimes(1); // only SELECT, no INSERT
  });

  // TC-07: findOrCreateGoogleUser — new user
  test('TC-07: findOrCreateGoogleUser should create new user if not found', async () => {
    mockQuery
      .mockResolvedValueOnce([[]]) // SELECT returns empty
      .mockResolvedValueOnce([{ insertId: 10 }]); // INSERT returns new id

    const profile = {
      displayName: 'New User',
      emails: [{ value: 'new@gmail.com' }],
      photos: [{ value: 'http://photo.url' }]
    };

    const result = await data.findOrCreateGoogleUser(profile);

    expect(result.id).toBe(10);
    expect(result.username).toBe('New User');
    expect(result.role).toBe('user');
    expect(mockQuery).toHaveBeenCalledTimes(2); // SELECT + INSERT
  });
});

// ═══════════════════════════════════════════
// Test Suite 2: Court Management
// ═══════════════════════════════════════════

describe('Court Management', () => {

  // TC-08: getCourts should return all courts mapped correctly
  test('TC-08: getCourts should return mapped court objects', async () => {
    const dbRows = [
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '💡 ไฟ,❄️ แอร์', description: 'Test' },
      { id: 2, name: 'สนาม B', court_type: 'single', surface: 'wooden', price_per_hour: 150, facilities: '💡 ไฟ', description: 'Test2' }
    ];
    mockQuery.mockResolvedValueOnce([dbRows]);

    const courts = await data.getCourts();

    expect(courts).toHaveLength(2);
    expect(courts[0].courtType).toBe('double');    // mapped from court_type
    expect(courts[0].pricePerHour).toBe(200);      // mapped from price_per_hour
    expect(courts[0].facilities).toEqual(['💡 ไฟ', '❄️ แอร์']); // parsed from string
    expect(courts[1].courtType).toBe('single');
  });

  // TC-09: getCourtById — existing court
  test('TC-09: getCourtById should return mapped court when found', async () => {
    const dbRow = { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '💡 ไฟ', description: 'Test' };
    mockQuery.mockResolvedValueOnce([[dbRow]]);

    const court = await data.getCourtById(1);

    expect(court.id).toBe(1);
    expect(court.name).toBe('สนาม A');
    expect(court.courtType).toBe('double');
  });

  // TC-10: getCourtById — non-existing court
  test('TC-10: getCourtById should return null for non-existing court', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const court = await data.getCourtById(999);

    expect(court).toBeNull();
  });

  // TC-11: addCourt should insert and return court data
  test('TC-11: addCourt should create a new court', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 7 }]);

    const courtData = {
      name: 'สนาม G',
      courtType: 'single',
      surface: 'cement',
      pricePerHour: 100,
      facilities: ['💡 ไฟ', '🅿️ ที่จอดรถ'],
      description: 'สนามใหม่'
    };

    const result = await data.addCourt(courtData);

    expect(result.id).toBe(7);
    expect(result.name).toBe('สนาม G');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO courts'),
      ['สนาม G', 'single', 'cement', 100, '💡 ไฟ,🅿️ ที่จอดรถ', 'สนามใหม่']
    );
  });
});

// ═══════════════════════════════════════════
// Test Suite 3: Booking Management
// ═══════════════════════════════════════════

describe('Booking Management', () => {

  // TC-12: addBooking should create booking with pending status
  test('TC-12: addBooking should create a new pending booking', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }]);

    const booking = await data.addBooking(1, '2026-04-01', '10:00', '12:00', 2);

    expect(booking.id).toBe(1);
    expect(booking.courtId).toBe(1);
    expect(booking.status).toBe('pending');
    expect(booking.userId).toBe(2);
  });

  // TC-13: hasConflictingBooking — no conflict
  test('TC-13: hasConflictingBooking should return false when no conflict', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 0 }]]);

    const result = await data.hasConflictingBooking(1, '2026-04-01', '10:00', '12:00');

    expect(result).toBe(false);
  });

  // TC-14: hasConflictingBooking — with conflict
  test('TC-14: hasConflictingBooking should return true when conflict exists', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 1 }]]);

    const result = await data.hasConflictingBooking(1, '2026-04-01', '10:00', '12:00');

    expect(result).toBe(true);
  });

  // TC-15: approveBooking should change status to approved
  test('TC-15: approveBooking should update status and return booking', async () => {
    const updatedRow = { id: 1, court_id: 1, booking_date: '2026-04-01', start_time: '10:00', end_time: '12:00', user_id: 2, status: 'approved', created_at: new Date() };
    mockQuery
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // UPDATE
      .mockResolvedValueOnce([[updatedRow]]);          // SELECT

    const result = await data.approveBooking(1);

    expect(result.status).toBe('approved');
    expect(result.courtId).toBe(1);
  });

  // TC-16: removeBooking should delete and return the booking
  test('TC-16: removeBooking should delete booking and return it', async () => {
    const bookingRow = { id: 5, court_id: 2, booking_date: '2026-04-01', start_time: '14:00', end_time: '16:00', user_id: 3, status: 'pending', created_at: new Date() };
    mockQuery
      .mockResolvedValueOnce([[bookingRow]]) // SELECT
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

    const result = await data.removeBooking(5);

    expect(result.id).toBe(5);
    expect(result.courtId).toBe(2);
  });

  // TC-17: getBookings should return all bookings mapped
  test('TC-17: getBookings should return all mapped bookings', async () => {
    const dbRows = [
      { id: 1, court_id: 1, booking_date: new Date('2026-04-01'), start_time: '10:00', end_time: '12:00', user_id: 2, status: 'pending', created_at: new Date() },
      { id: 2, court_id: 3, booking_date: '2026-04-02', start_time: '14:00', end_time: '16:00', user_id: 3, status: 'approved', created_at: new Date() }
    ];
    mockQuery.mockResolvedValueOnce([dbRows]);

    const bookings = await data.getBookings();

    expect(bookings).toHaveLength(2);
    expect(bookings[0].courtId).toBe(1);   // mapped from court_id
    expect(bookings[0].date).toBe('2026-04-01'); // mapped from booking_date
    expect(bookings[1].status).toBe('approved');
  });

  // TC-18: isCourtAvailable — court is available
  test('TC-18: isCourtAvailable should return true when court has no bookings', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 0 }]]);

    const result = await data.isCourtAvailable(1, '2026-04-05', '08:00', '10:00');

    expect(result).toBe(true);
  });

  // TC-19: isCourtAvailable — court is not available
  test('TC-19: isCourtAvailable should return false when court is booked', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 1 }]]);

    const result = await data.isCourtAvailable(1, '2026-04-05', '08:00', '10:00');

    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════
// Test Suite 4: Search
// ═══════════════════════════════════════════

describe('Search', () => {

  // TC-20: searchAvailableCourts should return courts with availability
  test('TC-20: searchAvailableCourts should return courts with availability status', async () => {
    const courtRows = [
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '💡', description: 'A' },
      { id: 2, name: 'สนาม B', court_type: 'single', surface: 'wooden', price_per_hour: 150, facilities: '', description: 'B' }
    ];

    mockQuery
      .mockResolvedValueOnce([courtRows])      // SELECT courts
      .mockResolvedValueOnce([[]])              // court 1: no bookings (available)
      .mockResolvedValueOnce([[{ status: 'approved' }]]); // court 2: has approved booking (unavailable)

    const results = await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'all', 'all');

    expect(results).toHaveLength(2);
    expect(results[0].availability).toBe('available');
    expect(results[1].availability).toBe('unavailable');
  });
});
