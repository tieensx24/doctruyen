import React, { useEffect, useMemo, useState } from "react";
import { Eye, Heart, MessageCircle, Search as SearchIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

const PLACEHOLDER_COVER = "/logo-gao.png";

function getMangaCategories(manga) {
  if (Array.isArray(manga.categories)) return manga.categories;
  if (Array.isArray(manga.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function enrichManga(manga, index) {
  const categories = getMangaCategories(manga);
  const views = Number(manga.view_count || manga.views || 0);

  return {
    ...manga,
    id: manga.id || index + 1,
    title: manga.title || "Truyện chưa đặt tên",
    author: manga.author || "Đang cập nhật",
    categories,
    cover: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    views,
    comments: Number(manga.comments || manga.comments_count || 0),
    followers: Number(manga.followers || manga.followers_count || 0),
  };
}

function SearchCard({ manga, onOpen }) {
  return (
    <article className="category-card" onClick={() => onOpen?.(manga.id)} role="button" tabIndex={0}>
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

export default function Search({
  user,
  onGoHome,
  onGoAuth,
  onGoAdmin,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoDetail,
  onSearchSubmit,
  onLogout,
}) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [search, setSearch] = useState(query);
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    async function loadMangas() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/mangas");
        if (!isOk(response)) throw new Error("Không tải được danh sách truyện.");
        setMangas(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setMangas([]);
        setError(err.message || "Không tải được danh sách truyện.");
      } finally {
        setLoading(false);
      }
    }

    loadMangas();
  }, []);

  const novels = useMemo(() => mangas.map(enrichManga), [mangas]);
  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return novels;

    return novels.filter((manga) => {
      const searchableText = [
        manga.title,
        manga.author,
        ...manga.categories,
      ].join(" ").toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [novels, query]);

  return (
    <MainLayout className="category-page search-page">
      <SiteHeader
        activePage="search"
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
          <strong>Tìm kiếm</strong>
        </div>

        <section className="category-content">
          <div className="category-title-row">
            <SearchIcon size={26} />
            <h1>Tìm kiếm truyện</h1>
          </div>

          <div className="search-summary">
            {query ? (
              <p>
                Từ khóa <strong>{query}</strong> tìm thấy <strong>{results.length}</strong> truyện.
              </p>
            ) : (
              <p>Nhập tên truyện, tác giả hoặc thể loại trên thanh tìm kiếm để bắt đầu.</p>
            )}
          </div>

          {loading ? (
            <div className="empty-state">Đang tải danh sách truyện...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : results.length ? (
            <div className="category-grid">
              {results.map((manga) => (
                <SearchCard key={manga.id} manga={manga} onOpen={onGoDetail} />
              ))}
            </div>
          ) : (
            <div className="empty-state">Không tìm thấy truyện phù hợp trong database.</div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
