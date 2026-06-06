const {
  User,
  Manga,
  Category,
  Chapter,
  ChapterContent,
  ChapterImage,
  Comment,
  CommentReport,
  CommentSticker,
  Favorite,
  HeroSlide,
  ReadingHistory,
  ViewLog,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} = require('../config/cloudinary');
const { makeChapterSlug, makeUniqueSlug } = require('../utils/slug');

const mangaInclude = [
  {
    model: Category,
    through: { attributes: [] },
  },
  {
    model: Chapter,
    attributes: ['id', 'chapter_number', 'slug', 'title', 'view_count', 'created_at'],
  },
];

const userSafeAttributes = ['id', 'username', 'email', 'avatar', 'role_id', 'created_at'];

const normalizeCategoryIds = categoryIds => {
  if (!Array.isArray(categoryIds)) return [];
  return categoryIds
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0);
};

const makeSlug = value => value
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const findManga = async id => Manga.findByPk(id, { include: mangaInclude });

const normalizeListSearch = value => String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100);

const getPaginationParams = (req, defaultLimit = 20, maxLimit = 100) => {
  const hasPagination = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || defaultLimit, 1), maxLimit);
  return {
    hasPagination,
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const makePaginationPayload = (items, totalItems, page, limit) => ({
  items,
  pagination: {
    page,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / limit)),
  },
});

const getMangaOrder = sort => {
  switch (String(sort || '').toLowerCase()) {
    case 'oldest':
      return [['created_at', 'ASC']];
    case 'views':
    case 'view_desc':
      return [['view_count', 'DESC'], ['created_at', 'DESC']];
    case 'title':
    case 'title_asc':
      return [['title', 'ASC']];
    case 'updated':
      return [['updated_at', 'DESC']];
    default:
      return [['created_at', 'DESC']];
  }
};

const getMangaListQuery = req => {
  const where = {};
  const keyword = normalizeListSearch(req.query.search || req.query.q);
  const status = String(req.query.status || '').trim();
  const categoryId = Number(req.query.categoryId || req.query.category_id);

  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { alternative_names: { [Op.like]: `%${keyword}%` } },
      { author: { [Op.like]: `%${keyword}%` } },
    ];
  }

  if (['ongoing', 'completed'].includes(status)) where.status = status;

  const include = mangaInclude.map(item => ({ ...item }));
  if (categoryId) {
    include[0] = {
      ...include[0],
      where: { id: categoryId },
      required: true,
    };
  }

  return {
    where,
    include,
    order: getMangaOrder(req.query.sort),
  };
};

const getChapterOrder = sort => {
  switch (String(sort || '').toLowerCase()) {
    case 'newest':
      return [['created_at', 'DESC']];
    case 'oldest':
      return [['created_at', 'ASC']];
    case 'views':
      return [['view_count', 'DESC'], ['chapter_number', 'ASC']];
    case 'number_desc':
      return [['chapter_number', 'DESC']];
    default:
      return [['chapter_number', 'ASC']];
  }
};

const getChapterListQuery = (req, mangaId) => {
  const where = { manga_id: mangaId };
  const keyword = normalizeListSearch(req.query.search || req.query.q);
  const chapterType = String(req.query.chapterType || req.query.chapter_type || '').trim();

  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      sequelize.where(sequelize.cast(sequelize.col('Chapter.chapter_number'), 'CHAR'), {
        [Op.like]: `%${keyword}%`,
      }),
    ];
  }

  if (['image', 'text'].includes(chapterType)) where.chapter_type = chapterType;

  return {
    where,
    order: getChapterOrder(req.query.sort),
  };
};

const normalizeChapterType = value => (
  String(value || 'image').trim().toLowerCase() === 'text' ? 'text' : 'image'
);

