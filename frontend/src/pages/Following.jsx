import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Eye,
  Heart,
  LogIn,
  Trash2,
} from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatDate(value) {
  if (!value) return "Vừa theo dõi";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getLatestChapter(manga) {
  const chapters = Array.isArray(manga?.Chapters) ? manga.Chapters : [];
  const chapter = [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0))[0];
  if (!chapter) return "Chưa có chương";
  return chapter.title || `Chapter ${chapter.chapter_number}`;
}

export default function Following({
  user,
  onGoHome,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoAuth,
  onGoAdmin,
  onGoDetail,
  onSearchSubmit,
  onLogout,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("doctruyen_token");

  useEffect(() => {
    async function loadFavorites() {
      if (!token) {
        setItems([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get("/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isOk(response)) throw new Error(response.data?.message || "Không tải được danh sách theo dõi");
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.message || "Không tải được danh sách theo dõi");
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [token]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const manga = item.Manga || {};
      return [manga.title, manga.author, getLatestChapter(manga)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [items, search]);

  async function removeItem(mangaId) {
    if (!token) return;

    const response = await api.delete(`/favorites/${mangaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isOk(response)) {
      setItems((current) => current.filter((item) => Number(item.manga_id) !== Number(mangaId)));
    }
  }

  async function clearAll() {
    if (!token) return;

    const response = await api.delete("/favorites", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isOk(response)) setItems([]);
  }

  return (
    <MainLayout className="following-page">
      <SiteHeader
        activePage="following"
        user={user}
        onGoHome={onGoHome}
        onGoMangaList={onGoMangaList}
        onGoCategories={onGoCategories}
        onGoReadingHistory={onGoReadingHistory}
        onGoFollowing={onGoFollowing}
        onGoDetail={onGoDetail}
        onGoAuth={onGoAuth}
        onGoAdmin={onGoAdmin}
        onSearchSubmit={onSearchSubmit}
        onLogout={onLogout}
        search={search}
        setSearch={setSearch}
      />

      <main className="following-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          <strong>Theo dõi</strong>
        </div>

        <section className="following-head">
          <div>
            <span>
              <Heart size={24} fill="currentColor" />
            </span>
            <div>
              <h1>Truyện đang theo dõi</h1>
              <p>Theo dõi các bộ truyện yêu thích và quay lại đọc chương mới nhanh hơn.</p>
            </div>
          </div>
          {items.length > 0 && (
            <button className="following-clear" onClick={clearAll} type="button">
              <Trash2 size={17} />
              Xóa tất cả
            </button>
          )}
        </section>

        <section className="following-panel">
          <div className="following-toolbar">
            <div>
              <strong>{filteredItems.length}</strong>
              <span>truyện</span>
            </div>
            <small>Dữ liệu lưu theo tài khoản đăng nhập</small>
          </div>

          {!token ? (
            <div className="following-empty">
              <LogIn size={42} />
              <h2>Đăng nhập để xem danh sách theo dõi</h2>
              <p>Mỗi tài khoản sẽ có danh sách theo dõi riêng trong database.</p>
              <button onClick={onGoAuth} type="button">Đăng nhập</button>
            </div>
          ) : loading ? (
            <div className="empty-state">Đang tải danh sách theo dõi...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : filteredItems.length ? (
            <div className="following-list">
              {filteredItems.map((item) => {
                const manga = item.Manga || {};

                return (
                  <article className="following-item" key={`${item.user_id}-${item.manga_id}`}>
                    <button className="following-cover" onClick={() => onGoDetail?.(manga.id)} type="button">
                      <img src={manga.cover_image || "/logo-gao.png"} alt={manga.title || "Truyện"} />
                    </button>
                    <div className="following-info">
                      <button onClick={() => onGoDetail?.(manga.id)} type="button">
                        {manga.title || "Truyện đang theo dõi"}
                      </button>
                      <p>{manga.author || "Đang cập nhật"}</p>
                      <div className="following-meta">
                        <span>
                          <BookOpen size={15} />
                          {getLatestChapter(manga)}
                        </span>
                        <span>
                          <Eye size={15} />
                          {formatNumber(manga.view_count)}
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                    <button className="following-remove" onClick={() => removeItem(item.manga_id)} type="button">
                      <Trash2 size={18} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="following-empty">
              <Heart size={42} />
              <h2>Chưa có truyện theo dõi</h2>
              <p>Vào trang chi tiết truyện và bấm Theo dõi để lưu truyện vào tài khoản.</p>
              <button onClick={onGoMangaList || onGoHome} type="button">Khám phá truyện</button>
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
