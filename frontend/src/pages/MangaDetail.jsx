import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Eye,
  Heart,
  Search as SearchIcon,
  Star,
  User,
} from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

const PLACEHOLDER_COVER = "/logo-gao.png";

function getMangaCategories(manga) {
  if (Array.isArray(manga?.categories)) return manga.categories;
  if (Array.isArray(manga?.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function getSortedChapters(manga) {
  const chapters = Array.isArray(manga?.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function normalizeManga(manga) {
  if (!manga) return null;

  return {
    ...manga,
    title: manga.title || "Truyện chưa đặt tên",
    author: manga.author || "Đang cập nhật",
    status: manga.status || "ongoing",
    cover_image: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    description: manga.description || "Truyện này chưa có mô tả.",
    view_count: Number(manga.view_count || manga.views || 0),
    Categories: getMangaCategories(manga).map((name) => ({ name })),
    Chapters: getSortedChapters(manga),
  };
}

function getLatestChapter(manga) {
  const chapter = getSortedChapters(manga)[0];
  if (!chapter) return "Chưa có chương";
  return chapter.title || `Chương ${chapter.chapter_number}`;
}

function RelatedPanel({ items, onGoDetail }) {
  return (
    <aside className="detail-related-panel">
      <h2>Cùng thể loại</h2>
      <div className="detail-related-grid">
        {items.length ? (
          items.map((item) => (
            <button className="detail-related-card" key={item.id} onClick={() => onGoDetail?.(item.id)} type="button">
              <img src={item.cover_image || PLACEHOLDER_COVER} alt={item.title} />
              <strong>{item.title || "Truyện chưa đặt tên"}</strong>
              <small>{getLatestChapter(item)}</small>
            </button>
          ))
        ) : (
          <div className="empty-state">Chưa có truyện cùng thể loại.</div>
        )}
      </div>
    </aside>
  );
}

export default function MangaDetail({
  mangaId,
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
  const [manga, setManga] = useState(null);
  const [relatedMangas, setRelatedMangas] = useState([]);
  const [search, setSearch] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");
  const [activeDetailTab, setActiveDetailTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const token = localStorage.getItem("doctruyen_token");

  useEffect(() => {
    async function loadManga() {
      if (!mangaId) {
        setManga(null);
        setError("Thiếu mã truyện.");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/mangas/${mangaId}`);
        if (!isOk(response)) throw new Error(response.data?.message || "Không tải được chi tiết truyện.");
        setManga(normalizeManga(response.data));
      } catch (err) {
        setManga(null);
        setError(err.message || "Không tải được chi tiết truyện.");
      } finally {
        setLoading(false);
      }
    }

    loadManga();
  }, [mangaId]);

  useEffect(() => {
    async function increaseView() {
      if (!mangaId) return;

      try {
        const response = await api.post(`/mangas/${mangaId}/view`);
        if (!isOk(response)) return;
        setManga((current) => current ? {
          ...current,
          view_count: response.data.view_count,
        } : current);
      } catch {
        // View count is updated by backend only; keep UI on database data if the request fails.
      }
    }

    increaseView();
  }, [mangaId]);

  const normalized = useMemo(() => normalizeManga(manga), [manga]);
  const categoryNames = getMangaCategories(normalized);
  const statusLabel = normalized?.status === "completed" ? "Hoàn thành" : "Đang cập nhật";
  const chapters = normalized?.Chapters || [];
  const firstChapter = chapters[chapters.length - 1];
  const primaryCategories = categoryNames.slice(0, 2);
  const filteredChapters = useMemo(() => {
    const keyword = chapterSearch.trim().toLowerCase();
    if (!keyword) return chapters;

    return chapters.filter((chapter) => {
      const title = chapter.title || `Chapter ${chapter.chapter_number}`;
      return title.toLowerCase().includes(keyword) || String(chapter.chapter_number).includes(keyword);
    });
  }, [chapters, chapterSearch]);

  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!normalized?.id || !token) {
        setIsFollowed(false);
        return;
      }

      try {
        const response = await api.get(`/favorites/${normalized.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isOk(response)) {
          setIsFollowed(Boolean(response.data?.is_favorited));
        }
      } catch {
        setIsFollowed(false);
      }
    }

    loadFavoriteStatus();
  }, [normalized?.id, token]);

  useEffect(() => {
    async function loadRelatedMangas() {
      if (!normalized?.id) {
        setRelatedMangas([]);
        return;
      }

      try {
        const response = await api.get("/mangas");
        if (!isOk(response)) throw new Error("Không tải được truyện liên quan");

        const categoriesSet = new Set(getMangaCategories(normalized));
        const list = Array.isArray(response.data) ? response.data : [];
        const related = list
          .filter((item) => Number(item.id) !== Number(normalized.id))
          .filter((item) => getMangaCategories(item).some((name) => categoriesSet.has(name)));

        const fallback = list.filter((item) => Number(item.id) !== Number(normalized.id));
        setRelatedMangas((related.length ? related : fallback).slice(0, 6));
      } catch {
        setRelatedMangas([]);
      }
    }

    loadRelatedMangas();
  }, [normalized?.id]);

  async function toggleFollow() {
    if (!normalized) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    setFollowLoading(true);
    try {
      const response = isFollowed
        ? await api.delete(`/favorites/${normalized.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await api.post(`/favorites/${normalized.id}`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });

      if (isOk(response)) {
        setIsFollowed((current) => !current);
      }
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <MainLayout className="detail-page">
      <SiteHeader
        activePage="detail"
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

      <main className="detail-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          <button onClick={onGoCategories} type="button">Thể loại</button>
          <span>»</span>
          <strong>{normalized?.title || "Chi tiết truyện"}</strong>
        </div>

        {loading ? (
          <div className="empty-state">Đang tải chi tiết truyện...</div>
        ) : error || !normalized ? (
          <div className="empty-state">{error || "Không tìm thấy truyện trong database."}</div>
        ) : (
          <div className="detail-layout">
            <section className="detail-main">
              <section className="detail-hero">
                <img className="detail-cover" src={normalized.cover_image} alt={normalized.title} />

                <div className="detail-hero-info">
                  <h1>{normalized.title}</h1>
                  <div className="detail-author">
                    <User size={18} />
                    <span>{normalized.author}</span>
                  </div>

                  <div className="detail-stats">
                    <span>
                      <Eye size={17} />
                      {formatNumber(normalized.view_count)}
                    </span>
                    <span>
                      <Star size={17} fill="currentColor" />
                      3.3
                    </span>
                    <span>
                      <BookOpen size={17} />
                      {chapters.length} chương
                    </span>
                  </div>

                  <div className="detail-tags">
                    {(primaryCategories.length ? primaryCategories : [statusLabel]).map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>

                  <div className="detail-action-row">
                    <button className="detail-read-button" disabled={!firstChapter} onClick={() => onGoChapter?.(firstChapter.id)} type="button">
                      <BookOpen size={19} />
                      Đọc truyện
                    </button>
                    <button
                      className={isFollowed ? "detail-soft-button followed" : "detail-soft-button"}
                      disabled={followLoading}
                      onClick={toggleFollow}
                      type="button"
                    >
                      <Heart size={18} fill="currentColor" />
                      {isFollowed ? "Đã theo dõi" : "Theo dõi"}
                    </button>
                  </div>
                </div>
              </section>

              <section className="detail-tabs">
                <div className="detail-tab-head">
                  <button
                    className={activeDetailTab === "summary" ? "active" : ""}
                    onClick={() => setActiveDetailTab("summary")}
                    type="button"
                  >
                    Tóm tắt
                  </button>
                  <button
                    className={activeDetailTab === "chapters" ? "active" : ""}
                    onClick={() => setActiveDetailTab("chapters")}
                    type="button"
                  >
                    DS. chương
                  </button>
                </div>

                {activeDetailTab === "summary" ? (
                  <p>{normalized.description}</p>
                ) : (
                  <div className="detail-chapter-panel">
                    <label className="detail-chapter-search">
                      <SearchIcon size={18} />
                      <input
                        value={chapterSearch}
                        onChange={(event) => setChapterSearch(event.target.value)}
                        placeholder="Tìm theo số chương hoặc tên chương"
                      />
                    </label>

                    <div className="detail-chapter-list">
                      {filteredChapters.length ? (
                        filteredChapters.map((chapter, index) => (
                          <button
                            className="detail-chapter-item"
                            key={chapter.id || chapter.chapter_number}
                            onClick={() => onGoChapter?.(chapter.id)}
                            type="button"
                          >
                            <span>{index + 1}</span>
                            <strong>{chapter.title || `Chapter ${chapter.chapter_number}`}</strong>
                          </button>
                        ))
                      ) : (
                        <div className="empty-state">Không tìm thấy chương phù hợp.</div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <RelatedPanel items={relatedMangas} onGoDetail={onGoDetail} />
          </div>
        )}
      </main>
    </MainLayout>
  );
}
