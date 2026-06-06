import React, { useEffect, useMemo, useState } from "react";
import { Heart, Info, Play, Sparkles } from "lucide-react";

const PLACEHOLDER_COVER = "/logo-gao.png";

function getCategories(manga) {
  if (Array.isArray(manga?.Categories)) return manga.Categories.map((category) => category.name).filter(Boolean);
  if (Array.isArray(manga?.categories)) return manga.categories.filter(Boolean);
  return [];
}

function getChapters(manga) {
  const chapters = Array.isArray(manga?.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0));
}

function getLatestChapter(manga) {
  const latest = manga?.latest_chapter || getChapters(manga)[0];
  if (!latest) return manga?.status === "completed" ? "Full" : "Chưa có chương";
  return latest.title || `Chương ${latest.chapter_number}`;
}

function getStatusLabel(status) {
  if (status === "completed") return "Hoàn thành";
  if (status === "paused") return "Tạm ngưng";
  return "Đang ra";
}

function normalizeManga(manga, index) {
  const chapters = getChapters(manga);
  const categories = getCategories(manga);
  const chapterCount = Number(manga?.chapter_count || chapters.length || 0);

  return {
    id: manga?.id || index + 1,
    title: manga?.title || "Truyện chưa đặt tên",
    slug: manga?.slug || manga?.id,
    subTitle: manga?.english_title || manga?.englishTitle || "",
    author: manga?.author || "Đang cập nhật",
    description: manga?.description || "Truyện này chưa có mô tả.",
    cover: manga?.cover_image || manga?.coverImage || PLACEHOLDER_COVER,
    banner: manga?.banner_image || manga?.bannerImage || manga?.cover_image || PLACEHOLDER_COVER,
    thumbnail: manga?.cover_image || manga?.coverImage || PLACEHOLDER_COVER,
    genres: categories,
    status: getStatusLabel(manga?.status),
    latestChapter: getLatestChapter(manga),
    chapterCount,
  };
}

function normalizeSlide(slide, index) {
  const manga = normalizeManga(slide?.Manga || slide?.manga || slide?.story || {}, index);
  const tagSource = Array.isArray(slide?.tags) ? slide.tags : null;
  const tags = tagSource?.length
    ? tagSource
    : [...manga.genres.slice(0, 2), manga.status, manga.chapterCount ? `${manga.chapterCount} chương` : manga.latestChapter];

  return {
    ...manga,
    heroId: slide?.id || `fallback-${manga.id}-${index}`,
    id: manga.id || slide?.story_id || slide?.manga_id || index + 1,
    storyId: slide?.story_id || slide?.manga_id || manga.id,
    title: slide?.title || manga.title,
    subTitle: slide?.sub_title || slide?.subtitle || manga.subTitle,
    description: slide?.description || slide?.subtitle || manga.description,
    bannerImage: slide?.banner_image_url || slide?.image_url || manga.banner || manga.cover,
    thumbnailImage: slide?.thumbnail_image_url || slide?.image_url || manga.thumbnail || manga.cover,
    tags: tags.filter(Boolean).slice(0, 5),
    slug: slide?.slug || manga.slug,
  };
}

function normalizeFallbackNovel(novel, index) {
  const manga = normalizeManga(novel, index);

  return {
    ...manga,
    heroId: `novel-${manga.id}-${index}`,
    storyId: manga.id,
    subTitle: manga.subTitle,
    bannerImage: manga.banner || manga.cover,
    thumbnailImage: manga.banner || manga.cover,
    tags: [...manga.genres.slice(0, 2), manga.status, manga.chapterCount ? `${manga.chapterCount} chương` : manga.latestChapter]
      .filter(Boolean)
      .slice(0, 5),
  };
}

export default function HeroBanner({
  slides = [],
  fallbackNovels = [],
  onGoDetail,
  onGoInfo,
  onFollow,
  onActiveChange,
  isFollowed,
  followLoading,
}) {
  const heroItems = useMemo(() => {
    if (slides.length) return slides.map(normalizeSlide);
    return fallbackNovels.map(normalizeFallbackNovel);
  }, [slides, fallbackNovels]);

  const [activeIndex, setActiveIndex] = useState(0);
  const visibleItems = heroItems.slice(0, 4);
  const featured = heroItems[activeIndex] || heroItems[0];

  useEffect(() => {
    setActiveIndex(0);
  }, [heroItems.length]);

  useEffect(() => {
    if (visibleItems.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleItems.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [visibleItems.length]);

  useEffect(() => {
    if (featured) onActiveChange?.(featured.storyId || featured.id);
  }, [featured, onActiveChange]);

  if (!featured) {
    return <div className="empty-state">Chưa có truyện trong database. Hãy thêm truyện ở trang admin.</div>;
  }

  return (
    <section className="hero-banner-full">
      <article className="hero-banner" style={{ backgroundImage: `url(${featured.bannerImage || featured.cover})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-kicker">
            <Sparkles size={16} />
            Truyện nổi bật hôm nay
          </span>
          <h1>{featured.title}</h1>
          <div className="hero-tags">
            {featured.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p className="hero-description">{featured.description}</p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => onGoDetail?.(featured)} type="button">
              <Play size={18} fill="currentColor" />
              Đọc ngay
            </button>
            <button
              className={isFollowed ? "followed" : ""}
              disabled={followLoading}
              onClick={() => onFollow?.(featured.storyId || featured.id)}
              type="button"
            >
              <Heart size={18} fill={isFollowed ? "currentColor" : "none"} />
              {isFollowed ? "Đã theo dõi" : "Theo dõi"}
            </button>
            <button onClick={() => (onGoInfo || onGoDetail)?.(featured)} type="button">
              <Info size={18} />
              Thông tin
            </button>
          </div>
        </div>

        <div className="hero-thumb-panel" aria-label="Danh sách banner nổi bật">
          {visibleItems.map((item, index) => (
            <button
              className={index === activeIndex ? "hero-thumb-card active" : "hero-thumb-card"}
              key={item.heroId}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img src={item.thumbnailImage || item.bannerImage || item.cover} alt={item.title} />
              <span>
                <strong>{item.title}</strong>
                <small>{item.latestChapter}</small>
              </span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}
