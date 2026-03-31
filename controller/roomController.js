// ============================================
// 🏸 BaBadminton — Court Controller
// Dashboard, Search, Calendar, Add Court (async/MySQL)
// ============================================

const data = require('../model/data');

const showDashboard = async (req, res) => {
  try {
    const courts = await data.getCourts();
    const bookings = await data.getBookings();
    const users = await data.getUsers();
    res.render('dashboard', {
      user: req.session.user,
      courts,
      bookings,
      users
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
};

const showAddCourt = (req, res) => {
  res.render('add-room', { user: req.session.user });
};

const addCourt = async (req, res) => {
  try {
    const { name, courtType, surface, pricePerHour, description, facilities } = req.body;
    const facilityList = Array.isArray(facilities) ? facilities : (facilities ? [facilities] : []);
    await data.addCourt({
      name,
      courtType,
      surface,
      pricePerHour: parseInt(pricePerHour),
      description,
      facilities: facilityList
    });
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Add court error:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการเพิ่มสนาม');
  }
};

const showSearch = (req, res) => {
  res.render('search', {
    results: null,
    searchData: null,
    user: req.session.user
  });
};

const searchRooms = async (req, res) => {
  try {
    const { date, startTime, endTime, courtType, surface } = req.body;

    // Validate time range
    if (startTime >= endTime) {
      return res.render('search', {
        results: null,
        searchData: { date, startTime, endTime, courtType, surface },
        user: req.session.user,
        error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น'
      });
    }

    const results = await data.searchAvailableCourts(date, startTime, endTime, courtType, surface);
    res.render('search', {
      results,
      searchData: { date, startTime, endTime, courtType, surface },
      user: req.session.user
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).send('เกิดข้อผิดพลาดในการค้นหา');
  }
};

const showCalendar = async (req, res) => {
  try {
    const bookings = await data.getBookings();
    const courts = await data.getCourts();
    const users = await data.getUsers();

    // Support month navigation
    const monthOffset = parseInt(req.query.month) || 0;

    res.render('calendar', {
      bookings,
      rooms: courts,
      courts,
      users,
      user: req.session.user,
      monthOffset
    });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).send('เกิดข้อผิดพลาด');
  }
};

module.exports = {
  showDashboard,
  showAddRoom: showAddCourt,
  addRoom: addCourt,
  showSearch,
  searchRooms,
  showCalendar,
  showAddCourt,
  addCourt
};
