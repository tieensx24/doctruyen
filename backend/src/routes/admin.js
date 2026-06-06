const express = require('express');
const {
  getDashboard,
  getLatestComments,
  updateCommentStatusByAdmin,
  deleteCommentByAdmin,
  getCommentReportsByAdmin,
  updateCommentReportByAdmin,
  getUsers,
  updateUserRole,
  deleteUser,
  getMangas,
  getMangaById,
  createManga,
  updateManga,
  deleteManga,
  uploadMangaCover,
  getHeroSlidesByAdmin,
  createHeroSlide,
  updateHeroSlide,
  updateHeroSlideStatus,
  deleteHeroSlide,
  uploadCommentSticker,
  getCommentStickersByAdmin,
  updateCommentSticker,
  deleteCommentSticker,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getChaptersByManga,
  createChapter,
  updateChapter,
  deleteChapter,
  uploadChapterImages,
  uploadChapterContent,
} = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { uploadImage, uploadTextFile, handleUploadError } = require('../middlewares/upload');

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get('/dashboard', getDashboard);
router.get('/comments/latest', getLatestComments);
router.put('/comments/:id', updateCommentStatusByAdmin);
router.delete('/comments/:id', deleteCommentByAdmin);
router.get('/comment-reports', getCommentReportsByAdmin);
router.patch('/comment-reports/:id', updateCommentReportByAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

router.get('/mangas', getMangas);
router.post('/mangas', createManga);
router.get('/mangas/:id', getMangaById);
router.put('/mangas/:id', updateManga);
router.delete('/mangas/:id', deleteManga);
router.post('/mangas/:id/cover', uploadImage.single('cover'), handleUploadError, uploadMangaCover);
router.get('/hero-slides', getHeroSlidesByAdmin);
router.post('/hero-slides', uploadImage.single('image'), handleUploadError, createHeroSlide);
router.put('/hero-slides/:id', uploadImage.single('image'), handleUploadError, updateHeroSlide);
router.patch('/hero-slides/:id/status', updateHeroSlideStatus);
router.delete('/hero-slides/:id', deleteHeroSlide);
router.get('/comment-stickers', getCommentStickersByAdmin);
router.post('/comment-stickers', uploadImage.single('sticker'), handleUploadError, uploadCommentSticker);
router.patch('/comment-stickers/:id', updateCommentSticker);
router.delete('/comment-stickers/:id', deleteCommentSticker);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/mangas/:mangaId/chapters', getChaptersByManga);
router.post('/chapters', createChapter);
router.post('/chapters/:id/images', uploadImage.array('images', 30), handleUploadError, uploadChapterImages);
router.post('/chapters/:id/content', uploadTextFile.single('content_file'), handleUploadError, uploadChapterContent);
router.put('/chapters/:id', updateChapter);
router.delete('/chapters/:id', deleteChapter);

module.exports = router;
