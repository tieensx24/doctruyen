-- Create database and seed initial data without dropping existing data
CREATE DATABASE IF NOT EXISTS doctruyen_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doctruyen_db;

-- =====================
-- BẢNG ROLES
-- =====================
CREATE TABLE IF NOT EXISTS roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- =====================
-- BẢNG USERS
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  role_id INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- =====================
-- BẢNG MANGAS
-- =====================
CREATE TABLE IF NOT EXISTS mangas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image VARCHAR(255) DEFAULT NULL,
  author VARCHAR(150) DEFAULT NULL,
  status ENUM('ongoing', 'completed') DEFAULT 'ongoing',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================
-- BẢNG CATEGORIES
-- =====================
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
);

-- =====================
-- BẢNG MANGA_CATEGORIES (many-to-many)
-- =====================
CREATE TABLE IF NOT EXISTS manga_categories (
  manga_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (manga_id, category_id),
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG CHAPTERS
-- =====================
CREATE TABLE IF NOT EXISTS chapters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  manga_id INT NOT NULL,
  chapter_number FLOAT NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG CHAPTER_IMAGES
-- =====================
CREATE TABLE IF NOT EXISTS chapter_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chapter_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  page_number INT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG COMMENTS
-- =====================
CREATE TABLE IF NOT EXISTS comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  manga_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG FAVORITES
-- =====================
CREATE TABLE IF NOT EXISTS favorites (
  user_id INT NOT NULL,
  manga_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, manga_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG READING_HISTORIES
-- =====================
CREATE TABLE IF NOT EXISTS reading_histories (
  user_id INT NOT NULL,
  manga_id INT NOT NULL,
  chapter_id INT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, manga_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
);

-- =====================
-- SEED DATA
-- =====================

-- Roles
INSERT IGNORE INTO roles (name) VALUES ('admin'), ('user');

-- Default admin account (password: password)
INSERT IGNORE INTO users (username, email, password, role_id) VALUES (
  'admin',
  'admin@doctruyen.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  1
);

-- Categories
INSERT IGNORE INTO categories (name, slug) VALUES 
  ('Hành động', 'hanh-dong'),
  ('Tình cảm', 'tinh-cam'),
  ('Phiêu lưu', 'phieu-luu'),
  ('Hài hước', 'hai-huoc'),
  ('Kinh dị', 'kinh-di'),
  ('Võ thuật', 'vo-thuat'),
  ('Thể thao', 'the-thao'),
  ('Fantasy', 'fantasy'),
  ('Isekai', 'isekai'),
  ('Slice of Life', 'slice-of-life');

-- Manga mẫu
INSERT IGNORE INTO mangas (id, title, description, author, status) VALUES
  (1, 'Naruto', 'Câu chuyện về ninja Naruto Uzumaki', 'Masashi Kishimoto', 'completed'),
  (2, 'One Piece', 'Hành trình tìm kho báu của Luffy', 'Eiichiro Oda', 'ongoing'),
  (3, 'Demon Slayer', 'Tanjiro diệt quỷ để cứu em gái', 'Koyoharu Gotouge', 'completed');

-- Chapter mẫu
INSERT IGNORE INTO chapters (id, manga_id, chapter_number, title) VALUES
  (1, 1, 1, 'Naruto Uzumaki'),
  (2, 1, 2, 'Konohamaru'),
  (3, 2, 1, 'Luffy bắt đầu hành trình'),
  (4, 2, 2, 'Zoro gia nhập'),
  (5, 3, 1, 'Tanjiro và Nezuko');

-- Manga categories
INSERT IGNORE INTO manga_categories (manga_id, category_id) VALUES
  (1, 1), (1, 3), (1, 6),
  (2, 1), (2, 3), (2, 4),
  (3, 1), (3, 5);
