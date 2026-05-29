import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Eye,
  History,
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
  if (!value) return "Vừa đọc";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function chapterLabel(chapter) {
  if (!chapter) return "Chưa có chương";
  return chapter.title || `Chapter ${chapter.chapter_number}`;
}

export default function ReadingHistory({
  user,
  onGoHome,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoAuth,
  onGoAdmin,
  onGoDetail,
  onGoChapter,
  onSearchSubmit,
  onLogout,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("doctruyen_token");

  useEffect(() => {
    async function loadHistory() {
      if (!token) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.get("/reading-history", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isOk(response)) throw new Error(response.data?.message || "Không tải được lịch sử đọc");
        setItems(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.message || "Không tải được lịch sử đọc");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [token]);

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return items;

    return items.filter((item) => {
      const manga = item.Manga || {};
      const chapter = item.Chapter || {};
      return [manga.title, manga.author, chapter.title, String(chapter.chapter_number || "")]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [items, search]);

  async function removeItem(mangaId) {
    const response = await api.delete(`/reading-history/${mangaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isOk(response)) {
      setItems((current) => current.filter((item) => Number(item.manga_id) !== Number(mangaId)));
    }
  }

  async function clearAll() {
    const response = await api.delete("/reading-history", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (isOk(response)) setItems([]);
  }

  return (
    <MainLayout className="following-page history-page">
      <SiteHeader
        activePage="history"
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
          <strong>Lịch sử đọc</strong>
        </div>

        <section className="following-head">
          <div>
            <span>
              <History size={24} />
            </span>
            <div>
              <h1>Lịch sử đọc</h1>
              <p>Lưu chương đọc gần nhất theo tài khoản để bạn quay lại đọc tiếp nhanh hơn.</p>
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
              <h2>Đăng nhập để xem lịch sử đọc</h2>
              <p>Hệ thống cần tài khoản để lưu và đồng bộ chương bạn đã đọc.</p>
              <button onClick={onGoAuth} type="button">Đăng nhập</button>
            </div>
          ) : loading ? (
            <div className="empty-state">Đang tải lịch sử đọc...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : filteredItems.length ? (
            <div className="following-list">
              {filteredItems.map((item) => {
                const manga = item.Manga || {};
                const chapter = item.Chapter || {};

                return (
                  <article className="following-item" key={`${item.user_id}-${item.manga_id}`}>
                    <button className="following-cover" onClick={() => onGoDetail?.(manga.id)} type="button">
                      <img src={manga.cover_image || "/logo-gao.png"} alt={manga.title || "Truyện"} />
                    </button>
                    <div className="following-info">
                      <button onClick={() => onGoDetail?.(manga.id)} type="button">
                        {manga.title || "Truyện đã đọc"}
                      </button>
                      <p>{manga.author || "Đang cập nhật"}</p>
                      <div className="following-meta">
                        <span>
                          <BookOpen size={15} />
                          {chapterLabel(chapter)}
                        </span>
                        <span>
                          <Eye size={15} />
                          {formatNumber(manga.view_count)}
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {formatDate(item.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="following-actions">
                      {chapter.id && (
                        <button onClick={() => onGoChapter?.(chapter.id)} type="button">
                          Đọc tiếp
                        </button>
                      )}
                      <button className="following-remove" onClick={() => removeItem(item.manga_id)} type="button">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="following-empty">
              <History size={42} />
              <h2>Chưa có lịch sử đọc</h2>
              <p>Mở một chương truyện khi đã đăng nhập, hệ thống sẽ tự lưu vào đây.</p>
              <button onClick={onGoMangaList || onGoHome} type="button">Khám phá truyện</button>
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
