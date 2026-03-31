// ============================================
// 🏸 BaBadminton — Unit Tests: Controllers
// Tests for authController & bookingController
// ============================================

// ── Mock data module ──
jest.mock('../model/data');
const data = require('../model/data');

// ═══════════════════════════════════════════
// Test Suite: Auth Controller
// ═══════════════════════════════════════════

const authController = require('../controller/authController');

describe('Auth Controller', () => {

  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      session: {},
      params: {},
      user: null
    };
    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      locals: {}
    };
    next = jest.fn();
  });

  // TC-C01: showLogin renders login page
  test('TC-C01: showLogin should render login page with no error', () => {
    req.query = {};
    authController.showLogin(req, res);
    expect(res.render).toHaveBeenCalledWith('login', { error: null });
  });

  // TC-C02: showLogin renders login with error
  test('TC-C02: showLogin should pass error from query param', () => {
    req.query = { error: 'Something failed' };
    authController.showLogin(req, res);
    expect(res.render).toHaveBeenCalledWith('login', { error: 'Something failed' });
  });

  // TC-C03: login success
  test('TC-C03: login should redirect to dashboard on valid credentials', async () => {
    const mockUser = { id: 1, username: 'admin', email: 'a@b.com', role: 'admin', avatar: null };
    data.findUser.mockResolvedValueOnce(mockUser);
    req.body = { username: 'admin', password: 'admin123' };

    await authController.login(req, res);

    expect(req.session.user).toBeDefined();
    expect(req.session.user.username).toBe('admin');
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  // TC-C04: login failure
  test('TC-C04: login should render error on invalid credentials', async () => {
    data.findUser.mockResolvedValueOnce(null);
    req.body = { username: 'admin', password: 'wrong' };

    await authController.login(req, res);

    expect(res.render).toHaveBeenCalledWith('login', expect.objectContaining({ error: expect.any(String) }));
  });

  // TC-C05: requireAuth allows authenticated user
  test('TC-C05: requireAuth should call next() for authenticated user', () => {
    req.session = { user: { id: 1, role: 'admin' } };
    authController.requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.locals.user).toBeDefined();
  });

  // TC-C06: requireAuth blocks unauthenticated user
  test('TC-C06: requireAuth should redirect unauthenticated user to login', () => {
    req.session = {};
    authController.requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/login');
    expect(next).not.toHaveBeenCalled();
  });

  // TC-C07: requireAdmin allows admin
  test('TC-C07: requireAdmin should call next() for admin user', () => {
    req.session = { user: { id: 1, role: 'admin' } };
    authController.requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  // TC-C08: requireAdmin blocks non-admin
  test('TC-C08: requireAdmin should return 403 for non-admin user', () => {
    req.session = { user: { id: 2, role: 'user' } };
    authController.requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // TC-C09: googleCallback success
  test('TC-C09: googleCallback should redirect to dashboard on success', () => {
    req.user = { id: 5, username: 'GUser', email: 'g@g.com', role: 'user', avatar: 'http://pic' };
    authController.googleCallback(req, res);
    expect(req.session.user.username).toBe('GUser');
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });

  // TC-C10: googleCallback failure
  test('TC-C10: googleCallback should redirect to login on failure', () => {
    req.user = null;
    authController.googleCallback(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/login?error=Google login failed');
  });
});

// ═══════════════════════════════════════════
// Test Suite: Booking Controller (Validation)
// ═══════════════════════════════════════════

const bookingController = require('../controller/bookingController');

describe('Booking Controller - Validation', () => {

  let req, res;

  beforeEach(() => {
    req = {
      params: { roomId: '1' },
      body: {},
      session: { user: { id: 2, role: 'user' } }
    };
    res = {
      render: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
    data.getCourtById.mockReset();
    data.hasConflictingBooking.mockReset();
    data.addBooking.mockReset();
  });

  const mockCourt = { id: 1, name: 'สนาม A', courtType: 'double', surface: 'synthetic', pricePerHour: 200 };

  // TC-C11: createBooking validates end > start time
  test('TC-C11: createBooking should reject when endTime <= startTime', async () => {
    data.getCourtById.mockResolvedValueOnce(mockCourt);
    req.body = { date: '2026-04-01', startTime: '12:00', endTime: '10:00' };

    await bookingController.createBooking(req, res);

    expect(res.render).toHaveBeenCalledWith('booking', expect.objectContaining({
      error: expect.stringContaining('เวลาสิ้นสุด')
    }));
  });

  // TC-C12: createBooking validates operating hours
  test('TC-C12: createBooking should reject booking outside 06:00-22:00', async () => {
    data.getCourtById.mockResolvedValueOnce(mockCourt);
    req.body = { date: '2026-04-01', startTime: '05:00', endTime: '07:00' };

    await bookingController.createBooking(req, res);

    expect(res.render).toHaveBeenCalledWith('booking', expect.objectContaining({
      error: expect.stringContaining('06:00 - 22:00')
    }));
  });

  // TC-C13: createBooking validates minimum 1 hour
  test('TC-C13: createBooking should reject booking less than 1 hour', async () => {
    data.getCourtById.mockResolvedValueOnce(mockCourt);
    req.body = { date: '2026-04-01', startTime: '10:00', endTime: '10:30' };

    await bookingController.createBooking(req, res);

    expect(res.render).toHaveBeenCalledWith('booking', expect.objectContaining({
      error: expect.stringContaining('ขั้นต่ำ 1 ชั่วโมง')
    }));
  });

  // TC-C14: createBooking prevents overbooking
  test('TC-C14: createBooking should reject when court has conflicting booking', async () => {
    data.getCourtById.mockResolvedValueOnce(mockCourt);
    data.hasConflictingBooking.mockResolvedValueOnce(true);
    req.body = { date: '2026-12-01', startTime: '10:00', endTime: '12:00' };

    await bookingController.createBooking(req, res);

    expect(res.render).toHaveBeenCalledWith('booking', expect.objectContaining({
      error: expect.stringContaining('ถูกจองในช่วงเวลานี้แล้ว')
    }));
  });

  // TC-C15: createBooking success
  test('TC-C15: createBooking should redirect to dashboard on success', async () => {
    data.getCourtById.mockResolvedValueOnce(mockCourt);
    data.hasConflictingBooking.mockResolvedValueOnce(false);
    data.addBooking.mockResolvedValueOnce({ id: 1 });
    req.body = { date: '2027-12-01', startTime: '10:00', endTime: '12:00' };

    await bookingController.createBooking(req, res);

    expect(data.addBooking).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith('/dashboard');
  });
});
