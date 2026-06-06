const express = require('express');
const {
  getMangas,
  searchMangas,
  getMangaById,
  getChapterById,
  increaseMangaView,
  increaseChapterView,
  getCommentsByManga,
  getCommentsByChapter,
  createComment,
  updateComment,
  deleteComment,
  setCommentReaction,
  deleteCommentReaction,
  reportComment,
  getActiveCommentStickers,
  getFavorites,
  getFavoriteStatus,
  addFavorite,
  deleteFavorite,
  clearFavorites,
  getReadingHistory,
  getReadingHistoryByManga,
  saveReadingHistory,
  deleteReadingHistory,
  clearReadingHistory,
  getMangaRating,
  setMangaRating,
  getHeroSlides,
  getCategories,
} = require('../controllers/mangaController');
const { verifyToken, optionalVerifyToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/hero-slides', getHeroSlides);
router.get('/favorites', verifyToken, getFavorites);
router.delete('/favorites', verifyToken, clearFavorites);
router.get('/favorites/:mangaId', verifyToken, getFavoriteStatus);
router.post('/favorites/:mangaId', verifyToken, addFavorite);
router.delete('/favorites/:mangaId', verifyToken, deleteFavorite);
router.get('/reading-history', verifyToken, getReadingHistory);
router.post('/reading-history', verifyToken, saveReadingHistory);
router.delete('/reading-history', verifyToken, clearReadingHistory);
router.get('/reading-history/:mangaId', verifyToken, getReadingHistoryByManga);
router.delete('/reading-history/:mangaId', verifyToken, deleteReadingHistory);
router.get('/search', searchMangas);
router.get('/mangas', getMangas);
router.post('/mangas/:id/view', optionalVerifyToken, increaseMangaView);
router.get('/mangas/:mangaId/rating', verifyToken, getMangaRating);
router.post('/mangas/:mangaId/rating', verifyToken, setMangaRating);
router.get('/comment-stickers', getActiveCommentStickers);
router.post('/comments', verifyToken, createComment);
router.get('/comments/manga/:mangaId', optionalVerifyToken, getCommentsByManga);
router.get('/comments/chapter/:chapterId', optionalVerifyToken, getCommentsByChapter);
router.get('/mangas/:id/comments', optionalVerifyToken, getCommentsByManga);
router.post('/mangas/:id/comments', verifyToken, createComment);
router.get('/mangas/:mangaSlug/chapters/:chapterSlug', getChapterById);
router.get('/mangas/:id', getMangaById);
router.put('/comments/:commentId', verifyToken, updateComment);
router.delete('/comments/:commentId', verifyToken, deleteComment);
router.post('/comments/:commentId/reactions', verifyToken, setCommentReaction);
router.delete('/comments/:commentId/reactions', verifyToken, deleteCommentReaction);
router.post('/comments/:commentId/reports', verifyToken, reportComment);
router.post('/chapters/:id/view', optionalVerifyToken, increaseChapterView);
router.get('/chapters/:id', getChapterById);

module.exports = router;
