const express = require('express');
const {
  getDashboard,
  getUsers,
  updateUserRole,
  deleteUser,
  getMangas,
  getMangaById,
  createManga,
  updateManga,
  deleteManga,
  getCategories,
  getChaptersByManga,
  createChapter,
  updateChapter,
  deleteChapter,
} = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get('/dashboard', getDashboard);

router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/mangas', getMangas);
router.post('/mangas', createManga);
router.get('/mangas/:id', getMangaById);
router.put('/mangas/:id', updateManga);
router.delete('/mangas/:id', deleteManga);

router.get('/categories', getCategories);

router.get('/mangas/:mangaId/chapters', getChaptersByManga);
router.post('/chapters', createChapter);
router.put('/chapters/:id', updateChapter);
router.delete('/chapters/:id', deleteChapter);

module.exports = router;
