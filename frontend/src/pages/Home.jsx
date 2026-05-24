import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Eye,
  Flame,
  Heart,
  Info,
  LogOut,
  Menu,
  MessageCircle,
  Play,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  UserCircle,
} from "lucide-react";

const API = "http://localhost:3000/api";

const FALLBACK_MANGAS = [
  { id: 1, title: "Đế Bá", author: "Yếm Bút Tiêu Sinh", status: "ongoing", view_count: 15420 },
  { id: 2, title: "Thần Đạo Đan Tôn", author: "Cô Đơn Địa Phi", status: "ongoing", view_count: 28900 },
  { id: 3, title: "Linh Vũ Thiên Hạ", author: "Vũ Phong", status: "completed", view_count: 19300 },
  { id: 4, title: "Tổng Tài Tại Thượng", author: "Khương Tiểu Nha", status: "completed", view_count: 22100 },
  { id: 5, title: "Sau Khi Tái Sinh", author: "Mộc Qua Hoàng", status: "ongoing", view_count: 13700 },
  { id: 6, title: "Hồ Sơ Trinh Thám", author: "Nhĩ Nhã", status: "ongoing", view_count: 17500 },
  { id: 7, title: "Kiếm Lai", author: "Phong Hỏa Hí Chư Hầu", status: "ongoing", view_count: 31800 },
  { id: 8, title: "Toàn Chức Cao Thủ", author: "Hồ Điệp Lam", status: "completed", view_count: 26350 },
];

const COVER_IMAGES = [
  "/covers/novel-1.png",
  "/covers/novel-2.png",
  "/covers/novel-3.png",
  "/covers/novel-4.png",
  "/covers/novel-5.png",
  "/covers/novel-6.png",
  "/covers/novel-7.png",
  "/covers/novel-8.png",
];

const GENRES = [
  "Tiên Hiệp",
  "Ngôn Tình",
  "Đô Thị",
  "Huyền Huyễn",
  "Kiếm Hiệp",
  "Xuyên Không",
  "Trinh Thám",
  "Truyện Teen",
];

const MENU_ITEMS = [
  "Trang chủ",
  "Thể loại",
  "Truyện mới",
  "Truyện hot",
  "Truyện full",
  "Lịch sử đọc",
  "Theo dõi",
];

const DESCRIPTIONS = [
  "Một hành trình tu luyện dài hơi với thế giới rộng lớn, các thế lực đối đầu và những bí mật được hé lộ qua từng chương.",
  "Từ một khởi đầu nhỏ bé, nhân vật chính từng bước phá giới hạn, luyện đan, tranh phong và bảo vệ những người quan trọng.",
  "Câu chuyện phiêu lưu xen lẫn tình cảm, những trận chiến đẹp mắt và nhịp truyện cập nhật đều đặn cho độc giả theo dõi.",
  "Một bản tình ca hiện đại nhiều biến cố, cuốn người đọc vào những lựa chọn khó khăn giữa tình yêu, gia đình và danh vọng.",
];

