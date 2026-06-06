import React, { useEffect, useState } from "react";
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
    alternativeNames: manga.alternative_names || "",
    author: manga.author || "Đang cập nhật",
    categories,
    cover: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    views,
    comments: Number(manga.comments || manga.comments_count || 0),
    followers: Number(manga.followers || manga.followers_count || 0),
    relevance: Number(manga.relevance || 0),
    matchedFields: manga.matched_fields || [],
  };
}

function SearchCard({ manga, onOpen }) {
  return (
    <article className="category-card search-result-card" onClick={() => onOpen?.(manga)} role="button" tabIndex={0}>
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
      {manga.alternativeNames && <small className="search-alt-name">{manga.alternativeNames}</small>}
      {manga.categories.length > 0 && (
        <div className="search-match-tags">
          {manga.categories.slice(0, 3).map(category => <span key={category}>{category}</span>)}
        </div>
      )}
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
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      const keyword = query.trim();
      setError("");

      if (!keyword) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get("/search", {
          params: { q: keyword, limit: 40 },
        });
        if (!isOk(response)) throw new Error(response.data?.message || "Không tìm kiếm được truyện.");
        if (active) setResults(Array.isArray(response.data) ? response.data.map(enrichManga) : []);
      } catch (err) {
        if (active) {
          setResults([]);
          setError(err.message || "Không tìm kiếm được truyện.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResults();
    return () => {
      active = false;
    };
  }, [query]);

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
                Từ khóa <strong>{query}</strong> tìm thấy <strong>{results.length}</strong> truyện, sắp xếp theo độ liên quan.
              </p>
            ) : (
              <p>Nhập tên truyện, tên khác, tác giả hoặc thể loại trên thanh tìm kiếm để bắt đầu.</p>
            )}
          </div>

          {loading ? (
            <div className="empty-state">Đang tìm kiếm truyện...</div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : results.length ? (
            <div className="category-grid">
              {results.map((manga) => (
                <SearchCard key={manga.id} manga={manga} onOpen={onGoDetail} />
              ))}
            </div>
          ) : query ? (
            <div className="empty-state">Không tìm thấy truyện phù hợp trong database.</div>
          ) : (
            <div className="empty-state">Hãy nhập từ khóa để tìm truyện.</div>
          )}
        </section>
      </main>
    </MainLayout>
  );
}