const getChapterContentStats = content => {
  const cleanContent = String(content || '').replace(/^\uFEFF/, '').trim();
  const words = cleanContent ? cleanContent.split(/\s+/).filter(Boolean).length : 0;
  return {
    content: cleanContent,
    word_count: words,
    reading_time_minutes: Math.max(1, Math.ceil(words / 450)),
  };
};

const saveChapterContent = async (chapterId, content) => {
  const stats = getChapterContentStats(content);
  if (!stats.content) return null;

  const [row] = await ChapterContent.findOrCreate({
    where: { chapter_id: chapterId },
    defaults: {
      chapter_id: chapterId,
      ...stats,
    },
  });

  if (row.content !== stats.content) {
    await row.update(stats);
  }

  return row;
};

const formatSqlDate = value => value.toISOString().slice(0, 10);

const getPeriodStart = daysBack => {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getRecentViewStats = async () => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return formatSqlDate(date);
  });

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 6);
  fromDate.setHours(0, 0, 0, 0);

  const rows = await ViewLog.findAll({
    where: {
      created_at: { [Op.gte]: fromDate },
    },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
      'target_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: [sequelize.fn('DATE', sequelize.col('created_at')), 'target_type'],
    raw: true,
  });

  const countMap = rows.reduce((map, row) => {
    const date = row.date instanceof Date ? formatSqlDate(row.date) : String(row.date);
    map[`${date}:${row.target_type}`] = Number(row.count) || 0;
    return map;
  }, {});

  return days.map(date => {
    const manga = countMap[`${date}:manga`] || 0;
    const chapter = countMap[`${date}:chapter`] || 0;
    return {
      date,
      manga,
      chapter,
      total: manga + chapter,
    };
  });
};

