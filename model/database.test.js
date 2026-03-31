// ============================================
// 🏸 BaBadminton — Unit Tests for database.js
// Testing database initialization & connection
// ============================================

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockGetConnection = jest.fn();

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => ({
    query: mockQuery,
    getConnection: mockGetConnection
  }))
}));

// Set env before requiring
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'babadminton';

const { pool, initDatabase } = require('./database');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Database Pool', () => {
  test('DB-01: ควร export pool object', () => {
    expect(pool).toBeDefined();
    expect(pool.query).toBeDefined();
    expect(pool.getConnection).toBeDefined();
  });

  test('DB-02: ควร export initDatabase function', () => {
    expect(initDatabase).toBeDefined();
    expect(typeof initDatabase).toBe('function');
  });
});

describe('initDatabase', () => {
  test('DB-03: ควร initialize database สำเร็จเมื่อ tables ว่าง (seed data)', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([]) // CREATE users
        .mockResolvedValueOnce([]) // CREATE courts
        .mockResolvedValueOnce([]) // CREATE bookings
        .mockResolvedValueOnce([[{ count: 0 }]]) // users count = 0
        .mockResolvedValueOnce([]) // INSERT users
        .mockResolvedValueOnce([[{ count: 0 }]]) // courts count = 0
        .mockResolvedValueOnce([]), // INSERT courts
      release: mockRelease
    };
    mockGetConnection.mockResolvedValueOnce(mockConn);

    const result = await initDatabase();
    expect(result).toBe(true);
    expect(mockConn.query).toHaveBeenCalledTimes(7);
    expect(mockRelease).toHaveBeenCalled();
  });

  test('DB-04: ควร initialize database สำเร็จเมื่อมี data อยู่แล้ว (ไม่ seed)', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([]) // CREATE users
        .mockResolvedValueOnce([]) // CREATE courts
        .mockResolvedValueOnce([]) // CREATE bookings
        .mockResolvedValueOnce([[{ count: 3 }]]) // users count > 0
        .mockResolvedValueOnce([[{ count: 6 }]]), // courts count > 0
      release: mockRelease
    };
    mockGetConnection.mockResolvedValueOnce(mockConn);

    const result = await initDatabase();
    expect(result).toBe(true);
    // Should NOT seed data (only 5 calls: 3 CREATE + 2 COUNT)
    expect(mockConn.query).toHaveBeenCalledTimes(5);
  });

  test('DB-05: ควร return false เมื่อ database connection ล้มเหลว', async () => {
    mockGetConnection.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await initDatabase();
    expect(result).toBe(false);
  });

  test('DB-06: ควร create users table ด้วย schema ที่ถูกต้อง', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[{ count: 1 }]])
        .mockResolvedValueOnce([[{ count: 1 }]]),
      release: mockRelease
    };
    mockGetConnection.mockResolvedValueOnce(mockConn);

    await initDatabase();
    const firstQuery = mockConn.query.mock.calls[0][0];
    expect(firstQuery).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(firstQuery).toContain('username VARCHAR(100)');
    expect(firstQuery).toContain('role ENUM');
  });

  test('DB-07: ควร create courts table ด้วย schema ที่ถูกต้อง', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[{ count: 1 }]])
        .mockResolvedValueOnce([[{ count: 1 }]]),
      release: mockRelease
    };
    mockGetConnection.mockResolvedValueOnce(mockConn);

    await initDatabase();
    const secondQuery = mockConn.query.mock.calls[1][0];
    expect(secondQuery).toContain('CREATE TABLE IF NOT EXISTS courts');
    expect(secondQuery).toContain('court_type ENUM');
    expect(secondQuery).toContain('price_per_hour');
  });

  test('DB-08: ควร create bookings table ด้วย schema ที่ถูกต้อง', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[{ count: 1 }]])
        .mockResolvedValueOnce([[{ count: 1 }]]),
      release: mockRelease
    };
    mockGetConnection.mockResolvedValueOnce(mockConn);

    await initDatabase();
    const thirdQuery = mockConn.query.mock.calls[2][0];
    expect(thirdQuery).toContain('CREATE TABLE IF NOT EXISTS bookings');
    expect(thirdQuery).toContain('court_id');
    expect(thirdQuery).toContain('booking_date');
    expect(thirdQuery).toContain('status ENUM');
  });
});
