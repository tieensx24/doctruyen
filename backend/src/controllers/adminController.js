const {
  User,
  Manga,
  Category,
  Chapter,
  Comment,
  Favorite,
  ReadingHistory,
} = require('../models');

const mangaInclude = [
  {
    model: Category,
    through: { attributes: [] },
  },
  {
    model: Chapter,
    attributes: ['id', 'chapter_number', 'title', 'view_count', 'created_at'],
  },
];

const userSafeAttributes = ['id', 'username', 'email', 'avatar', 'role_id', 'created_at'];

const normalizeCategoryIds = categoryIds => {
  if (!Array.isArray(categoryIds)) return [];
  return categoryIds
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0);
};

const findManga = async id => Manga.findByPk(id, { include: mangaInclude });

const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalMangas,
      totalChapters,
      totalCategories,
      totalComments,
      totalFavorites,
      totalReadingHistories,
      latestMangas,
      latestUsers,
    ] = await Promise.all([
      User.count(),
      Manga.count(),
      Chapter.count(),
      Category.count(),
      Comment.count(),
      Favorite.count(),
      ReadingHistory.count(),
      Manga.findAll({
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'title', 'author', 'status', 'view_count', 'created_at'],
      }),
      User.findAll({
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: userSafeAttributes,
      }),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalMangas,
        totalChapters,
        totalCategories,
        totalComments,
        totalFavorites,
        totalReadingHistories,
      },
      latestMangas,
      latestUsers,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: userSafeAttributes,
      order: [['created_at', 'DESC']],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role_id } = req.body;
    const roleId = Number(role_id);

    if (![1, 2].includes(roleId)) {
      return res.status(400).json({ message: 'role_id chỉ được là 1 (admin) hoặc 2 (user)' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    user.role_id = roleId;
    await user.save();

    res.json({
      message: 'Cập nhật quyền user thành công',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role_id: user.role_id,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Không thể xóa chính tài khoản đang đăng nhập' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    await user.destroy();
    res.json({ message: 'Xóa user thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getMangas = async (req, res) => {
  try {
    const mangas = await Manga.findAll({
      include: mangaInclude,
      order: [['created_at', 'DESC']],
    });
    res.json(mangas);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getMangaById = async (req, res) => {
  try {
    const manga = await findManga(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });
    res.json(manga);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const createManga = async (req, res) => {
  try {
    const { title, description, cover_image, author, status, categoryIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Tên truyện không được để trống' });
    }

    if (status && !['ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái truyện không hợp lệ' });
    }

    const manga = await Manga.create({
      title: title.trim(),
      description,
      cover_image,
      author,
      status: status || 'ongoing',
    });

    const ids = normalizeCategoryIds(categoryIds);
    if (ids.length) await manga.setCategories(ids);

    res.status(201).json({
      message: 'Tạo truyện thành công',
      manga: await findManga(manga.id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateManga = async (req, res) => {
  try {
    const { title, description, cover_image, author, status, categoryIds } = req.body;
    const manga = await Manga.findByPk(req.params.id);

    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: 'Tên truyện không được để trống' });
    }

    if (status && !['ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái truyện không hợp lệ' });
    }

    await manga.update({
      title: title !== undefined ? title.trim() : manga.title,
      description: description !== undefined ? description : manga.description,
      cover_image: cover_image !== undefined ? cover_image : manga.cover_image,
      author: author !== undefined ? author : manga.author,
      status: status || manga.status,
    });

    if (categoryIds !== undefined) {
      await manga.setCategories(normalizeCategoryIds(categoryIds));
    }

    res.json({
      message: 'Cập nhật truyện thành công',
      manga: await findManga(manga.id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteManga = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    await manga.destroy();
    res.json({ message: 'Xóa truyện thành công' });
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

const getChaptersByManga = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const chapters = await Chapter.findAll({
      where: { manga_id: manga.id },
      order: [['chapter_number', 'ASC']],
    });

    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const createChapter = async (req, res) => {
  try {
    const { manga_id, chapter_number, title } = req.body;
    const mangaId = Number(manga_id);
    const chapterNumber = Number(chapter_number);

    if (!mangaId || !chapterNumber) {
      return res.status(400).json({ message: 'manga_id và chapter_number là bắt buộc' });
    }

    const manga = await Manga.findByPk(mangaId);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const chapter = await Chapter.create({
      manga_id: mangaId,
      chapter_number: chapterNumber,
      title,
    });

    res.status(201).json({ message: 'Tạo chapter thành công', chapter });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateChapter = async (req, res) => {
  try {
    const { chapter_number, title } = req.body;
    const chapter = await Chapter.findByPk(req.params.id);

    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    if (chapter_number !== undefined && !Number(chapter_number)) {
      return res.status(400).json({ message: 'chapter_number không hợp lệ' });
    }

    await chapter.update({
      chapter_number: chapter_number !== undefined ? Number(chapter_number) : chapter.chapter_number,
      title: title !== undefined ? title : chapter.title,
    });

    res.json({ message: 'Cập nhật chapter thành công', chapter });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteChapter = async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    await chapter.destroy();
    res.json({ message: 'Xóa chapter thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
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
};