const countViewsByTarget = async fromDate => {
  const rows = await ViewLog.findAll({
    where: {
      created_at: { [Op.gte]: fromDate },
    },
    attributes: [
      'target_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['target_type'],
    raw: true,
  });

  return rows.reduce((result, row) => {
    result[row.target_type] = Number(row.count) || 0;
    return result;
  }, { manga: 0, chapter: 0 });
};

const getTopGrowthMangas = async () => {
  const rows = await ViewLog.findAll({
    where: {
      target_type: 'manga',
      manga_id: { [Op.ne]: null },
      created_at: { [Op.gte]: getPeriodStart(6) },
    },
    attributes: [
      'manga_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'recent_views'],
    ],
    group: ['manga_id'],
    order: [[sequelize.literal('recent_views'), 'DESC']],
    limit: 5,
    raw: true,
  });

  const mangaIds = rows.map(row => row.manga_id).filter(Boolean);
  if (!mangaIds.length) return [];

  const mangas = await Manga.findAll({
    where: { id: { [Op.in]: mangaIds } },
    attributes: ['id', 'title', 'slug', 'author', 'view_count'],
  });
  const mangaMap = new Map(mangas.map(manga => [Number(manga.id), manga.toJSON()]));

  return rows
    .map(row => ({
      ...mangaMap.get(Number(row.manga_id)),
      recent_views: Number(row.recent_views) || 0,
    }))
    .filter(item => item.id);
};

const commentAdminInclude = [
  {
    model: User,
    attributes: ['id', 'username', 'email', 'role_id'],
  },
  {
    model: Manga,
    attributes: ['id', 'title', 'slug'],
  },
  {
    model: Chapter,
    attributes: ['id', 'chapter_number', 'slug', 'title'],
  },
  {
    model: CommentSticker,
    as: 'Sticker',
    attributes: ['id', 'name', 'image_url', 'public_id', 'type', 'status'],
  },
];

const reportAdminInclude = [
  {
    model: User,
    as: 'Reporter',
    attributes: ['id', 'username', 'email', 'role_id'],
  },
  {
    model: Comment,
    include: commentAdminInclude,
  },
];

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
      viewStats,
      totalMangaViews,
      totalChapterViews,
      todayViews,
      sevenDayViews,
      thirtyDayViews,
      topViewedMangas,
      topViewedChapters,
      topGrowthMangas,
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
        attributes: ['id', 'title', 'slug', 'author', 'status', 'view_count', 'created_at'],
      }),
      User.findAll({
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: userSafeAttributes,
      }),
      getRecentViewStats(),
      Manga.sum('view_count'),
      Chapter.sum('view_count'),
      countViewsByTarget(getPeriodStart(0)),
      countViewsByTarget(getPeriodStart(6)),
      countViewsByTarget(getPeriodStart(29)),
      Manga.findAll({
        limit: 5,
        order: [['view_count', 'DESC']],
        attributes: ['id', 'title', 'slug', 'author', 'status', 'view_count'],
      }),
      Chapter.findAll({
        limit: 5,
        order: [['view_count', 'DESC']],
        attributes: ['id', 'manga_id', 'chapter_number', 'slug', 'title', 'view_count'],
        include: [{
          model: Manga,
          attributes: ['id', 'title', 'slug'],
        }],
      }),
      getTopGrowthMangas(),
    ]);

    const safeTotalMangaViews = Number(totalMangaViews) || 0;
    const safeTotalChapterViews = Number(totalChapterViews) || 0;
    const totalSystemViews = safeTotalMangaViews + safeTotalChapterViews;

    res.json({
      stats: {
        totalUsers,
        totalMangas,
        totalChapters,
        totalCategories,
        totalComments,
        totalFavorites,
        totalReadingHistories,
        totalMangaViews: safeTotalMangaViews,
        totalChapterViews: safeTotalChapterViews,
        totalSystemViews,
      },
      viewSummary: {
        today: {
          ...todayViews,
          total: (todayViews.manga || 0) + (todayViews.chapter || 0),
        },
        last7Days: {
          ...sevenDayViews,
          total: (sevenDayViews.manga || 0) + (sevenDayViews.chapter || 0),
        },
        last30Days: {
          ...thirtyDayViews,
          total: (thirtyDayViews.manga || 0) + (thirtyDayViews.chapter || 0),
        },
        ratio: {
          manga: totalSystemViews ? Math.round((safeTotalMangaViews / totalSystemViews) * 100) : 0,
          chapter: totalSystemViews ? Math.round((safeTotalChapterViews / totalSystemViews) * 100) : 0,
        },
      },
      latestMangas,
      latestUsers,
      viewStats,
      topViewedMangas,
      topViewedChapters,
      topGrowthMangas,
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

const getLatestComments = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const comments = await Comment.findAll({
      include: commentAdminInclude,
      order: [['created_at', 'DESC']],
      limit,
    });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const updateCommentStatusByAdmin = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });

    const status = String(req.body.status || '').trim();
    if (!['visible', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({ message: 'Trang thai binh luan khong hop le' });
    }

    await comment.update({ status });

    const updatedComment = await Comment.findByPk(comment.id, {
      include: commentAdminInclude,
    });

    res.json({
      message: 'Da cap nhat trang thai binh luan',
      comment: updatedComment,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteCommentByAdmin = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });

    await comment.update({ status: 'deleted' });
    res.json({ message: 'Da xoa mem binh luan' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getCommentReportsByAdmin = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const where = {};
    const status = String(req.query.status || '').trim();
    if (status && status !== 'all') where.status = status;

    const reports = await CommentReport.findAll({
      where,
      include: reportAdminInclude,
      order: [['created_at', 'DESC']],
      limit,
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const updateCommentReportByAdmin = async (req, res) => {
  try {
    const report = await CommentReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ message: 'Khong tim thay bao cao' });

    const status = String(req.body.status || '').trim();
    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trang thai bao cao khong hop le' });
    }

    await report.update({ status });

    const updatedReport = await CommentReport.findByPk(report.id, {
      include: reportAdminInclude,
    });

    res.json({
      message: 'Da cap nhat bao cao',
      report: updatedReport,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
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
    const { hasPagination, page, limit, offset } = getPaginationParams(req);
    const query = getMangaListQuery(req);

    if (!hasPagination) {
      const mangas = await Manga.findAll(query);
      return res.json(mangas);
    }

    const { rows, count } = await Manga.findAndCountAll({
      ...query,
      limit,
      offset,
      distinct: true,
    });

    res.json(makePaginationPayload(rows, count, page, limit));
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
    const { title, alternative_names, description, cover_image, banner_image, author, status, categoryIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Tên truyện không được để trống' });
    }

    if (status && !['ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái truyện không hợp lệ' });
    }

    const nextTitle = title.trim();
    const manga = await Manga.create({
      title: nextTitle,
      slug: await makeUniqueSlug(Manga, nextTitle, { fallback: 'truyen' }),
      alternative_names: alternative_names ? String(alternative_names).trim() : null,
      description,
      cover_image,
      banner_image,
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
    const { title, alternative_names, description, cover_image, banner_image, author, status, categoryIds } = req.body;
    const manga = await Manga.findByPk(req.params.id);

    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ message: 'Tên truyện không được để trống' });
    }

    if (status && !['ongoing', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái truyện không hợp lệ' });
    }

    const nextTitle = title !== undefined ? title.trim() : manga.title;
    const shouldUpdateSlug = title !== undefined || !manga.slug;

    await manga.update({
      title: nextTitle,
      slug: shouldUpdateSlug
        ? await makeUniqueSlug(Manga, nextTitle, { fallback: 'truyen', excludeId: manga.id })
        : manga.slug,
      alternative_names: alternative_names !== undefined ? String(alternative_names).trim() || null : manga.alternative_names,
      description: description !== undefined ? description : manga.description,
      cover_image: cover_image !== undefined ? cover_image : manga.cover_image,
      banner_image: banner_image !== undefined ? banner_image : manga.banner_image,
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

const uploadMangaCover = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ message: 'Cloudinary chưa được cấu hình' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh bìa' });
    }

    const manga = await Manga.findByPk(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'doctruyen/covers',
      resource_type: 'image',
      public_id: `manga-${manga.id}-${Date.now()}`,
      overwrite: true,
    });

    await manga.update({ cover_image: result.secure_url });

    res.json({
      message: 'Upload ảnh bìa thành công',
      cover_image: result.secure_url,
      manga: await findManga(manga.id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload ảnh bìa thất bại', error: error.message });
  }
};

const normalizeBooleanInput = value => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return true;
};

const getHeroSlideInclude = () => [
  {
    model: Manga,
    attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'banner_image'],
  },
];

const getHeroSlidesByAdmin = async (req, res) => {
  try {
    const slides = await HeroSlide.findAll({
      include: getHeroSlideInclude(),
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
    });
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getHeroSlideImageUrl = async (req, slideId = Date.now()) => {
  if (req.file) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary chua duoc cau hinh');
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'doctruyen/hero-slides',
      resource_type: 'image',
      public_id: `hero-${slideId}-${Date.now()}`,
      overwrite: true,
    });
    return result.secure_url;
  }

  return String(req.body.image_url || '').trim();
};

const createHeroSlide = async (req, res) => {
  try {
    const mangaId = Number(req.body.manga_id || req.body.mangaId);
    if (!mangaId) return res.status(400).json({ message: 'Vui long chon truyen' });

    const manga = await Manga.findByPk(mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    const imageUrl = await getHeroSlideImageUrl(req);
    if (!imageUrl) return res.status(400).json({ message: 'Vui long chon anh hero hoac nhap URL anh' });

    const slide = await HeroSlide.create({
      manga_id: mangaId,
      title: String(req.body.title || '').trim() || manga.title,
      subtitle: String(req.body.subtitle || '').trim() || manga.description?.slice(0, 255) || '',
      image_url: imageUrl,
      sort_order: Number(req.body.sort_order || req.body.sortOrder || 0),
      is_active: normalizeBooleanInput(req.body.is_active ?? req.body.isActive),
    });

    if (!manga.banner_image && imageUrl) {
      await manga.update({ banner_image: imageUrl });
    }

    res.status(201).json(await HeroSlide.findByPk(slide.id, { include: getHeroSlideInclude() }));
  } catch (error) {
    res.status(500).json({ message: 'Luu hero slide that bai', error: error.message });
  }
};

const updateHeroSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findByPk(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Khong tim thay hero slide' });

    const mangaId = Number(req.body.manga_id || req.body.mangaId || slide.manga_id);
    const manga = await Manga.findByPk(mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    const imageUrl = await getHeroSlideImageUrl(req, slide.id);
    await slide.update({
      manga_id: mangaId,
      title: req.body.title !== undefined ? String(req.body.title || '').trim() : slide.title,
      subtitle: req.body.subtitle !== undefined ? String(req.body.subtitle || '').trim() : slide.subtitle,
      image_url: imageUrl || slide.image_url,
      sort_order: req.body.sort_order !== undefined || req.body.sortOrder !== undefined
        ? Number(req.body.sort_order || req.body.sortOrder || 0)
        : slide.sort_order,
      is_active: req.body.is_active !== undefined || req.body.isActive !== undefined
        ? normalizeBooleanInput(req.body.is_active ?? req.body.isActive)
        : slide.is_active,
    });

    res.json(await HeroSlide.findByPk(slide.id, { include: getHeroSlideInclude() }));
  } catch (error) {
    res.status(500).json({ message: 'Cap nhat hero slide that bai', error: error.message });
  }
};

const updateHeroSlideStatus = async (req, res) => {
  try {
    const slide = await HeroSlide.findByPk(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Khong tim thay hero slide' });

    await slide.update({ is_active: normalizeBooleanInput(req.body.is_active ?? req.body.isActive) });
    res.json(await HeroSlide.findByPk(slide.id, { include: getHeroSlideInclude() }));
  } catch (error) {
    res.status(500).json({ message: 'Cap nhat trang thai hero that bai', error: error.message });
  }
};

const deleteHeroSlide = async (req, res) => {
  try {
    const slide = await HeroSlide.findByPk(req.params.id);
    if (!slide) return res.status(404).json({ message: 'Khong tim thay hero slide' });

    await slide.destroy();
    res.json({ message: 'Da xoa hero slide' });
  } catch (error) {
    res.status(500).json({ message: 'Xoa hero slide that bai', error: error.message });
  }
};

const uploadCommentSticker = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ message: 'Cloudinary chua duoc cau hinh' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui long chon anh sticker' });
    }

    const name = String(req.body.name || req.file.originalname || `sticker-${Date.now()}`)
      .trim()
      .replace(/\.[^.]+$/, '')
      .slice(0, 100);

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: 'doctruyen/stickers',
      resource_type: 'image',
      public_id: `${name}-${Date.now()}`,
      overwrite: true,
    });

    const sticker = await CommentSticker.create({
      name,
      image_url: result.secure_url,
      public_id: result.public_id,
      type: req.body.type || 'sticker',
      status: req.body.status || 'active',
    });

    res.status(201).json({
      message: 'Upload sticker thanh cong',
      sticker,
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload sticker that bai', error: error.message });
  }
};

const getCommentStickersByAdmin = async (req, res) => {
  try {
    const stickers = await CommentSticker.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json(stickers);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const updateCommentSticker = async (req, res) => {
  try {
    const sticker = await CommentSticker.findByPk(req.params.id);
    if (!sticker) return res.status(404).json({ message: 'Khong tim thay sticker' });

    const nextStatus = req.body.status !== undefined ? String(req.body.status).trim() : sticker.status;
    if (!['active', 'inactive'].includes(nextStatus)) {
      return res.status(400).json({ message: 'Trang thai sticker khong hop le' });
    }

    const nextName = req.body.name !== undefined ? String(req.body.name).trim() : sticker.name;
    if (!nextName) return res.status(400).json({ message: 'Ten sticker khong duoc de trong' });

    await sticker.update({
      name: nextName.slice(0, 100),
      type: req.body.type !== undefined ? String(req.body.type).trim() || 'sticker' : sticker.type,
      status: nextStatus,
    });

    res.json({
      message: 'Da cap nhat sticker',
      sticker,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteCommentSticker = async (req, res) => {
  try {
    const sticker = await CommentSticker.findByPk(req.params.id);
    if (!sticker) return res.status(404).json({ message: 'Khong tim thay sticker' });

    if (isCloudinaryConfigured() && sticker.public_id) {
      await cloudinary.uploader.destroy(sticker.public_id).catch(() => null);
    }

    await Comment.update(
      { sticker_id: null },
      { where: { sticker_id: sticker.id } }
    );
    await sticker.destroy();
    res.json({ message: 'Da xoa sticker' });
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

const createCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Tên thể loại không được để trống' });
    }

    const finalSlug = makeSlug(slug || name);
    if (!finalSlug) {
      return res.status(400).json({ message: 'Slug thể loại không hợp lệ' });
    }

    const category = await Category.create({
      name: name.trim(),
      slug: finalSlug,
    });

    res.status(201).json({ message: 'Tạo thể loại thành công', category });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Tên hoặc slug thể loại đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, slug } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) return res.status(404).json({ message: 'Không tìm thấy thể loại' });

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Tên thể loại không được để trống' });
    }

    const nextName = name !== undefined ? name.trim() : category.name;
    const nextSlug = slug !== undefined ? makeSlug(slug) : makeSlug(nextName);

    if (!nextSlug) {
      return res.status(400).json({ message: 'Slug thể loại không hợp lệ' });
    }

    await category.update({
      name: nextName,
      slug: nextSlug,
    });

    res.json({ message: 'Cập nhật thể loại thành công', category });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Tên hoặc slug thể loại đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) return res.status(404).json({ message: 'Không tìm thấy thể loại' });

    await category.destroy();
    res.json({ message: 'Xóa thể loại thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const getChaptersByManga = async (req, res) => {
  try {
    const manga = await Manga.findByPk(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const { hasPagination, page, limit, offset } = getPaginationParams(req);
    const query = getChapterListQuery(req, manga.id);
    const chapterInclude = [
      {
        model: ChapterImage,
        attributes: ['id', 'image_url', 'page_number'],
        separate: true,
        order: [['page_number', 'ASC']],
      },
      {
        model: ChapterContent,
        attributes: ['id', 'content', 'word_count', 'reading_time_minutes', 'updated_at'],
      },
    ];

    if (!hasPagination) {
      const chapters = await Chapter.findAll({
        ...query,
        include: chapterInclude,
      });
      return res.json(chapters);
    }

    const { rows, count } = await Chapter.findAndCountAll({
      ...query,
      include: [
        {
          model: ChapterImage,
          attributes: ['id', 'image_url', 'page_number'],
          separate: true,
          order: [['page_number', 'ASC']],
        },
        {
          model: ChapterContent,
          attributes: ['id', 'content', 'word_count', 'reading_time_minutes', 'updated_at'],
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    res.json(makePaginationPayload(rows, count, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const createChapter = async (req, res) => {
  try {
    const { manga_id, chapter_number, title, chapter_type, content } = req.body;
    const mangaId = Number(manga_id);
    const chapterNumber = Number(chapter_number);
    const nextChapterType = normalizeChapterType(chapter_type);

    if (!mangaId || !chapterNumber) {
      return res.status(400).json({ message: 'manga_id và chapter_number là bắt buộc' });
    }

    const manga = await Manga.findByPk(mangaId);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const chapter = await Chapter.create({
      manga_id: mangaId,
      chapter_number: chapterNumber,
      slug: await makeUniqueSlug(
        Chapter,
        makeChapterSlug(chapterNumber, title),
        { fallback: `chapter-${chapterNumber}`, where: { manga_id: mangaId } }
      ),
      title,
      chapter_type: nextChapterType,
    });

    if (nextChapterType === 'text' && content !== undefined) {
      await saveChapterContent(chapter.id, content);
    }

    res.status(201).json({ message: 'Tạo chapter thành công', chapter });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const updateChapter = async (req, res) => {
  try {
    const { chapter_number, title, chapter_type, content } = req.body;
    const chapter = await Chapter.findByPk(req.params.id);

    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    if (chapter_number !== undefined && !Number(chapter_number)) {
      return res.status(400).json({ message: 'chapter_number không hợp lệ' });
    }

    const nextChapterType = chapter_type !== undefined ? normalizeChapterType(chapter_type) : chapter.chapter_type;
    const nextChapterNumber = chapter_number !== undefined ? Number(chapter_number) : chapter.chapter_number;
    const nextTitle = title !== undefined ? title : chapter.title;
    const shouldUpdateSlug = chapter_number !== undefined || title !== undefined || !chapter.slug;

    await chapter.update({
      chapter_number: nextChapterNumber,
      slug: shouldUpdateSlug
        ? await makeUniqueSlug(
          Chapter,
          makeChapterSlug(nextChapterNumber, nextTitle),
          { fallback: `chapter-${nextChapterNumber}`, excludeId: chapter.id, where: { manga_id: chapter.manga_id } }
        )
        : chapter.slug,
      title: nextTitle,
      chapter_type: nextChapterType,
    });

    if (nextChapterType === 'text' && content !== undefined) {
      await saveChapterContent(chapter.id, content);
    }

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

const uploadChapterImages = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ message: 'Cloudinary chưa được cấu hình' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Vui lòng chọn ảnh chapter' });
    }

    const chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    if (chapter.chapter_type !== 'image') {
      await chapter.update({ chapter_type: 'image' });
    }

    const existingCount = await ChapterImage.count({ where: { chapter_id: chapter.id } });
    const uploadedImages = [];

    for (const [index, file] of req.files.entries()) {
      const pageNumber = existingCount + index + 1;
      const result = await uploadBufferToCloudinary(file.buffer, {
        folder: `doctruyen/chapters/${chapter.id}`,
        resource_type: 'image',
        public_id: `chapter-${chapter.id}-page-${pageNumber}-${Date.now()}`,
        overwrite: true,
      });

      uploadedImages.push({
        chapter_id: chapter.id,
        image_url: result.secure_url,
        page_number: pageNumber,
      });
    }

    await ChapterImage.bulkCreate(uploadedImages);

    const images = await ChapterImage.findAll({
      where: { chapter_id: chapter.id },
      order: [['page_number', 'ASC']],
    });

    res.status(201).json({
      message: 'Upload ảnh chapter thành công',
      images,
    });
  } catch (error) {
    res.status(500).json({ message: 'Upload ảnh chapter thất bại', error: error.message });
  }
};

const uploadChapterContent = async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    let content = '';
    if (req.file) {
      content = req.file.buffer.toString('utf8');
    } else if (req.body.content !== undefined) {
      content = String(req.body.content);
    }

    const stats = getChapterContentStats(content);
    if (!stats.content) {
      return res.status(400).json({ message: 'Noi dung chapter khong duoc de trong' });
    }

    await chapter.update({ chapter_type: 'text' });
    const chapterContent = await saveChapterContent(chapter.id, stats.content);

    res.json({
      message: 'Da cap nhat noi dung truyen chu',
      content: chapterContent,
    });
  } catch (error) {
    res.status(500).json({ message: 'Luu noi dung chapter that bai', error: error.message });
  }
};

module.exports = {
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
};
