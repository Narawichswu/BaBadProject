-- ============================================
-- 🏸 BaBadminton — Database Schema
-- Run this to create tables and seed data
-- ============================================

CREATE DATABASE IF NOT EXISTS babadminton CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE babadminton;

-- ── Users Table ──
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) DEFAULT NULL,
  role ENUM('admin', 'user') DEFAULT 'user',
  email VARCHAR(255) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Courts Table ──
CREATE TABLE IF NOT EXISTS courts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  court_type ENUM('single', 'double') DEFAULT 'double',
  surface ENUM('synthetic', 'wooden', 'cement') DEFAULT 'synthetic',
  price_per_hour INT DEFAULT 200,
  facilities TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Bookings Table ──
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  court_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_court_date (court_id, booking_date),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Seed Data
-- ============================================

-- ── Default Users ──
-- Admin: admin / admin123
-- Test Users: user1 / 1234, user2 / 1234
INSERT INTO users (username, password, role, email) VALUES
  ('admin', 'admin123', 'admin', 'admin@babadminton.com'),
  ('user1', '1234', 'user', 'user1@babadminton.com'),
  ('user2', '1234', 'user', 'user2@babadminton.com')
ON DUPLICATE KEY UPDATE username = VALUES(username);

-- ── Default Courts ──
INSERT INTO courts (name, court_type, surface, price_per_hour, facilities, description) VALUES
  ('สนาม A', 'double', 'synthetic', 200, '💡 ไฟส่องสว่าง,❄️ แอร์,🅿️ ที่จอดรถ', 'สนามแบดมินตันคู่ พื้นสังเคราะห์คุณภาพสูง พร้อมระบบแอร์'),
  ('สนาม B', 'double', 'wooden', 250, '💡 ไฟส่องสว่าง,❄️ แอร์,🚿 ห้องอาบน้ำ,🅿️ ที่จอดรถ', 'สนามพื้นไม้ระดับแข่งขัน เหมาะสำหรับนักกีฬาที่ต้องการคุณภาพสูงสุด'),
  ('สนาม C', 'single', 'synthetic', 150, '💡 ไฟส่องสว่าง,🅿️ ที่จอดรถ', 'สนามเดี่ยวสำหรับฝึกซ้อม ราคาประหยัด'),
  ('สนาม D', 'double', 'synthetic', 200, '💡 ไฟส่องสว่าง,❄️ แอร์,🚿 ห้องอาบน้ำ', 'สนามคู่มาตรฐาน พื้นสังเคราะห์กันลื่น'),
  ('สนาม E (Premium)', 'double', 'wooden', 350, '💡 ไฟส่องสว่าง,❄️ แอร์,🚿 ห้องอาบน้ำ,🅿️ ที่จอดรถ,📺 จอ Scoreboard', 'สนาม Premium พื้นไม้เกรด A พร้อม Scoreboard ดิจิทัล'),
  ('สนาม F', 'single', 'cement', 100, '💡 ไฟส่องสว่าง', 'สนามเดี่ยวกลางแจ้ง ราคาถูกสุด เหมาะสำหรับเล่นสบายๆ')
ON DUPLICATE KEY UPDATE name = VALUES(name);
