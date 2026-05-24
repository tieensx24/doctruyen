const express = require('express');
const { getMangas, getMangaById, getCategories } = require('../controllers/mangaController');

const router = express.Router();

router.get('/categories', getCategories);
router.get('/mangas', getMangas);
router.get('/mangas/:id', getMangaById);

module.exports = router;
