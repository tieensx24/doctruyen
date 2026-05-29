import React, { useEffect, useMemo, useState } from "react";
import {
  Eye,
  Grid3X3,
  Heart,
  List,
  MessageCircle,
} from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

const PLACEHOLDER_COVER = "/logo-gao.png";

const SORT_OPTIONS = [
  { key: "updated", label: "Ngày cập nhật", icon: null },
  { key: "new", label: "Truyện mới", icon: null },
  { key: "topAll", label: "Top all", icon: Eye },
  { key: "topMonth", label: "Top tháng", icon: Eye },
  { key: "topWeek", label: "Top tuần", icon: Eye },
  { key: "topDay", label: "Top ngày", icon: Eye },
  { key: "follow", label: "Theo dõi", icon: Heart },
  { key: "comment", label: "Bình luận", icon: MessageCircle },
  { key: "chapters", label: "Số chapter", icon: List },
  { key: "topFollow", label: "Top Follow", icon: List },
];

function getMangaCategories(manga) {
  if (Array.isArray(manga.categories)) return manga.categories;
  if (Array.isArray(manga.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function getSortedChapters(manga) {
  const chapters = Array.isArray(manga.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function enrichManga(manga, index) {
  const chapters = getSortedChapters(manga);
  const latestChapter = chapters[0];
  const views = Number(manga.view_count || manga.views || 0);

  return {
    ...manga,
    id: manga.id || index + 1,
    title: manga.title || "Truyện chưa đặt tên",
    author: manga.author || "Đang cập nhật",
    status: manga.status || "ongoing",
    categories: getMangaCategories(manga),
    cover: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    latestChapter: latestChapter?.title || (latestChapter ? `Chương ${latestChapter.chapter_number}` : "Chưa có chương"),
    chapterCount: chapters.length,
    views,
    comments: Number(manga.comments || manga.comments_count || 0),
    followers: Number(manga.followers || manga.followers_count || 0),
  };
}

function CategoryCard({ manga, onOpen }) {
  return (
    <article
      className="category-card"
      onClick={() => onOpen?.(manga.id)}
      role="button"
      tabIndex={0}
    >
      <div className="category-cover">
        <img src={manga.cover} alt={manga.title} />
        <div className="category-cover-meta">
          <span>
            <Eye size={14} />
            {formatNumber(manga.views)}
          </span>
          <span>
            <MessageCircle size={14} />
            {manga.comments}
          </span>
          <span>
            <Heart size={14} />
            {manga.followers}
          </span>
        </div>
      </div>
      <h3>{manga.title}</h3>
      <p>{manga.author}</p>
    </article>
  );
}

export default function Categories({ user, variant = "categories", onGoHome, onGoAuth, onGoAdmin, onGoMangaList, onGoCategories, onGoReadingHistory, onGoFollowing, onGoDetail, onSearchSubmit, onLogout }) {
  const [mangas, setMangas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeCategory, setActiveCategory] = useState("Tất cả");
  const [activeSort, setActiveSort] = useState("updated");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isListPage = variant === "list";
  const activeHeaderPage = isListPage ? "mangas" : "categories";
  const breadcrumbLabel = isListPage ? "Truyện" : "Thể loại";
  const pageTitle = isListPage ? "Danh sách truyện" : "Tất cả thể loại truyện tranh";

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setError("");

      try {
        const [mangaResponse, categoryResponse] = await Promise.all([
          api.get("/mangas"),
          api.get("/categories"),
        ]);

        if (!isOk(mangaResponse)) throw new Error("Không tải được danh sách truyện.");
        if (!isOk(categoryResponse)) throw new Error("Không tải được danh sách thể loại.");

        setMangas(Array.isArray(mangaResponse.data) ? mangaResponse.data : []);
        setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []);
      } catch (err) {
        setMangas([]);
        setCategories([]);
        setError(err.message || "Không tải được dữ liệu từ server.");
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, []);

  const categoryNames = useMemo(() => {
    const backendNames = categories.map((category) => category.name).filter(Boolean);
    return ["Tất cả", ...new Set(backendNames)];
  }, [categories]);

  const novels = useMemo(
    () => mangas.map((manga, index) => enrichManga(manga, index)),
    [mangas]
  );

  const filteredNovels = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = novels.filter((novel) => {
      const matchSearch =
        !keyword ||
        novel.title.toLowerCase().includes(keyword) ||
        novel.author.toLowerCase().includes(keyword) ||
        novel.categories.some((category) => category.toLowerCase().includes(keyword));
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "completed" && novel.status === "completed") ||
        (statusFilter === "ongoing" && novel.status === "ongoing");
      const matchCategory = activeCategory === "Tất cả" || novel.categories.includes(activeCategory);
      return matchSearch && matchStatus && matchCategory;
    });

    if (activeSort.startsWith("top")) return [...filtered].sort((a, b) => b.views - a.views);
    if (activeSort === "follow") return [...filtered].sort((a, b) => b.followers - a.followers);
    if (activeSort === "comment") return [...filtered].sort((a, b) => b.comments - a.comments);
    if (activeSort === "chapters") return [...filtered].sort((a, b) => b.chapterCount - a.chapterCount);
    if (activeSort === "new") return [...filtered].sort((a, b) => Number(b.id) - Number(a.id));
    return filtered;
  }, [activeCategory, activeSort, novels, search, statusFilter]);

  return (
    <MainLayout className="category-page">
      <SiteHeader
        activePage={activeHeaderPage}
        user={user}
        onGoHome={onGoHome}
        onGoAuth={onGoAuth}
        onGoAdmin={onGoAdmin}
        onGoMangaList={onGoMangaList}
        onGoCategories={onGoCategories}
        onGoReadingHistory={onGoReadingHistory}
        onGoFollowing={onGoFollowing}
        onGoDetail={onGoDetail}
        onSearchSubmit={onSearchSubmit}
        onLogout={onLogout}
        search={search}
        setSearch={setSearch}
      />

      <main className="category-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          <strong>{breadcrumbLabel}</strong>
        </div>

        <div className="category-layout">
          <section className="category-content">
            <div className="category-title-row">
              <Grid3X3 size={26} />
              <h1>{pageTitle}</h1>
            </div>

            <div className="status-tabs">
              {[
                ["all", "Tất cả"],
                ["completed", "Hoàn thành"],
                ["ongoing", "Đang tiến hành"],
              ].map(([key, label]) => (
                <button
                  className={statusFilter === key ? "active" : ""}
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="sort-area">
              <span>Sắp xếp theo:</span>
              <div className="sort-buttons">
                {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    className={activeSort === key ? "active" : ""}
                    key={key}
                    onClick={() => setActiveSort(key)}
                    type="button"
                  >
                    {Icon && <Icon size={15} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Đang tải danh sách truyện...</div>
            ) : error ? (
              <div className="empty-state">{error}</div>
            ) : filteredNovels.length ? (
              <div className="category-grid">
                {filteredNovels.map((manga) => (
                  <CategoryCard key={manga.id} manga={manga} onOpen={onGoDetail} />
                ))}
              </div>
            ) : (
              <div className="empty-state">Không tìm thấy truyện phù hợp trong database.</div>
            )}
          </section>

          <aside className="category-sidebar">
            <h2>Thể loại</h2>
            <div className="category-list">
              {categoryNames.map((name) => (
                <button
                  className={activeCategory === name ? "active" : ""}
                  key={name}
                  onClick={() => setActiveCategory(name)}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </MainLayout>
  );
}
