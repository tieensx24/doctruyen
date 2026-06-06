import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import HeroBanner from "../components/HeroBanner.jsx";
import api, { isOk } from "../api/client.js";

const PLACEHOLDER_COVER = "/logo-gao.png";

function getMangaCategories(manga) {
  if (Array.isArray(manga.categories)) return manga.categories;
  if (Array.isArray(manga.Categories)) return manga.Categories.map((category) => category.name);
  return [];
}

function getSortedChapters(manga) {
  const chapters = Array.isArray(manga.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0));
}

function getLatestChapter(manga) {
  const chapter = getSortedChapters(manga)[0];
  if (!chapter) return "Chưa có chương";
  return chapter.title || `Chương ${chapter.chapter_number}`;
}

function enrichManga(manga, index) {
  const title = manga.title || "Truyện chưa đặt tên";
  const chapters = getSortedChapters(manga);
  const views = Number(manga.view_count || manga.views || 0);

  return {
    ...manga,
    id: manga.id || index + 1,
    title,
    englishTitle: manga.englishTitle || "",
    author: manga.author || "Đang cập nhật",
    genres: getMangaCategories(manga),
    status: manga.status === "completed" ? "Hoàn thành" : "Đang ra",
    rawStatus: manga.status || "ongoing",
    latestChapter: getLatestChapter(manga),
    chapterCount: chapters.length,
    views,
    followers: Number(manga.followers || manga.followers_count || 0),
    comments: Number(manga.comments || manga.comments_count || 0),
    cover: manga.cover_image || manga.coverImage || PLACEHOLDER_COVER,
    banner: manga.banner_image || manga.bannerImage || manga.cover_image || PLACEHOLDER_COVER,
    description: manga.description || "Truyện này chưa có mô tả.",
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function EmptyState({ children }) {
  return <div className="empty-state">{children}</div>;
}

function ViewCount({ value }) {
  return (
    <span className="story-view-count">
      <Eye size={14} strokeWidth={2} />
      {formatNumber(value)}
    </span>
  );
}

function NovelCard({ novel, compact = false, onOpen }) {
  const statusClass = novel.rawStatus === "completed" ? "completed" : "ongoing";

  return (
    <article
      className={compact ? "novel-card compact" : "novel-card"}
      onClick={() => onOpen?.(novel)}
      role="button"
      tabIndex={0}
    >
      <div className="novel-cover">
        <img src={novel.cover} alt={novel.title} />
      </div>
      <span className={`status-pill ${statusClass}`}>{novel.status}</span>
      <div className="novel-card-body">
        <h3>{novel.title}</h3>
        <p>{novel.author}</p>
        <div className="novel-meta-row">
          <span className="novel-latest-chapter">{novel.latestChapter}</span>
          <ViewCount value={novel.views} />
        </div>
      </div>
    </article>
  );
}

function HotStoryCard({ novel, onOpen }) {
  const statusClass = novel.rawStatus === "completed" ? "completed" : "ongoing";

  return (
    <article className="hot-story-card" onClick={() => onOpen?.(novel)} role="button" tabIndex={0}>
      <img className="hot-story-cover" src={novel.cover} alt={novel.title} />
      <span className={`hot-story-status ${statusClass}`}>{novel.status}</span>
      <div className="hot-story-info">
        <h3 className="hot-story-title">{novel.title}</h3>
        <p className="hot-story-author">{novel.author}</p>
        <div className="hot-story-meta">
          <span className="hot-story-chapter">{novel.latestChapter}</span>
          <ViewCount value={novel.views} />
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
      {novels.length ? (
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
      ) : (
        <EmptyState>Chưa có dữ liệu xếp hạng.</EmptyState>
      )}
    </section>
  );
}

export default function Home({
  user,
  onGoHome,
  onGoAuth,
  onGoAdmin,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoDetail,
  onGoMangaInfo,
  onSearchSubmit,
  onLogout,
}) {
  const [mangas, setMangas] = useState([]);
  const [heroSlides, setHeroSlides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeHeroId, setActiveHeroId] = useState(null);
  const [featuredFollowed, setFeaturedFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const token = localStorage.getItem("doctruyen_token");

  useEffect(() => {
    async function fetchHomeData() {
      setLoading(true);
      setError("");

      try {
        const [mangaResponse, categoryResponse, heroResponse] = await Promise.all([
          api.get("/mangas"),
          api.get("/categories"),
          api.get("/hero-slides"),
        ]);

        if (!isOk(mangaResponse)) throw new Error("Không tải được danh sách truyện.");
        if (!isOk(categoryResponse)) throw new Error("Không tải được danh sách thể loại.");

        setMangas(Array.isArray(mangaResponse.data) ? mangaResponse.data : []);
        setCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []);
        setHeroSlides(Array.isArray(heroResponse.data) ? heroResponse.data : []);
      } catch (err) {
        setMangas([]);
        setHeroSlides([]);
        setCategories([]);
        setError(err.message || "Không tải được dữ liệu từ server.");
      } finally {
        setLoading(false);
      }
    }

    fetchHomeData();
  }, []);

  const genres = useMemo(() => categories.map((category) => category.name).filter(Boolean), [categories]);
  const novels = useMemo(() => mangas.map(enrichManga), [mangas]);
  const featuredId = activeHeroId || heroSlides[0]?.Manga?.id || heroSlides[0]?.manga_id || novels[0]?.id;

  useEffect(() => {
    async function loadFeaturedFollowStatus() {
      if (!featuredId || !token) {
        setFeaturedFollowed(false);
        return;
      }

      try {
        const response = await api.get(`/favorites/${featuredId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isOk(response)) {
          setFeaturedFollowed(Boolean(response.data?.is_favorited));
        }
      } catch {
        setFeaturedFollowed(false);
      }
    }

    loadFeaturedFollowStatus();
  }, [featuredId, token]);

  async function toggleFeaturedFollow(mangaId) {
    if (!mangaId) return;

    if (!token) {
      onGoAuth?.();
      return;
    }

    setFollowLoading(true);
    try {
      const response = featuredFollowed
        ? await api.delete(`/favorites/${mangaId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await api.post(`/favorites/${mangaId}`, null, {
            headers: { Authorization: `Bearer ${token}` },
          });

      if (!isOk(response)) throw new Error(response.data?.message || "Không cập nhật được theo dõi.");

      const nextFollowed = !featuredFollowed;
      setFeaturedFollowed(nextFollowed);
      setMangas((current) => current.map((manga) => {
        if (Number(manga.id) !== Number(mangaId)) return manga;

        const followers = Number(manga.followers_count || manga.followers || 0);
        return {
          ...manga,
          followers_count: Math.max(0, followers + (nextFollowed ? 1 : -1)),
        };
      }));
    } catch (err) {
      setError(err.message || "Không cập nhật được theo dõi.");
    } finally {
      setFollowLoading(false);
    }
  }

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

  const displayNovels = filteredNovels;
  const hotNovels = [...novels].sort((a, b) => b.views - a.views);
  const fullNovels = novels.filter((novel) => novel.rawStatus === "completed");
  const recommendedNovels = [...novels].sort((a, b) => b.followers - a.followers);

  return (
    <MainLayout>
      <SiteHeader
        activePage="home"
        overlay
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

      <main className="home-page">
        {error && <EmptyState>{error}</EmptyState>}
        {loading ? (
          <EmptyState>Đang tải dữ liệu từ database...</EmptyState>
        ) : (
          <HeroBanner
            fallbackNovels={novels}
            slides={heroSlides}
            onGoDetail={onGoDetail}
            onGoInfo={onGoMangaInfo}
            onFollow={toggleFeaturedFollow}
            onActiveChange={setActiveHeroId}
            isFollowed={featuredFollowed}
            followLoading={followLoading}
          />
        )}

        <div className="reader-shell home-content-shell">
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
            {genres.length ? (
              <div className="genre-grid">
                {genres.map((genre) => (
                  <button
                    className={activeGenre === genre ? "genre-tile active" : "genre-tile"}
                    key={genre}
                    onClick={() => setActiveGenre(activeGenre === genre ? "" : genre)}
                    type="button"
                  >
                    <span>{genre}</span>
                    <small>{novels.filter((novel) => novel.genres.includes(genre)).length} truyện</small>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState>Chưa có thể loại trong database.</EmptyState>
            )}
          </section>

          <section className="content-grid">
            <div className="main-content">
              <section>
                <SectionHeader icon={Clock3} title="Truyện mới cập nhật" />
                {displayNovels.length ? (
                  <div className="novel-grid">
                    {displayNovels.slice(0, 8).map((novel) => (
                      <NovelCard key={novel.id} novel={novel} onOpen={onGoDetail} />
                    ))}
                  </div>
                ) : (
                  <EmptyState>Không có truyện phù hợp để hiển thị.</EmptyState>
                )}
              </section>

              <section className="hot-story-section">
                <div className="hot-story-header">
                  <div>
                    <Flame size={22} />
                    <h2>Truyện hot</h2>
                  </div>
                  <button type="button">Xem tất cả</button>
                </div>
                {hotNovels.length ? (
                  <div className="hot-story-grid">
                    {hotNovels.slice(0, 6).map((novel) => (
                      <HotStoryCard key={`hot-${novel.id}`} novel={novel} onOpen={onGoDetail} />
                    ))}
                  </div>
                ) : (
                  <EmptyState>Chưa có dữ liệu truyện hot.</EmptyState>
                )}
              </section>

              <section className="split-sections">
                <div>
                  <SectionHeader icon={BookOpen} title="Truyện full" />
                  {fullNovels.length ? (
                    <div className="story-list">
                      {fullNovels.slice(0, 4).map((novel) => (
                        <NovelCard compact key={`full-${novel.id}`} novel={novel} onOpen={onGoDetail} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState>Chưa có truyện đã hoàn thành.</EmptyState>
                  )}
                </div>
                <div>
                  <SectionHeader icon={Star} title="Truyện đề cử" />
                  {recommendedNovels.length ? (
                    <div className="story-list">
                      {recommendedNovels.slice(0, 4).map((novel) => (
                        <NovelCard compact key={`recommended-${novel.id}`} novel={novel} onOpen={onGoDetail} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState>Chưa có dữ liệu đề cử.</EmptyState>
                  )}
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
        </div>
      </main>
    </MainLayout>
  );
}
