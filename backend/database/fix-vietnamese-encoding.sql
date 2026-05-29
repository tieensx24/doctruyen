-- Sửa dữ liệu tiếng Việt bị lỗi mã hóa (double UTF-8) khi import init.sql
SET NAMES utf8mb4;

UPDATE categories SET name = 'Hành động' WHERE slug = 'hanh-dong';
UPDATE categories SET name = 'Tình cảm' WHERE slug = 'tinh-cam';
UPDATE categories SET name = 'Phiêu lưu' WHERE slug = 'phieu-luu';
UPDATE categories SET name = 'Hài hước' WHERE slug = 'hai-huoc';
UPDATE categories SET name = 'Kinh dị' WHERE slug = 'kinh-di';
UPDATE categories SET name = 'Võ thuật' WHERE slug = 'vo-thuat';
UPDATE categories SET name = 'Thể thao' WHERE slug = 'the-thao';

UPDATE mangas SET description = 'Câu chuyện về ninja Naruto Uzumaki' WHERE id = 1;
UPDATE mangas SET description = 'Hành trình tìm kho báu của Luffy' WHERE id = 2;
UPDATE mangas SET description = 'Tanjiro diệt quỷ để cứu em gái' WHERE id = 3;

UPDATE chapters SET title = 'Luffy bắt đầu hành trình' WHERE id = 3;
UPDATE chapters SET title = 'Tanjiro và Nezuko' WHERE id = 5;