function getMangaCategories(manga) {
  if (Array.isArray(manga.categories)) return manga.categories;
  if (Array.isArray(manga.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function getStableIndex(text, modulo) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % modulo;
}

function enrichManga(manga, index) {
  const title = manga.title || "Truyện chưa đặt tên";
  const stableIndex = getStableIndex(`${title}-${index}`, COVER_IMAGES.length);
  const genreA = GENRES[(index + stableIndex) % GENRES.length];
  const genreB = GENRES[(index + stableIndex + 3) % GENRES.length];
  const backendCategories = getMangaCategories(manga);
  const genres = backendCategories.length ? backendCategories : [genreA, genreB];
  const status = manga.status === "completed" ? "Hoàn thành" : "Đang ra";
  const views = Number(manga.view_count || manga.views || 0);

  return {
    ...manga,
    id: manga.id || index + 1,
    title,
    englishTitle: manga.englishTitle || `${title} Online Novel`,
    author: manga.author || "Đang cập nhật",
    genres,
    status,
    latestChapter: manga.latestChapter || `Chương ${128 + index * 17}`,
    chapterCount: manga.chapterCount || 128 + index * 17,
    views,
    followers: manga.followers || Math.max(120, Math.round(views / 12)),
    comments: manga.comments || Math.max(8, Math.round(views / 180)),
    cover:
      manga.cover_image ||
      manga.coverImage ||
      COVER_IMAGES[stableIndex],
    description: manga.description || DESCRIPTIONS[index % DESCRIPTIONS.length],
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function NovelCard({ novel, compact = false }) {
  return (
    <article className={compact ? "novel-card compact" : "novel-card"}>
      <div className="novel-cover">
        <img src={novel.cover} alt={novel.title} />
        <span className="status-pill">{novel.status}</span>
      </div>
      <div className="novel-card-body">
        <h3>{novel.title}</h3>
        <p>{novel.author}</p>
        <div className="novel-meta-row">
          <span>{novel.latestChapter}</span>
          <span>
            <Eye size={14} />
            {formatNumber(novel.views)}
          </span>
        </div>
      </div>
    </article>
  );
}

function SectionHeader({ icon: Icon, title, action = "Xem tất cả" }) {
  return (
    <div className="section-head">
      <div>
        <Icon size={19} />
        <h2>{title}</h2>
      </div>
      <button type="button">{action}</button>
    </div>
  );
}

function RankingList({ title, icon: Icon, novels, metric }) {
  return (
    <section className="ranking-panel">
      <div className="ranking-title">
        <Icon size={18} />
        <h3>{title}</h3>
      </div>
      <div className="ranking-list">
        {novels.slice(0, 5).map((novel, index) => (
          <button className="ranking-item" key={`${title}-${novel.id}`} type="button">
            <span className={index < 3 ? "rank-number hot" : "rank-number"}>{index + 1}</span>
            <span>
              <strong>{novel.title}</strong>
              <small>{metric(novel)}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Header({ user, onGoAuth, onGoAdmin, onLogout, search, setSearch }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand">
          <span className="brand-icon">
            <BookOpen size={24} />
          </span>
          <strong>DocTruyen</strong>
        </div>

        <label className="header-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm truyện, tác giả, thể loại..."
          />
        </label>

        <nav className="main-menu">
          {MENU_ITEMS.map((item) => (
            <button className={item === "Trang chủ" ? "active" : ""} key={item} type="button">
              {item}
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
            <button
              className="login-button ghost"
              onClick={() => {
                localStorage.removeItem("doctruyen_token");
                localStorage.removeItem("doctruyen_user");
                onLogout?.();
              }}
              type="button"
            >
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

function Hero({ novels }) {
  const featured = novels[0];
  const sideNovels = novels.slice(1, 5);

  return (
    <section className="hero-layout">
      <article className="hero-banner" style={{ backgroundImage: `url(/covers/hero-bg.png), url(${featured.cover})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-kicker">
            <Sparkles size={16} />
            Truyện nổi bật hôm nay
          </span>
          <h1>{featured.title}</h1>
          <p className="english-title">{featured.englishTitle}</p>
          <div className="hero-tags">
            {featured.genres.slice(0, 3).map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
            <span>{featured.status}</span>
            <span>{featured.chapterCount} chương</span>
          </div>
          <p className="hero-description">{featured.description}</p>
          <div className="hero-actions">
            <button className="primary-cta" type="button">
              <Play size={18} fill="currentColor" />
              Đọc ngay
            </button>
            <button type="button">
              <Heart size={18} />
              Theo dõi
            </button>
            <button type="button">
              <Info size={18} />
              Thông tin
            </button>
          </div>
        </div>
      </article>

      <aside className="featured-strip">
        {sideNovels.map((novel) => (
          <button className="featured-thumb" key={novel.id} type="button">
            <img src={novel.cover} alt={novel.title} />
            <span>
              <strong>{novel.title}</strong>
              <small>{novel.latestChapter}</small>
            </span>
          </button>
        ))}
      </aside>
    </section>
  );
}

export default function Home({ user, onGoAuth, onGoAdmin, onLogout }) {
  const [mangas, setMangas] = useState(FALLBACK_MANGAS);
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMangas() {
      setLoading(true);
      try {
        const response = await fetch(`${API}/mangas`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) setMangas(data);
        }
      } catch {
        setMangas(FALLBACK_MANGAS);
      } finally {
        setLoading(false);
      }
    }

    fetchMangas();
  }, []);

  const novels = useMemo(() => mangas.map(enrichManga), [mangas]);

  const filteredNovels = novels.filter((novel) => {
    const keyword = search.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      novel.title.toLowerCase().includes(keyword) ||
      novel.author.toLowerCase().includes(keyword) ||
      novel.genres.some((genre) => genre.toLowerCase().includes(keyword));
    const matchGenre = !activeGenre || novel.genres.includes(activeGenre);
    return matchSearch && matchGenre;
  });

  const displayNovels = filteredNovels.length ? filteredNovels : novels;
  const hotNovels = [...novels].sort((a, b) => b.views - a.views);
  const fullNovels = novels.filter((novel) => novel.status === "Hoàn thành");
  const recommendedNovels = [...novels].sort((a, b) => b.followers - a.followers);

  return (
    <div className="reader-site">
      <Header
        user={user}
        onGoAuth={onGoAuth}
        onGoAdmin={onGoAdmin}
        onLogout={onLogout}
        search={search}
        setSearch={setSearch}
      />

      <main className="reader-shell">
        <Hero novels={novels} />

        <section className="genre-section">
          <div className="section-head">
            <div>
              <Sparkles size={19} />
              <h2>Bạn đang muốn đọc gì?</h2>
            </div>
            {activeGenre && (
              <button type="button" onClick={() => setActiveGenre("")}>
                Xóa lọc
              </button>
            )}
          </div>
          <div className="genre-grid">
            {GENRES.map((genre) => (
              <button
                className={activeGenre === genre ? "genre-tile active" : "genre-tile"}
                key={genre}
                onClick={() => setActiveGenre(activeGenre === genre ? "" : genre)}
                type="button"
              >
                <span>{genre}</span>
                <small>{12 + getStableIndex(genre, 58)} truyện</small>
              </button>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <div className="main-content">
            <section>
              <SectionHeader icon={Clock3} title="Truyện mới cập nhật" />
              {loading ? (
                <div className="empty-state">Đang tải truyện...</div>
              ) : (
                <div className="novel-grid">
                  {displayNovels.slice(0, 8).map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader icon={Flame} title="Truyện hot" />
              <div className="novel-grid compact-grid">
                {hotNovels.slice(0, 6).map((novel) => (
                  <NovelCard compact key={`hot-${novel.id}`} novel={novel} />
                ))}
              </div>
            </section>

            <section className="split-sections">
              <div>
                <SectionHeader icon={BookOpen} title="Truyện full" />
                <div className="story-list">
                  {(fullNovels.length ? fullNovels : novels.slice(0, 4)).slice(0, 4).map((novel) => (
                    <NovelCard compact key={`full-${novel.id}`} novel={novel} />
                  ))}
                </div>
              </div>
              <div>
                <SectionHeader icon={Star} title="Truyện đề cử" />
                <div className="story-list">
                  {recommendedNovels.slice(0, 4).map((novel) => (
                    <NovelCard compact key={`recommended-${novel.id}`} novel={novel} />
                  ))}
                </div>
              </div>
            </section>
          </div>

          <aside className="rankings">
            <RankingList
              icon={TrendingUp}
              title="Top truyện hot"
              novels={hotNovels}
              metric={(novel) => `${formatNumber(novel.views)} lượt xem`}
            />
            <RankingList
              icon={Heart}
              title="Top truyện theo dõi"
              novels={recommendedNovels}
              metric={(novel) => `${formatNumber(novel.followers)} theo dõi`}
            />
            <RankingList
              icon={MessageCircle}
              title="Top bình luận"
              novels={[...novels].sort((a, b) => b.comments - a.comments)}
              metric={(novel) => `${formatNumber(novel.comments)} bình luận`}
            />
          </aside>
        </section>
      </main>

      <footer className="site-footer">
        <div>
          <strong>DocTruyen</strong>
          <p>Website đọc truyện online với giao diện tối, hiện đại và dễ theo dõi trên mọi thiết bị.</p>
        </div>
        <nav>
          <button type="button">Giới thiệu</button>
          <button type="button">Liên hệ</button>
          <button type="button">Điều khoản</button>
        </nav>
      </footer>
    </div>
  );
}
