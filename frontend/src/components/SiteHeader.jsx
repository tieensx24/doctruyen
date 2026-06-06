import React, { useEffect, useRef, useState } from "react";
import {
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
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
  const adminMenuRef = useRef(null);
  const adminCloseTimerRef = useRef(null);
  const suggestCacheRef = useRef(new Map());
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
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

  const openAdminMenu = () => {
    if (adminCloseTimerRef.current) {
      window.clearTimeout(adminCloseTimerRef.current);
      adminCloseTimerRef.current = null;
    }
    setAdminMenuOpen(true);
  };

  const scheduleCloseAdminMenu = () => {
    if (adminCloseTimerRef.current) window.clearTimeout(adminCloseTimerRef.current);
    adminCloseTimerRef.current = window.setTimeout(() => {
      setAdminMenuOpen(false);
      adminCloseTimerRef.current = null;
    }, 220);
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
      if (!adminMenuRef.current?.contains(event.target)) {
        setAdminMenuOpen(false);
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

  useEffect(() => {
    return () => {
      if (adminCloseTimerRef.current) window.clearTimeout(adminCloseTimerRef.current);
    };
  }, []);

  const showSuggestions = suggestOpen && String(search || "").trim().length >= 2;
  const isAdmin = user?.role_id === 1;

  function handleSuggestionClick(manga) {
    setSuggestOpen(false);
    setSearch?.(manga.title || "");
    onGoDetail?.(manga);
  }

  function handleAdminDashboard() {
    setAdminMenuOpen(false);
    onGoAdmin?.();
  }

  function handleAdminLogout() {
    setAdminMenuOpen(false);
    handleLogout();
  }

  function handlePendingAdminAction(label) {
    setAdminMenuOpen(false);
    window.alert(`${label} đang được bổ sung.`);
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
          {user ? (
            <div
              className="admin-menu-wrap"
              onMouseEnter={openAdminMenu}
              onMouseLeave={scheduleCloseAdminMenu}
              ref={adminMenuRef}
            >
              <button
                aria-expanded={adminMenuOpen}
                className={isAdmin ? "admin-link" : "login-button ghost"}
                onClick={() => setAdminMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                {isAdmin ? <Shield size={17} /> : <UserCircle size={18} />}
                {isAdmin ? "Admin" : "Tài khoản"}
              </button>
              {adminMenuOpen && (
                <div className="admin-dropdown" role="menu">
                  {isAdmin && (
                    <button onClick={handleAdminDashboard} role="menuitem" type="button">
                      <LayoutDashboard size={17} />
                      Dashboard
                    </button>
                  )}
                  <button onClick={() => handlePendingAdminAction("Đổi mật khẩu")} role="menuitem" type="button">
                    <KeyRound size={17} />
                    Đổi mật khẩu
                  </button>
                  <button onClick={() => handlePendingAdminAction("Cài đặt")} role="menuitem" type="button">
                    <Settings size={17} />
                    Cài đặt
                  </button>
                  <button className="danger" onClick={handleAdminLogout} role="menuitem" type="button">
                    <LogOut size={17} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : !user ? (
            <button className="login-button" onClick={onGoAuth} type="button">
              <UserCircle size={18} />
              Đăng nhập
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
