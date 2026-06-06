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
  slug VARCHAR(255) DEFAULT NULL UNIQUE,
  alternative_names TEXT NULL,
  description TEXT,
  cover_image VARCHAR(255) DEFAULT NULL,
  banner_image VARCHAR(255) DEFAULT NULL,
  author VARCHAR(150) DEFAULT NULL,
  status ENUM('ongoing', 'completed') DEFAULT 'ongoing',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FULLTEXT KEY ft_mangas_search (title, author, alternative_names, description)
);

CREATE TABLE IF NOT EXISTS hero_slides (
  id INT PRIMARY KEY AUTO_INCREMENT,
  manga_id INT NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  subtitle VARCHAR(255) DEFAULT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active_order (is_active, sort_order),
  INDEX idx_manga_id (manga_id),
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
  slug VARCHAR(255) DEFAULT NULL,
  title VARCHAR(255) DEFAULT NULL,
  chapter_type VARCHAR(20) DEFAULT 'image',
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_chapter_slug_per_manga (manga_id, slug),
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE
);

-- =====================
-- BẢNG CHAPTER_IMAGES
-- =====================
CREATE TABLE IF NOT EXISTS chapter_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL UNIQUE,
  content LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  word_count INT DEFAULT 0,
  reading_time_minutes INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chapter_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chapter_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  page_number INT NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- =====================
-- BANG VIEW_LOGS
-- =====================
CREATE TABLE IF NOT EXISTS view_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL,
  manga_id INT NULL,
  chapter_id INT NULL,
  user_id INT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_view_logs_created_at (created_at),
  INDEX idx_view_logs_target_type (target_type),
  INDEX idx_view_logs_manga_id (manga_id),
  INDEX idx_view_logs_chapter_id (chapter_id),
  INDEX idx_view_logs_user_id (user_id),
  INDEX idx_view_logs_ip_address (ip_address),
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================
-- BẢNG COMMENTS
-- =====================
CREATE TABLE IF NOT EXISTS comment_stickers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  public_id VARCHAR(255) NULL,
  type VARCHAR(30) DEFAULT 'sticker',
  status VARCHAR(20) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================
-- BANG COMMENTS
-- =====================
CREATE TABLE IF NOT EXISTS comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  manga_id INT NOT NULL,
  chapter_id INT NULL,
  parent_id INT NULL,
  sticker_id INT NULL,
  content TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  status VARCHAR(20) DEFAULT 'visible',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  INDEX idx_comments_manga_id (manga_id),
  INDEX idx_comments_chapter_id (chapter_id),
  INDEX idx_comments_parent_id (parent_id),
  INDEX idx_comments_sticker_id (sticker_id),
  INDEX idx_comments_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (sticker_id) REFERENCES comment_stickers(id) ON DELETE SET NULL
);

-- =====================
-- BANG COMMENT_REACTIONS
-- =====================
CREATE TABLE IF NOT EXISTS comment_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  reaction_type VARCHAR(30) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_comment_reaction (comment_id, user_id),
  INDEX idx_comment_id (comment_id),
  INDEX idx_user_id (user_id),
  INDEX idx_reaction_type (reaction_type),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================
-- BANG COMMENT_REPORTS
-- =====================
CREATE TABLE IF NOT EXISTS comment_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  detail TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY unique_user_comment_report (comment_id, user_id),
  INDEX idx_comment_reports_comment_id (comment_id),
  INDEX idx_comment_reports_user_id (user_id),
  INDEX idx_comment_reports_status (status),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================
-- BANG FAVORITES
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
-- BANG MANGA_RATINGS
CREATE TABLE IF NOT EXISTS manga_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manga_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_manga_rating (manga_id, user_id),
  INDEX idx_manga_ratings_manga_id (manga_id),
  INDEX idx_manga_ratings_user_id (user_id),
  CONSTRAINT chk_manga_rating_score CHECK (score BETWEEN 1 AND 5),
  FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- BANG READING_HISTORIES
CREATE TABLE IF NOT EXISTS reading_histories (
  user_id INT NOT NULL,
  manga_id INT NOT NULL,
  chapter_id INT DEFAULT NULL,
  progress_percent FLOAT DEFAULT 0,
  scroll_position INT DEFAULT 0,
  chapter_type VARCHAR(20) DEFAULT 'image',
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

UPDATE mangas SET slug = 'naruto' WHERE id = 1 AND (slug IS NULL OR slug = '');
UPDATE mangas SET slug = 'one-piece' WHERE id = 2 AND (slug IS NULL OR slug = '');
UPDATE mangas SET slug = 'demon-slayer' WHERE id = 3 AND (slug IS NULL OR slug = '');

UPDATE chapters SET slug = 'chapter-1-naruto-uzumaki' WHERE id = 1 AND (slug IS NULL OR slug = '');
UPDATE chapters SET slug = 'chapter-2-konohamaru' WHERE id = 2 AND (slug IS NULL OR slug = '');
UPDATE chapters SET slug = 'chapter-1-luffy-bat-dau-hanh-trinh' WHERE id = 3 AND (slug IS NULL OR slug = '');
UPDATE chapters SET slug = 'chapter-2-zoro-gia-nhap' WHERE id = 4 AND (slug IS NULL OR slug = '');
UPDATE chapters SET slug = 'chapter-1-tanjiro-va-nezuko' WHERE id = 5 AND (slug IS NULL OR slug = '');

-- Manga categories
INSERT IGNORE INTO manga_categories (manga_id, category_id) VALUES
  (1, 1), (1, 3), (1, 6),
  (2, 1), (2, 3), (2, 4),
  (3, 1), (3, 5);
