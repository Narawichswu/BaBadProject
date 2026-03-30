// ===== Auth Controller =====
// จัดการการ login/logout ทั้ง admin (hardcoded) และ Google user

import data from '../model/data';

// Admin login ด้วย username/password
export function loginAdmin(username, password) {
  const user = data.findUser(username, password);
  if (user) {
    data.saveSession(user);
    return { success: true, user };
  }
  return { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

// Google login — เรียกหลังจากได้ credential จาก Google
export function loginGoogle(googleProfile) {
  const user = data.addGoogleUser(googleProfile);
  data.saveSession(user);
  return { success: true, user };
}

// Logout
export function logout() {
  data.clearSession();
}

// ดึง session ที่เก็บไว้
export function getSession() {
  return data.loadSession();
}

// ตรวจสอบว่า login แล้วหรือยัง
export function isAuthenticated() {
  return data.loadSession() !== null;
}

// ตรวจสอบว่าเป็น admin หรือไม่
export function isAdmin(user) {
  return user && user.role === 'admin';
}

const authController = {
  loginAdmin,
  loginGoogle,
  logout,
  getSession,
  isAuthenticated,
  isAdmin,
};

export default authController;
