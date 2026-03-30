// ===== Data Model (adapted from werayuthgswu/roombook) =====
// เก็บข้อมูลไว้ใน memory + localStorage

const STORAGE_KEYS = {
  COURTS: 'babad_courts',
  BOOKINGS: 'babad_bookings',
  USER: 'babad_user',
};

// --- Users (hardcoded admin + google users จะถูกเพิ่มตอน login) ---
const defaultUsers = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin', displayName: 'Admin' },
];

// --- Courts (สนามแบดมินตัน) ---
const defaultCourts = [
  { id: 1, name: 'สนาม A', capacity: 4 },
  { id: 2, name: 'สนาม B', capacity: 4 },
  { id: 3, name: 'สนาม C', capacity: 4 },
  { id: 4, name: 'สนาม D', capacity: 4 },
];

// --- Load from localStorage ---
function loadData(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
}

// Initialize
let users = [...defaultUsers];
let courts = loadData(STORAGE_KEYS.COURTS, defaultCourts);
let bookings = loadData(STORAGE_KEYS.BOOKINGS, []);

// ============ User Functions ============

function findUser(username, password) {
  return users.find(u => u.username === username && u.password === password) || null;
}

function addGoogleUser(googleProfile) {
  // เช็คว่ามี user นี้อยู่แล้วหรือยัง
  let existing = users.find(u => u.username === googleProfile.email);
  if (existing) return existing;

  const newUser = {
    id: users.length + 1,
    username: googleProfile.email,
    password: null, // Google user ไม่ใช้ password
    role: 'user',
    displayName: googleProfile.name || googleProfile.email,
    picture: googleProfile.picture || null,
  };
  users.push(newUser);
  return newUser;
}

// ============ Court Functions (สนาม) ============

function getCourts() {
  return courts;
}

function addCourt(name, capacity) {
  const id = courts.length > 0 ? Math.max(...courts.map(c => c.id)) + 1 : 1;
  const court = { id, name, capacity: parseInt(capacity) };
  courts.push(court);
  saveData(STORAGE_KEYS.COURTS, courts);
  return court;
}

function removeCourt(courtId) {
  const index = courts.findIndex(c => c.id === parseInt(courtId));
  if (index > -1) {
    const removed = courts.splice(index, 1)[0];
    saveData(STORAGE_KEYS.COURTS, courts);
    return removed;
  }
  return null;
}

// ============ Booking Functions ============

function getBookings() {
  return bookings;
}

function getUserBookings(userId) {
  return bookings.filter(b => b.userId === userId);
}

function addBooking(courtId, date, startTime, endTime, userId, userName) {
  const id = bookings.length > 0 ? Math.max(...bookings.map(b => b.id)) + 1 : 1;
  const courtName = courts.find(c => c.id === parseInt(courtId))?.name || 'Unknown';
  const booking = {
    id,
    courtId: parseInt(courtId),
    courtName,
    date,
    startTime,
    endTime,
    userId,
    userName: userName || 'Unknown',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  bookings.push(booking);
  saveData(STORAGE_KEYS.BOOKINGS, bookings);
  return booking;
}

// ตรวจสอบว่าสนามว่างไหม (ป้องกัน overbooking)
function isCourtAvailable(courtId, date, startTime, endTime) {
  return !bookings.some(b =>
    b.courtId === parseInt(courtId) &&
    b.date === date &&
    b.status === 'approved' &&
    ((startTime >= b.startTime && startTime < b.endTime) ||
     (endTime > b.startTime && endTime <= b.endTime) ||
     (startTime <= b.startTime && endTime >= b.endTime))
  );
}

// ตรวจสอบว่ามี booking ที่ approved แล้วซ้อนทับเวลาไหม
function hasApprovedBooking(courtId, date, startTime, endTime) {
  return bookings.some(b =>
    b.courtId === parseInt(courtId) &&
    b.date === date &&
    b.status === 'approved' &&
    ((startTime >= b.startTime && startTime < b.endTime) ||
     (endTime > b.startTime && endTime <= b.endTime) ||
     (startTime <= b.startTime && endTime >= b.endTime))
  );
}

// ค้นหาสนามที่ว่าง
function searchAvailableCourts(date, startTime, endTime) {
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const pendingBookings = bookings.filter(b => b.status === 'pending');

  return courts.map(court => {
    const hasApprovedConflict = approvedBookings.some(b =>
      b.courtId === court.id &&
      b.date === date &&
      ((startTime >= b.startTime && startTime < b.endTime) ||
       (endTime > b.startTime && endTime <= b.endTime) ||
       (startTime <= b.startTime && endTime >= b.endTime))
    );

    const hasPendingConflict = pendingBookings.some(b =>
      b.courtId === court.id &&
      b.date === date &&
      ((startTime >= b.startTime && startTime < b.endTime) ||
       (endTime > b.startTime && endTime <= b.endTime) ||
       (startTime <= b.startTime && endTime >= b.endTime))
    );

    return {
      ...court,
      availability: hasApprovedConflict ? 'unavailable' : (hasPendingConflict ? 'pending' : 'available'),
    };
  });
}

function approveBooking(bookingId) {
  const booking = bookings.find(b => b.id === parseInt(bookingId));
  if (booking) {
    // ก่อน approve ต้องเช็คว่าไม่ซ้อนทับกับ booking ที่ approved แล้ว
    if (hasApprovedBooking(booking.courtId, booking.date, booking.startTime, booking.endTime)) {
      return { success: false, error: 'มีการจองที่อนุมัติแล้วในช่วงเวลานี้' };
    }
    booking.status = 'approved';
    saveData(STORAGE_KEYS.BOOKINGS, bookings);
    return { success: true, booking };
  }
  return { success: false, error: 'ไม่พบการจอง' };
}

function removeBooking(bookingId, user) {
  const booking = bookings.find(b => b.id === parseInt(bookingId));
  if (!booking) return { success: false, error: 'ไม่พบการจอง' };

  // admin ลบได้ทุกอัน, user ลบได้เฉพาะของตัวเอง
  if (user.role === 'admin' || booking.userId === user.id) {
    const index = bookings.findIndex(b => b.id === parseInt(bookingId));
    if (index > -1) {
      bookings.splice(index, 1);
      saveData(STORAGE_KEYS.BOOKINGS, bookings);
      return { success: true };
    }
  }
  return { success: false, error: 'ไม่มีสิทธิ์ลบการจองนี้' };
}

// ============ Session Functions ============

function saveSession(user) {
  saveData(STORAGE_KEYS.USER, user);
}

function loadSession() {
  return loadData(STORAGE_KEYS.USER, null);
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// ============ Export ============

const data = {
  findUser,
  addGoogleUser,
  getCourts,
  addCourt,
  removeCourt,
  getBookings,
  getUserBookings,
  addBooking,
  isCourtAvailable,
  hasApprovedBooking,
  searchAvailableCourts,
  approveBooking,
  removeBooking,
  saveSession,
  loadSession,
  clearSession,
};

export default data;
