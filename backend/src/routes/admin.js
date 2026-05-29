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
  uploadMangaCover,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getChaptersByManga,
  createChapter,
  updateChapter,
  deleteChapter,
  uploadChapterImages,
} = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { uploadImage, handleUploadError } = require('../middlewares/upload');

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
router.post('/mangas/:id/cover', uploadImage.single('cover'), handleUploadError, uploadMangaCover);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/mangas/:mangaId/chapters', getChaptersByManga);
router.post('/chapters', createChapter);
router.post('/chapters/:id/images', uploadImage.array('images', 30), handleUploadError, uploadChapterImages);
router.put('/chapters/:id', updateChapter);
router.delete('/chapters/:id', deleteChapter);

module.exports = router;
