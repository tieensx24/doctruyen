export function getMangaSlug(mangaOrId) {
  if (mangaOrId && typeof mangaOrId === "object") {
    return mangaOrId.slug || mangaOrId.id;
  }

  return mangaOrId;
}

export function getChapterSlug(chapterOrId) {
  if (chapterOrId && typeof chapterOrId === "object") {
    return chapterOrId.slug || `chapter-${chapterOrId.chapter_number || chapterOrId.id}`;
  }

  return chapterOrId;
}

export function getMangaPath(mangaOrId) {
  const slug = getMangaSlug(mangaOrId);
  return slug ? `/truyen/${slug}` : "/truyen";
}

export function getChapterPath(chapterOrId, manga) {
  const mangaSlug = getMangaSlug(manga);
  const chapterSlug = getChapterSlug(chapterOrId);

  if (mangaSlug && chapterSlug && typeof chapterOrId === "object") {
    return `/truyen/${mangaSlug}/${chapterSlug}`;
  }

  return chapterSlug ? `/chapter/${chapterSlug}` : "/truyen";
}
