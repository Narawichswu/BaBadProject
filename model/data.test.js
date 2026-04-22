// ============================================
// 🏸 BaBadminton — Unit Tests for data.js
// Testing data structure (model layer)
// ============================================

// Mock mysql2/promise before requiring data.js
const mockQuery = jest.fn();
const mockGetConnection = jest.fn();
const mockRelease = jest.fn();

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    query: mockQuery,
    getConnection: mockGetConnection
  }))
}));

const data = require('./data');

// ── Helper: Reset mocks before each test ──
beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════
// TEST GROUP 1: parseFacilities Helper Function
// ══════════════════════════════════════════════════
describe('parseFacilities (internal helper)', () => {
  // เราทดสอบผ่าน getCourts ที่ใช้ mapCourt → parseFacilities

  test('TC-01: ควร parse facilities string เป็น array ได้ถูกต้อง', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic',
      price_per_hour: 200, facilities: '💡 ไฟ,❄️ แอร์,🅿️ ที่จอดรถ',
      description: 'สนามทดสอบ'
    }]]);

    const courts = await data.getCourts();
    expect(courts[0].facilities).toEqual(['💡 ไฟ', '❄️ แอร์', '🅿️ ที่จอดรถ']);
    expect(courts[0].facilities).toHaveLength(3);
  });

  test('TC-02: ควร return array ว่างเมื่อ facilities เป็น null', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 2, name: 'สนาม B', court_type: 'single', surface: 'wooden',
      price_per_hour: 150, facilities: null, description: ''
    }]]);

    const courts = await data.getCourts();
    expect(courts[0].facilities).toEqual([]);
  });

  test('TC-03: ควร return array ว่างเมื่อ facilities เป็น empty string', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 3, name: 'สนาม C', court_type: 'single', surface: 'cement',
      price_per_hour: 100, facilities: '', description: ''
    }]]);

    const courts = await data.getCourts();
    expect(courts[0].facilities).toEqual([]);
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 2: User Management
// ══════════════════════════════════════════════════
describe('User Management', () => {
  test('TC-04: findUser — ควร return user เมื่อ username/password ถูกต้อง', async () => {
    const mockUser = { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@test.com' };
    mockQuery.mockResolvedValueOnce([[mockUser]]);

    const result = await data.findUser('admin', 'admin123');
    expect(result).toEqual(mockUser);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );
  });

  test('TC-05: findUser — ควร return null เมื่อ username/password ไม่ถูกต้อง', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const result = await data.findUser('admin', 'wrongpass');
    expect(result).toBeNull();
  });

  test('TC-06: findUserById — ควร return user ตาม id ที่ระบุ', async () => {
    const mockUser = { id: 1, username: 'admin', role: 'admin' };
    mockQuery.mockResolvedValueOnce([[mockUser]]);

    const result = await data.findUserById(1);
    expect(result).toEqual(mockUser);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
  });

  test('TC-07: findUserById — ควร return null เมื่อไม่พบ user', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const result = await data.findUserById(999);
    expect(result).toBeNull();
  });

  test('TC-08: getUsers — ควร return รายชื่อ users ทั้งหมด', async () => {
    const mockUsers = [
      { id: 1, username: 'admin' },
      { id: 2, username: 'user1' }
    ];
    mockQuery.mockResolvedValueOnce([mockUsers]);

    const result = await data.getUsers();
    expect(result).toHaveLength(2);
    expect(result[0].username).toBe('admin');
  });

  test('TC-09: findOrCreateGoogleUser — ควร return existing user ถ้ามีอยู่แล้ว', async () => {
    const existingUser = { id: 5, username: 'Google User', email: 'google@test.com', role: 'user' };
    mockQuery.mockResolvedValueOnce([[existingUser]]);

    const profile = {
      displayName: 'Google User',
      emails: [{ value: 'google@test.com' }],
      photos: [{ value: 'https://photo.url' }]
    };

    const result = await data.findOrCreateGoogleUser(profile);
    expect(result).toEqual(existingUser);
  });

  test('TC-10: findOrCreateGoogleUser — ควร create user ใหม่ถ้ายังไม่มี', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no existing user
    mockQuery.mockResolvedValueOnce([{ insertId: 10 }]); // insert result

    const profile = {
      displayName: 'New User',
      emails: [{ value: 'new@test.com' }],
      photos: [{ value: 'https://avatar.url' }]
    };

    const result = await data.findOrCreateGoogleUser(profile);
    expect(result.id).toBe(10);
    expect(result.username).toBe('New User');
    expect(result.role).toBe('user');
    expect(result.email).toBe('new@test.com');
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 3: Court Management
// ══════════════════════════════════════════════════
describe('Court Management', () => {
  test('TC-11: getCourts — ควร return สนามทั้งหมดในรูปแบบ mapped object', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '💡 ไฟ', description: 'desc' },
      { id: 2, name: 'สนาม B', court_type: 'single', surface: 'wooden', price_per_hour: 150, facilities: null, description: '' }
    ]]);

    const courts = await data.getCourts();
    expect(courts).toHaveLength(2);
    expect(courts[0].courtType).toBe('double');
    expect(courts[0].pricePerHour).toBe(200);
    expect(courts[1].courtType).toBe('single');
  });

  test('TC-12: getCourtById — ควร return สนามตาม id', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic',
      price_per_hour: 200, facilities: '💡 ไฟ', description: 'desc'
    }]]);

    const court = await data.getCourtById(1);
    expect(court).not.toBeNull();
    expect(court.name).toBe('สนาม A');
    expect(court.id).toBe(1);
  });

  test('TC-13: getCourtById — ควร return null เมื่อไม่พบสนาม', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const court = await data.getCourtById(999);
    expect(court).toBeNull();
  });

  test('TC-14: addCourt — ควรเพิ่มสนามใหม่ได้สำเร็จ', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 7 }]);

    const courtData = {
      name: 'สนาม G',
      courtType: 'double',
      surface: 'synthetic',
      pricePerHour: 300,
      description: 'สนามใหม่',
      facilities: ['💡 ไฟ', '❄️ แอร์']
    };

    const result = await data.addCourt(courtData);
    expect(result.id).toBe(7);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO courts'),
      ['สนาม G', 'double', 'synthetic', 300, '💡 ไฟ,❄️ แอร์', 'สนามใหม่']
    );
  });

  test('TC-15: addCourt — ควร handle default values เมื่อไม่ระบุข้อมูลบางส่วน', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 8 }]);

    const courtData = { name: 'สนาม H' };
    const result = await data.addCourt(courtData);
    expect(result.id).toBe(8);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO courts'),
      ['สนาม H', 'double', 'synthetic', 200, '', '']
    );
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 4: Booking Management
// ══════════════════════════════════════════════════
describe('Booking Management', () => {
  test('TC-16: getBookings — ควร return booking ทั้งหมดในรูปแบบ mapped object', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, court_id: 1, booking_date: '2026-04-01', start_time: '10:00', end_time: '12:00', user_id: 1, status: 'pending', created_at: new Date() },
      { id: 2, court_id: 2, booking_date: new Date('2026-04-02'), start_time: '14:00', end_time: '16:00', user_id: 2, status: 'approved', created_at: new Date() }
    ]]);

    const bookings = await data.getBookings();
    expect(bookings).toHaveLength(2);
    expect(bookings[0].courtId).toBe(1);
    expect(bookings[0].date).toBe('2026-04-01');
    expect(bookings[1].status).toBe('approved');
  });

  test('TC-17: getBookingById — ควร return booking ตาม id', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 1, court_id: 1, booking_date: '2026-04-01',
      start_time: '10:00', end_time: '12:00', user_id: 1,
      status: 'pending', created_at: new Date()
    }]]);

    const booking = await data.getBookingById(1);
    expect(booking).not.toBeNull();
    expect(booking.courtId).toBe(1);
    expect(booking.startTime).toBe('10:00');
  });

  test('TC-18: getBookingById — ควร return null เมื่อไม่พบ booking', async () => {
    mockQuery.mockResolvedValueOnce([[]]);

    const booking = await data.getBookingById(999);
    expect(booking).toBeNull();
  });

  test('TC-19: addBooking — ควร create booking ใหม่ได้สำเร็จ', async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 5 }]);

    const result = await data.addBooking(1, '2026-04-05', '10:00', '12:00', 1);
    expect(result.id).toBe(5);
    expect(result.status).toBe('pending');
    expect(result.courtId).toBe(1);
    expect(result.date).toBe('2026-04-05');
  });

  test('TC-20: getUserBookings — ควร return booking ของ user ที่ระบุ', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, court_id: 1, booking_date: '2026-04-01', start_time: '10:00', end_time: '12:00', user_id: 2, status: 'pending', created_at: new Date() }
    ]]);

    const bookings = await data.getUserBookings(2);
    expect(bookings).toHaveLength(1);
    expect(bookings[0].userId).toBe(2);
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 5: Overbooking Prevention
// ══════════════════════════════════════════════════
describe('Overbooking Prevention', () => {
  test('TC-21: hasConflictingBooking — ควร return true เมื่อมีการจองซ้ำ', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 1 }]]);

    const result = await data.hasConflictingBooking(1, '2026-04-01', '10:00', '12:00');
    expect(result).toBe(true);
  });

  test('TC-22: hasConflictingBooking — ควร return false เมื่อไม่มีการจองซ้ำ', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 0 }]]);

    const result = await data.hasConflictingBooking(1, '2026-04-01', '10:00', '12:00');
    expect(result).toBe(false);
  });

  test('TC-23: hasConflictingBooking — ควร exclude booking id ที่ระบุ', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 0 }]]);

    await data.hasConflictingBooking(1, '2026-04-01', '10:00', '12:00', 5);
    // Verify the query includes AND id != ?
    const calledQuery = mockQuery.mock.calls[0][0];
    expect(calledQuery).toContain('id != ?');
    // Verify excludeBookingId is in params
    const params = mockQuery.mock.calls[0][1];
    expect(params).toContain(5);
  });

  test('TC-24: isCourtAvailable — ควร return true เมื่อสนามว่าง', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 0 }]]);

    const result = await data.isCourtAvailable(1, '2026-04-01', '10:00', '12:00');
    expect(result).toBe(true);
  });

  test('TC-25: isCourtAvailable — ควร return false เมื่อสนามไม่ว่าง', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 2 }]]);

    const result = await data.isCourtAvailable(1, '2026-04-01', '10:00', '12:00');
    expect(result).toBe(false);
  });

  test('TC-26: hasApprovedBooking — ควรตรวจสอบ booking ที่ approved/pending ได้', async () => {
    mockQuery.mockResolvedValueOnce([[{ count: 1 }]]);

    const result = await data.hasApprovedBooking(1, '2026-04-01', '10:00', '12:00');
    expect(result).toBe(true);
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 6: Booking Actions
// ══════════════════════════════════════════════════
describe('Booking Actions', () => {
  test('TC-27: approveBooking — ควร approve booking และ return updated booking', async () => {
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // UPDATE
    mockQuery.mockResolvedValueOnce([[{
      id: 1, court_id: 1, booking_date: '2026-04-01',
      start_time: '10:00', end_time: '12:00', user_id: 1,
      status: 'approved', created_at: new Date()
    }]]); // SELECT after update

    const result = await data.approveBooking(1);
    expect(result.status).toBe('approved');
    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE bookings SET status = ? WHERE id = ?',
      ['approved', 1]
    );
  });

  test('TC-28: removeBooking — ควร delete booking และ return deleted booking', async () => {
    mockQuery.mockResolvedValueOnce([[{
      id: 1, court_id: 1, booking_date: '2026-04-01',
      start_time: '10:00', end_time: '12:00', user_id: 1,
      status: 'pending', created_at: new Date()
    }]]); // SELECT before delete
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE

    const result = await data.removeBooking(1);
    expect(result).not.toBeNull();
    expect(result.id).toBe(1);
  });

  test('TC-29: removeBooking — ควร return null เมื่อไม่พบ booking', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // SELECT returns empty
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }]); // DELETE

    const result = await data.removeBooking(999);
    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 7: Search with Filters
// ══════════════════════════════════════════════════
describe('Search Available Courts', () => {
  test('TC-30: searchAvailableCourts — ควร return สนามที่ available', async () => {
    // Mock getCourts query
    mockQuery.mockResolvedValueOnce([[
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '💡 ไฟ', description: 'desc' }
    ]]);
    // Mock conflict check
    mockQuery.mockResolvedValueOnce([[]]); // no conflicts

    const results = await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'all', 'all');
    expect(results).toHaveLength(1);
    expect(results[0].availability).toBe('available');
  });

  test('TC-31: searchAvailableCourts — ควร return unavailable เมื่อมี approved booking', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '', description: '' }
    ]]);
    mockQuery.mockResolvedValueOnce([[{ status: 'approved' }]]); // has approved conflict

    const results = await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'all', 'all');
    expect(results[0].availability).toBe('unavailable');
  });

  test('TC-32: searchAvailableCourts — ควร return pending เมื่อมีแค่ pending booking', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '', description: '' }
    ]]);
    mockQuery.mockResolvedValueOnce([[{ status: 'pending' }]]); // has pending conflict

    const results = await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'all', 'all');
    expect(results[0].availability).toBe('pending');
  });

  test('TC-33: searchAvailableCourts — ควร filter ตาม courtType', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 3, name: 'สนาม C', court_type: 'single', surface: 'synthetic', price_per_hour: 150, facilities: '', description: '' }
    ]]);
    mockQuery.mockResolvedValueOnce([[]]);

    await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'single', 'all');
    const calledQuery = mockQuery.mock.calls[0][0];
    expect(calledQuery).toContain('court_type = ?');
  });

  test('TC-34: searchAvailableCourts — ควร filter ตาม surface', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 2, name: 'สนาม B', court_type: 'double', surface: 'wooden', price_per_hour: 250, facilities: '', description: '' }
    ]]);
    mockQuery.mockResolvedValueOnce([[]]);

    await data.searchAvailableCourts('2026-04-01', '10:00', '12:00', 'all', 'wooden');
    const calledQuery = mockQuery.mock.calls[0][0];
    expect(calledQuery).toContain('surface = ?');
  });
});

// ══════════════════════════════════════════════════
// TEST GROUP 8: getRooms alias
// ══════════════════════════════════════════════════
describe('getRooms (alias)', () => {
  test('TC-35: getRooms — ควรทำงานเหมือน getCourts', async () => {
    mockQuery.mockResolvedValueOnce([[
      { id: 1, name: 'สนาม A', court_type: 'double', surface: 'synthetic', price_per_hour: 200, facilities: '', description: '' }
    ]]);

    const rooms = await data.getRooms();
    expect(rooms).toHaveLength(1);
    expect(rooms[0].name).toBe('สนาม A');
  });
});
