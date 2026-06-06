import React, { useEffect, useRef, useState } from "react";
import {
  LogOut,
  Menu,
  Search,
  Shield,
  UserCircle,
} from "lucide-react";
import api, { isOk } from "../api/client.js";

const MENU_ITEMS = [
  { key: "home", label: "Trang chủ" },
  { key: "categories", label: "Thể loại" },
  { key: "history", label: "Lịch sử đọc" },
  { key: "following", label: "Theo dõi" },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function getMangaCategories(manga) {
  if (Array.isArray(manga?.Categories)) return manga.Categories.map((category) => category.name);
  if (Array.isArray(manga?.categories)) return manga.categories;
  return [];
}

function getLatestChapter(manga) {
  if (manga?.latest_chapter) {
    return manga.latest_chapter.title || `Chương ${manga.latest_chapter.chapter_number}`;
  }

  const chapters = Array.isArray(manga?.Chapters) ? manga.Chapters : [];
  const chapter = [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0))[0];
  if (!chapter) return manga?.status === "completed" ? "Full" : "Chưa có chương";
  return chapter.title || `Chương ${chapter.chapter_number}`;
}

export default function SiteHeader({
  activePage = "home",
  overlay = false,
  user,
  onGoHome,
  onGoAuth,
  onGoAdmin,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoDetail,
  onSearchSubmit,
  onLogout,
  search,
  setSearch,
}) {
  const searchWrapRef = useRef(null);
  const suggestCacheRef = useRef(new Map());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleMenuClick = (key) => {
    if (key === "home") onGoHome?.();
    if (key === "categories") onGoCategories?.();
    if (key === "history") onGoReadingHistory?.();
    if (key === "following") onGoFollowing?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("doctruyen_token");
    localStorage.removeItem("doctruyen_user");
    onLogout?.();
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const keyword = String(search || "").trim();
    if (keyword) {
      setSuggestOpen(false);
      onSearchSubmit?.(keyword);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (!searchWrapRef.current?.contains(event.target)) {
        setSuggestOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!overlay) {
      setScrolled(false);
      return undefined;
    }

    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [overlay]);

  useEffect(() => {
    const keyword = String(search || "").trim();
    const cacheKey = normalizeText(keyword);

    if (cacheKey.length < 2) {
      setSuggestions([]);
      setSuggestLoading(false);
      return undefined;
    }

    if (suggestCacheRef.current.has(cacheKey)) {
      setSuggestions(suggestCacheRef.current.get(cacheKey));
      setSuggestLoading(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const response = await api.get("/search", {
          params: { q: keyword, limit: 8, mode: "suggest" },
        });
        const data = isOk(response) && Array.isArray(response.data) ? response.data : [];
        suggestCacheRef.current.set(cacheKey, data);
        if (suggestCacheRef.current.size > 30) {
          const firstKey = suggestCacheRef.current.keys().next().value;
          suggestCacheRef.current.delete(firstKey);
        }
        if (active) setSuggestions(data);
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSuggestLoading(false);
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  const showSuggestions = suggestOpen && String(search || "").trim().length >= 2;

  function handleSuggestionClick(manga) {
    setSuggestOpen(false);
    setSearch?.(manga.title || "");
    onGoDetail?.(manga);
  }

  return (
    <header className={["site-header", overlay ? "site-header-overlay" : "", scrolled ? "scrolled" : ""].filter(Boolean).join(" ")}>
      <div className="header-inner">
        <div className="brand">
          <img className="brand-logo" src="/logo-gao.png" alt="Gạo - Truyện hay ở đây" />
        </div>

        <form className="header-search" onSubmit={handleSearchSubmit} ref={searchWrapRef}>
          <Search size={18} />
          <input
            value={search || ""}
            onChange={(event) => {
              setSearch?.(event.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder="Tìm truyện, tác giả, thể loại..."
          />
          {showSuggestions && (
            <div className="search-suggest-panel">
              {suggestLoading ? (
                <div className="search-suggest-empty">Đang tìm...</div>
              ) : suggestions.length ? (
                suggestions.map((manga) => (
                  <button
                    className="search-suggest-item"
                    key={manga.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionClick(manga)}
                    type="button"
                  >
                    <img src={manga.cover_image || "/logo-gao.png"} alt={manga.title || "Truyện"} />
                    <span>
                      <strong>{manga.title || "Truyện chưa đặt tên"}</strong>
                      <small>{getLatestChapter(manga)}{manga.author ? ` - ${manga.author}` : ""}</small>
                      {manga.matched_fields?.length > 0 && (
                        <em>{manga.matched_fields.includes("category") ? getMangaCategories(manga).join(", ") : "Khớp dữ liệu truyện"}</em>
                      )}
                    </span>
                  </button>
                ))
              ) : (
                <div className="search-suggest-empty">Không tìm thấy truyện phù hợp.</div>
              )}
            </div>
          )}
        </form>

        <nav className="main-menu">
          {MENU_ITEMS.map((item) => (
            <button
              className={activePage === item.key ? "active" : ""}
              key={item.key}
              onClick={() => handleMenuClick(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="menu-button" type="button" aria-label="Mở menu">
            <Menu size={20} />
          </button>
          {user?.role_id === 1 && (
            <button className="admin-link" onClick={onGoAdmin} type="button">
              <Shield size={17} />
              Admin
            </button>
          )}
          {user ? (
            <button className="login-button ghost" onClick={handleLogout} type="button">
              <LogOut size={17} />
              Đăng xuất
            </button>
          ) : (
            <button className="login-button" onClick={onGoAuth} type="button">
              <UserCircle size={18} />
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
