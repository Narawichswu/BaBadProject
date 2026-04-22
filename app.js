// ============================================
// 🏸 BaBadminton — Main Application
// Express + Passport + Google OAuth + MySQL
// ============================================

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const path = require('path');
const data = require('./model/data');
const { initDatabase } = require('./model/database');

const authController = require('./controller/authController');
const roomController = require('./controller/roomController');
const bookingController = require('./controller/bookingController');
const healthController = require('./controller/healthController');

const app = express();
const PORT = process.env.PORT || 3000;

// ── View Engine ──
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// ── Middleware ──
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'babadminton-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,  // Prevent XSS access
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'lax'  // CSRF protection
  }
}));

// ── Passport Setup ──
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await data.findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy - only set up if credentials are configured
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleAuth = googleClientId && googleClientId !== 'placeholder' &&
                      googleClientId !== 'your-google-client-id-here' &&
                      googleClientSecret && googleClientSecret !== 'placeholder' &&
                      googleClientSecret !== 'your-google-client-secret-here';

if (hasGoogleAuth) {
  passport.use(new GoogleStrategy({
    clientID: googleClientId,
    clientSecret: googleClientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await data.findOrCreateGoogleUser(profile);
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
  console.log('  ✅ Google OAuth configured');
} else {
  console.log('  ⚠️  Google OAuth not configured - using username/password login');
  console.log('     Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable');
}

// Make googleAuth status available to views
app.use((req, res, next) => {
  res.locals.hasGoogleAuth = hasGoogleAuth;
  next();
});

// ── Routes ──

// Health Check Endpoints (must be before auth middleware)
app.get('/health', healthController.getHealth);
app.get('/metrics', healthController.getMetrics);
app.get('/ready', healthController.getReadiness);
app.get('/live', healthController.getLiveness);

// Auth
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', authController.showLogin);
app.post('/login', authController.login);
app.get('/logout', authController.logout);

// Google OAuth Routes
if (hasGoogleAuth) {
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login?error=Google login failed' }),
    authController.googleCallback
  );
}

// Dashboard
app.get('/dashboard', authController.requireAuth, roomController.showDashboard);

// Court Management (Admin only)
app.get('/rooms/add', authController.requireAuth, authController.requireAdmin, roomController.showAddCourt);
app.post('/rooms/add', authController.requireAuth, authController.requireAdmin, roomController.addCourt);

// Search
app.get('/search', authController.requireAuth, roomController.showSearch);
app.post('/search', authController.requireAuth, roomController.searchRooms);

// Calendar
app.get('/calendar', authController.requireAuth, roomController.showCalendar);

// Bookings
app.get('/book/:roomId', authController.requireAuth, bookingController.showBooking);
app.post('/book/:roomId', authController.requireAuth, bookingController.createBooking);
app.post('/bookings/:id/approve', authController.requireAuth, authController.requireAdmin, bookingController.approveBooking);
app.post('/bookings/:id/remove', authController.requireAuth, bookingController.removeBooking);

// ── Initialize DB & Start Server ──
async function startServer() {
  console.log('');
  console.log('🏸 ═══════════════════════════════════════');
  console.log('   BaBadminton Court Booking System');
  console.log('   Initializing...');

  const dbReady = await initDatabase();

  if (!dbReady) {
    console.log('');
    console.log('  ❌ Cannot connect to MySQL database!');
    console.log('  📋 Please make sure:');
    console.log('     1. MySQL is running');
    console.log('     2. Database "babadminton" exists (or run schema.sql)');
    console.log('     3. Check DB_HOST, DB_USER, DB_PASSWORD in .env');
    console.log('');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('');
    console.log(`  🌐 Running on http://localhost:${PORT}`);
    console.log('');
    console.log('  📌 Login accounts:');
    console.log('     Admin : admin / admin123');
    console.log('     User1 : user1 / 1234');
    console.log('     User2 : user2 / 1234');
    console.log('');
    console.log('  🏥 Health endpoints:');
    console.log('     GET /health  - Health check');
    console.log('     GET /metrics - Prometheus metrics');
    console.log('     GET /ready   - Readiness probe');
    console.log('     GET /live    - Liveness probe');
    console.log('🏸 ═══════════════════════════════════════');
    console.log('');

    // Mark server as initialized
    global.serverInitialized = true;
  });
}

startServer();
