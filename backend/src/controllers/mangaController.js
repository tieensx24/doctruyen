const { Manga, Category, Chapter } = require('../models');

const includeMangaDetails = [
  {
    model: Category,
    through: { attributes: [] },
  },
  {
    model: Chapter,
    attributes: ['id', 'chapter_number', 'title', 'view_count', 'created_at'],
  },
];

const getMangas = async (req, res) => {
  try {
    const mangas = await Manga.findAll({
      include: includeMangaDetails,
      order: [['created_at', 'DESC']],
    });
    res.json(mangas);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getMangaById = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.id, {
      include: includeMangaDetails,
      order: [[Chapter, 'chapter_number', 'ASC']],
    });

    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    res.json(manga);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['name', 'ASC']] });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = { getMangas, getMangaById, getCategories };
