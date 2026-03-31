// ============================================
// 🏸 BaBadminton — Auth Controller
// Google OAuth + Admin + User login (async/MySQL)
// ============================================

const data = require('../model/data');

const showLogin = (req, res) => {
  const error = req.query.error || null;
  res.render('login', { error });
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await data.findUser(username, password);

    if (user) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      };
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
};

const googleCallback = (req, res) => {
  if (req.user) {
    req.session.user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar
    };
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=Google login failed');
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};

const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    next();
  } else {
    res.redirect('/login');
  }
};

const requireAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.status(403).render('login', { error: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' });
  }
};

module.exports = { showLogin, login, googleCallback, logout, requireAuth, requireAdmin };
