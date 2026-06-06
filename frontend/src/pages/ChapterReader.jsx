import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Home, ImageOff, List, Maximize2, Minimize2 } from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

function formatChapterTitle(chapter) {
  if (!chapter) return "Chapter";
  return chapter.title || `Chapter ${chapter.chapter_number}`;
}

export default function ChapterReader({
  chapterId,
  mangaSlug,
  user,
  onGoHome,
  onGoAuth,
  onGoAdmin,
  onGoMangaList,
  onGoCategories,
  onGoReadingHistory,
  onGoFollowing,
  onGoDetail,
  onGoChapter,
  onSearchSubmit,
  onLogout,
}) {
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingProgress, setReadingProgress] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const saveProgressTimerRef = useRef(null);
  const readingProgressRef = useRef(null);
  const restoredProgressRef = useRef(false);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    async function loadChapter() {
      if (!chapterId) return;

      setLoading(true);
      setError("");
      setReadingProgress(null);
      restoredProgressRef.current = false;

      try {
        const chapterPath = mangaSlug
          ? `/mangas/${mangaSlug}/chapters/${chapterId}`
          : `/chapters/${chapterId}`;
        const response = await api.get(chapterPath);
        if (!isOk(response)) throw new Error("Không tìm thấy chapter");
        const data = response.data;
        setChapter(data);
        const token = localStorage.getItem("doctruyen_token");

        try {
          const viewResponse = await api.post(
            `/chapters/${data.id}/view`,
            null,
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
          );
          if (isOk(viewResponse)) {
            setChapter(current => current ? {
              ...current,
              view_count: viewResponse.data.view_count,
            } : current);
          }
        } catch {
          // Keep the reader usable even if view tracking fails.
        }

        if (token) {
          try {
            const historyResponse = await api.post(
              "/reading-history",
              { chapter_id: data.id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (isOk(historyResponse)) setReadingProgress(historyResponse.data);
          } catch {
            // Reading should not fail just because history could not be saved.
          }
        }

        if (data.Manga?.id) {
          const mangaResponse = await api.get(`/mangas/${data.Manga.slug || data.Manga.id}`);
          if (isOk(mangaResponse)) {
            setChapters(Array.isArray(mangaResponse.data.Chapters) ? mangaResponse.data.Chapters : []);
          }
        }
      } catch (err) {
        setError(err.message || "Không tải được chapter");
      } finally {
        setLoading(false);
      }
    }

    loadChapter();
  }, [chapterId, mangaSlug]);

  const sortedImages = useMemo(() => {
    const images = Array.isArray(chapter?.ChapterImages) ? chapter.ChapterImages : [];
    return [...images].sort((a, b) => Number(a.page_number) - Number(b.page_number));
  }, [chapter]);
  const textContent = chapter?.ChapterContent?.content || "";
  const isTextChapter = chapter?.chapter_type === "text";

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number)),
    [chapters]
  );

  const currentIndex = sortedChapters.findIndex(item => Number(item.id) === Number(chapter?.id));
  const previousChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1
    ? sortedChapters[currentIndex + 1]
    : null;
  const manga = chapter?.Manga;
  const token = localStorage.getItem("doctruyen_token");

  useEffect(() => {
    readingProgressRef.current = readingProgress;
  }, [readingProgress]);

  function getCurrentScrollProgress() {
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const position = Math.max(window.scrollY || document.documentElement.scrollTop || 0, 0);
    const progressPercent = Math.min(100, Math.max(0, (position / maxScroll) * 100));

    return {
      progress_percent: Number(progressPercent.toFixed(2)),
      scroll_position: Math.round(position),
    };
  }

  async function saveCurrentProgress(override = {}) {
    if (!chapter?.id || !token) return null;

    const current = getCurrentScrollProgress();
    const payload = {
      chapter_id: chapter.id,
      progress_percent: override.progress_percent ?? current.progress_percent,
      scroll_position: override.scroll_position ?? current.scroll_position,
    };

    const response = await api.post("/reading-history", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (isOk(response)) {
      setReadingProgress(response.data);
      return response.data;
    }
    return null;
  }

  async function goToChapter(targetChapter, options = {}) {
    if (!targetChapter) return;

    if (token && chapter?.id) {
      try {
        if (options.markComplete) {
          const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
          await saveCurrentProgress({ progress_percent: 100, scroll_position: Math.round(maxScroll) });
        } else {
          await saveCurrentProgress();
        }
      } catch {
        // Chapter navigation must still work even if progress saving fails.
      }
    }

    onGoChapter?.(targetChapter, manga);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Some browsers can block fullscreen if it is not triggered by a direct click.
    }
  }

  useEffect(() => {
    if (!isTextChapter || !textContent || !readingProgress || restoredProgressRef.current) return;
    if (Number(readingProgress.chapter_id) !== Number(chapter?.id)) return;

    const timer = window.setTimeout(() => {
      const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const savedPosition = Number(readingProgress.scroll_position || 0);
      const savedPercent = Number(readingProgress.progress_percent || 0);
      const targetPosition = savedPosition || Math.round((maxScroll * savedPercent) / 100);

      if (targetPosition > 0) {
        window.scrollTo({ top: Math.min(targetPosition, maxScroll), behavior: "auto" });
      }

      restoredProgressRef.current = true;
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isTextChapter, textContent, readingProgress, chapter?.id]);

  useEffect(() => {
    if (!chapter?.id || !token) return;

    function saveProgress() {
      const current = getCurrentScrollProgress();
      const savedProgress = readingProgressRef.current;
      const isSameChapter = Number(savedProgress?.chapter_id) === Number(chapter.id);
      const previousPercent = Number(savedProgress?.progress_percent || 0);

      if (isSameChapter && current.progress_percent < previousPercent - 1) {
        return;
      }

      window.clearTimeout(saveProgressTimerRef.current);
      saveProgressTimerRef.current = window.setTimeout(() => {
        api.post(
          "/reading-history",
          {
            chapter_id: chapter.id,
            progress_percent: current.progress_percent,
            scroll_position: current.scroll_position,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        ).then(response => {
          if (isOk(response)) setReadingProgress(response.data);
        }).catch(() => {
          // Reading progress is best-effort; never interrupt the reader.
        });
      }, 900);
    }

    window.addEventListener("scroll", saveProgress, { passive: true });
    saveProgress();

    return () => {
      window.removeEventListener("scroll", saveProgress);
      window.clearTimeout(saveProgressTimerRef.current);
    };
  }, [chapter?.id, token]);

  return (
    <MainLayout className={isFullscreen ? "chapter-reader-page reader-fullscreen" : "chapter-reader-page"}>
      <SiteHeader
        activePage="reader"
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

      {isFullscreen && (
        <button className="chapter-fullscreen-exit" onClick={toggleFullscreen} type="button">
          <Minimize2 size={17} />
          Thoát
        </button>
      )}

      <main className="chapter-reader-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          {manga ? (
            <button onClick={() => onGoDetail?.(manga)} type="button">{manga.title}</button>
          ) : (
            <strong>Truyện</strong>
          )}
          <span>»</span>
          <strong>{formatChapterTitle(chapter)}</strong>
        </div>

        <section className="chapter-reader-head">
          <div>
            <span>
              <BookOpen size={18} />
              Đang đọc
            </span>
            <h1>{manga?.title || "Truyện đang đọc"}</h1>
            <p>{formatChapterTitle(chapter)}</p>
            {readingProgress && Number(readingProgress.chapter_id) === Number(chapter?.id) && (
              <small className="chapter-progress-label">
                Đã đọc {Math.round(Number(readingProgress.progress_percent || 0))}%
              </small>
            )}
          </div>
          <div className="chapter-reader-actions">
            <button disabled={!previousChapter} onClick={() => goToChapter(previousChapter)} type="button">
              <ChevronLeft size={18} />
              Chương trước
            </button>
            <button onClick={() => manga?.id && onGoDetail?.(manga)} type="button">
              <List size={18} />
              Danh sách chương
            </button>
            <button disabled={!nextChapter} onClick={() => goToChapter(nextChapter)} type="button">
              Chương sau
              <ChevronRight size={18} />
            </button>
            <button onClick={toggleFullscreen} type="button">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            </button>
          </div>
        </section>

        {loading ? (
          <div className="empty-state">Đang tải chapter...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : isTextChapter ? (
          textContent ? (
            <section className="chapter-text-reader">
              <div className="chapter-text-meta">
                <span>{chapter.ChapterContent?.word_count || 0} từ</span>
                <span>{chapter.ChapterContent?.reading_time_minutes || 1} phút đọc</span>
              </div>
              <article>{textContent}</article>
            </section>
          ) : (
            <div className="chapter-empty">
              <ImageOff size={46} />
              <h2>Chapter này chưa có nội dung chữ</h2>
              <p>Admin cần nhập nội dung hoặc upload file .txt cho chapter này.</p>
              {manga?.id && (
                <button onClick={() => onGoDetail?.(manga)} type="button">Quay lại chi tiết truyện</button>
              )}
            </div>
          )
        ) : sortedImages.length ? (
          <section className="chapter-image-list">
            {sortedImages.map(image => (
              <figure className="chapter-page-image" key={image.id}>
                <img src={image.image_url} alt={`${formatChapterTitle(chapter)} - trang ${image.page_number}`} />
                <figcaption>Trang {image.page_number}</figcaption>
              </figure>
            ))}
          </section>
        ) : (
          <div className="chapter-empty">
            <ImageOff size={46} />
            <h2>Chapter này chưa có ảnh</h2>
            <p>Admin cần upload ảnh cho chapter trước khi người đọc có thể xem nội dung.</p>
            {manga?.id && (
              <button onClick={() => onGoDetail?.(manga)} type="button">Quay lại chi tiết truyện</button>
            )}
          </div>
        )}

        {!loading && !error && chapter && (
          <section className="chapter-reader-bottom-nav" aria-label="Chuyển chương">
            <button disabled={!previousChapter} onClick={() => goToChapter(previousChapter)} type="button">
              <ChevronLeft size={18} />
              Chương trước
            </button>
            <button onClick={() => manga?.id && onGoDetail?.(manga)} type="button">
              <List size={18} />
              Danh sách chương
            </button>
            <button disabled={!nextChapter} onClick={() => goToChapter(nextChapter, { markComplete: true })} type="button">
              Chương sau
              <ChevronRight size={18} />
            </button>
            <button onClick={toggleFullscreen} type="button">
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              {isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            </button>
          </section>
        )}
      </main>
    </MainLayout>
  );
}
