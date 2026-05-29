import React from 'react';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <img className="brand-logo footer-logo" src="/logo-gao.png" alt="Gạo" />
        <p>Truyện hay ở đây - đọc truyện online, theo dõi tiến độ và khám phá bộ mới mỗi ngày.</p>
      </div>
      <nav>
        <button type="button">Giới thiệu</button>
        <button type="button">Liên hệ</button>
        <button type="button">Điều khoản</button>
      </nav>
    </footer>
  );
}
