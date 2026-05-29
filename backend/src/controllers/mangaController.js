const {
  Manga,
  Category,
  Chapter,
  ChapterImage,
  Comment,
  Favorite,
  ReadingHistory,
} = require('../models');

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

const addMangaStats = async (manga) => {
  const data = manga.toJSON ? manga.toJSON() : manga;
  const [commentsCount, followersCount] = await Promise.all([
    Comment.count({ where: { manga_id: data.id } }),
    Favorite.count({ where: { manga_id: data.id } }),
  ]);

  return {
    ...data,
    comments_count: commentsCount,
    followers_count: followersCount,
  };
};

const getMangas = async (req, res) => {
  try {
    const mangas = await Manga.findAll({
      include: includeMangaDetails,
      order: [['created_at', 'DESC']],
    });
    res.json(await Promise.all(mangas.map(addMangaStats)));
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

    res.json(await addMangaStats(manga));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getChapterById = async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.id, {
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'author', 'status', 'cover_image'],
          include: [
            {
              model: Category,
              through: { attributes: [] },
            },
          ],
        },
        {
          model: ChapterImage,
          attributes: ['id', 'image_url', 'page_number'],
          separate: true,
          order: [['page_number', 'ASC']],
        },
      ],
    });

    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const increaseMangaView = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    await manga.increment('view_count');
    await manga.reload();

    res.json({
      id: manga.id,
      view_count: manga.view_count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const increaseChapterView = async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    await chapter.increment('view_count');
    await chapter.reload();

    res.json({
      id: chapter.id,
      view_count: chapter.view_count,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const favoriteInclude = [
  {
    model: Manga,
    attributes: ['id', 'title', 'author', 'status', 'cover_image', 'view_count'],
    include: [
      {
        model: Category,
        through: { attributes: [] },
      },
      {
        model: Chapter,
        attributes: ['id', 'chapter_number', 'title', 'view_count', 'created_at'],
      },
    ],
  },
];

const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.findAll({
      where: { user_id: req.user.id },
      include: favoriteInclude,
      order: [['created_at', 'DESC']],
    });

    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getFavoriteStatus = async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      where: {
        user_id: req.user.id,
        manga_id: req.params.mangaId,
      },
    });

    res.json({ is_favorited: Boolean(favorite) });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const addFavorite = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    await Favorite.findOrCreate({
      where: {
        user_id: req.user.id,
        manga_id: manga.id,
      },
    });

    const favorite = await Favorite.findOne({
      where: {
        user_id: req.user.id,
        manga_id: manga.id,
      },
      include: favoriteInclude,
    });

    res.status(201).json(favorite);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteFavorite = async (req, res) => {
  try {
    const deleted = await Favorite.destroy({
      where: {
        user_id: req.user.id,
        manga_id: req.params.mangaId,
      },
    });

    if (!deleted) return res.status(404).json({ message: 'Khong tim thay truyen dang theo doi' });
    res.json({ message: 'Da xoa truyen khoi danh sach theo doi' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const clearFavorites = async (req, res) => {
  try {
    await Favorite.destroy({ where: { user_id: req.user.id } });
    res.json({ message: 'Da xoa tat ca truyen dang theo doi' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getReadingHistory = async (req, res) => {
  try {
    const histories = await ReadingHistory.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'author', 'status', 'cover_image', 'view_count'],
          include: [
            {
              model: Category,
              through: { attributes: [] },
            },
          ],
        },
        {
          model: Chapter,
          attributes: ['id', 'chapter_number', 'title', 'view_count', 'created_at'],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    res.json(histories);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const saveReadingHistory = async (req, res) => {
  try {
    const chapterId = req.body.chapter_id || req.body.chapterId;
    if (!chapterId) return res.status(400).json({ message: 'Vui long chon chapter' });

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    await ReadingHistory.upsert({
      user_id: req.user.id,
      manga_id: chapter.manga_id,
      chapter_id: chapter.id,
      updated_at: new Date(),
    });

    const history = await ReadingHistory.findOne({
      where: { user_id: req.user.id, manga_id: chapter.manga_id },
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'author', 'status', 'cover_image', 'view_count'],
        },
        {
          model: Chapter,
          attributes: ['id', 'chapter_number', 'title', 'view_count', 'created_at'],
        },
      ],
    });

    res.status(201).json(history);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteReadingHistory = async (req, res) => {
  try {
    const deleted = await ReadingHistory.destroy({
      where: { user_id: req.user.id, manga_id: req.params.mangaId },
    });

    if (!deleted) return res.status(404).json({ message: 'Khong tim thay lich su doc' });
    res.json({ message: 'Da xoa lich su doc' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const clearReadingHistory = async (req, res) => {
  try {
    await ReadingHistory.destroy({ where: { user_id: req.user.id } });
    res.json({ message: 'Da xoa tat ca lich su doc' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
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

module.exports = {
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
};
