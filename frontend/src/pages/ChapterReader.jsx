import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Home, ImageOff, List } from "lucide-react";
import MainLayout from "../components/MainLayout.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import api, { isOk } from "../api/client.js";

function formatChapterTitle(chapter) {
  if (!chapter) return "Chapter";
  return chapter.title || `Chapter ${chapter.chapter_number}`;
}

export default function ChapterReader({
  chapterId,
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

  useEffect(() => {
    async function loadChapter() {
      if (!chapterId) return;

      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/chapters/${chapterId}`);
        if (!isOk(response)) throw new Error("Không tìm thấy chapter");
        const data = response.data;
        setChapter(data);

        try {
          const viewResponse = await api.post(`/chapters/${data.id}/view`);
          if (isOk(viewResponse)) {
            setChapter(current => current ? {
              ...current,
              view_count: viewResponse.data.view_count,
            } : current);
          }
        } catch {
          // Keep the reader usable even if view tracking fails.
        }

        const token = localStorage.getItem("doctruyen_token");
        if (token) {
          try {
            await api.post(
              "/reading-history",
              { chapter_id: data.id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch {
            // Reading should not fail just because history could not be saved.
          }
        }

        if (data.Manga?.id) {
          const mangaResponse = await api.get(`/mangas/${data.Manga.id}`);
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
  }, [chapterId]);

  const sortedImages = useMemo(() => {
    const images = Array.isArray(chapter?.ChapterImages) ? chapter.ChapterImages : [];
    return [...images].sort((a, b) => Number(a.page_number) - Number(b.page_number));
  }, [chapter]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => Number(a.chapter_number) - Number(b.chapter_number)),
    [chapters]
  );

  const currentIndex = sortedChapters.findIndex(item => Number(item.id) === Number(chapterId));
  const previousChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1
    ? sortedChapters[currentIndex + 1]
    : null;
  const manga = chapter?.Manga;

  return (
    <MainLayout className="chapter-reader-page">
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

      <main className="chapter-reader-shell">
        <div className="breadcrumb">
          <button onClick={onGoHome} type="button">Trang chủ</button>
          <span>»</span>
          {manga ? (
            <button onClick={() => onGoDetail?.(manga.id)} type="button">{manga.title}</button>
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
          </div>
          <div className="chapter-reader-actions">
            <button disabled={!previousChapter} onClick={() => onGoChapter?.(previousChapter.id)} type="button">
              <ChevronLeft size={18} />
              Chương trước
            </button>
            <button onClick={() => manga?.id && onGoDetail?.(manga.id)} type="button">
              <List size={18} />
              Danh sách chương
            </button>
            <button disabled={!nextChapter} onClick={() => onGoChapter?.(nextChapter.id)} type="button">
              Chương sau
              <ChevronRight size={18} />
            </button>
          </div>
        </section>

        {loading ? (
          <div className="empty-state">Đang tải chapter...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
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
              <button onClick={() => onGoDetail?.(manga.id)} type="button">Quay lại chi tiết truyện</button>
            )}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
