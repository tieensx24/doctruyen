const express = require('express');
const {
  getMangas,
  getMangaById,
  getChapterById,
  increaseMangaView,
  increaseChapterView,
  getFavorites,
  getFavoriteStatus,
  addFavorite,
  deleteFavorite,
  clearFavorites,
  getReadingHistory,
  saveReadingHistory,
  deleteReadingHistory,
  clearReadingHistory,
  getCategories,
} = require('../controllers/mangaController');
const { verifyToken } = require('../middlewares/auth');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/favorites', verifyToken, getFavorites);
router.delete('/favorites', verifyToken, clearFavorites);
router.get('/favorites/:mangaId', verifyToken, getFavoriteStatus);
router.post('/favorites/:mangaId', verifyToken, addFavorite);
router.delete('/favorites/:mangaId', verifyToken, deleteFavorite);
router.get('/reading-history', verifyToken, getReadingHistory);
router.post('/reading-history', verifyToken, saveReadingHistory);
router.delete('/reading-history', verifyToken, clearReadingHistory);
router.delete('/reading-history/:mangaId', verifyToken, deleteReadingHistory);
router.get('/mangas', getMangas);
router.post('/mangas/:id/view', increaseMangaView);
router.get('/mangas/:id', getMangaById);
router.post('/chapters/:id/view', increaseChapterView);
router.get('/chapters/:id', getChapterById);

module.exports = router;
