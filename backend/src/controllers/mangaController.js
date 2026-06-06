const {
  Manga,
  Category,
  Chapter,
  ChapterContent,
  ChapterImage,
  Comment,
  CommentReaction,
  CommentReport,
  CommentSticker,
  Favorite,
  HeroSlide,
  MangaRating,
  ReadingHistory,
  sequelize,
  User,
  ViewLog,
} = require('../models');
const { Op, QueryTypes } = require('sequelize');
const { parseChapterNumberFromSlug } = require('../utils/slug');

const VALID_COMMENT_REACTIONS = ['like', 'love', 'haha', 'sad', 'angry'];
const VIEW_DEDUP_WINDOW_MS = Number(process.env.VIEW_DEDUP_WINDOW_MS || 5 * 60 * 1000);
const COMMENT_COOLDOWN_MS = Number(process.env.COMMENT_COOLDOWN_MS || 10 * 1000);

const includeMangaDetails = [
  {
    model: Category,
    through: { attributes: [] },
  },
  {
    model: Chapter,
    attributes: ['id', 'chapter_number', 'slug', 'title', 'view_count', 'created_at'],
  },
];

const addMangaStats = async (manga) => {
  const data = manga.toJSON ? manga.toJSON() : manga;
  const [commentsCount, followersCount, ratingCount, ratingSum] = await Promise.all([
    Comment.count({ where: { manga_id: data.id, status: 'visible' } }),
    Favorite.count({ where: { manga_id: data.id } }),
    MangaRating.count({ where: { manga_id: data.id } }),
    MangaRating.sum('score', { where: { manga_id: data.id } }),
  ]);
  const ratingAverage = ratingCount ? Number((Number(ratingSum || 0) / ratingCount).toFixed(1)) : 0;

  return {
    ...data,
    comments_count: commentsCount,
    followers_count: followersCount,
    rating_average: ratingAverage,
    rating_count: ratingCount,
  };
};

const getHeroSlides = async (req, res) => {
  try {
    const slides = await HeroSlide.findAll({
      where: { is_active: true },
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'banner_image', 'description', 'view_count'],
          include: [
            {
              model: Category,
              through: { attributes: [] },
            },
            {
              model: Chapter,
              attributes: ['id', 'chapter_number', 'slug', 'title', 'view_count', 'created_at'],
            },
          ],
        },
      ],
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']],
    });

    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getClientIp = req => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim().slice(0, 45);
  return String(req.ip || req.socket?.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 45);
};

const getViewIdentityWhere = req => {
  if (req.user?.id) return { user_id: req.user.id };
  return { ip_address: getClientIp(req) || null };
};

const shouldCountView = async (req, baseWhere) => {
  const recentAt = new Date(Date.now() - VIEW_DEDUP_WINDOW_MS);
  const recentView = await ViewLog.findOne({
    where: {
      ...baseWhere,
      ...getViewIdentityWhere(req),
      created_at: { [Op.gte]: recentAt },
    },
  });

  return !recentView;
};

const createViewLog = (req, values) => ViewLog.create({
  ...values,
  user_id: req.user?.id || null,
  ip_address: getClientIp(req) || null,
  user_agent: String(req.headers['user-agent'] || '').slice(0, 255) || null,
});

const getIdentifierWhere = identifier => {
  const value = String(identifier || '').trim();
  return /^\d+$/.test(value)
    ? { [Op.or]: [{ id: Number(value) }, { slug: value }] }
    : { slug: value };
};

const findMangaByIdentifier = (identifier, options = {}) => Manga.findOne({
  ...options,
  where: {
    ...(options.where || {}),
    ...getIdentifierWhere(identifier),
  },
});

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
  const keyword = normalizeSearchQuery(req.query.search || req.query.q);
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

  const include = includeMangaDetails.map(item => ({ ...item }));
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

const getMangas = async (req, res) => {
  try {
    const { hasPagination, page, limit, offset } = getPaginationParams(req);
    const query = getMangaListQuery(req);

    if (!hasPagination) {
      const mangas = await Manga.findAll(query);
      return res.json(await Promise.all(mangas.map(addMangaStats)));
    }

    const { rows, count } = await Manga.findAndCountAll({
      ...query,
      limit,
      offset,
      distinct: true,
    });
    const items = await Promise.all(rows.map(addMangaStats));
    res.json(makePaginationPayload(items, count, page, limit));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const normalizeSearchQuery = value => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .slice(0, 100);

const normalizeVietnameseText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase();

const makeBooleanSearchQuery = value => normalizeSearchQuery(value)
  .split(' ')
  .filter(word => word.length >= 2)
  .map(word => `+${word.replace(/[+\-<>()~*"@]/g, '')}*`)
  .join(' ');

const mapSearchRow = row => {
  const categories = row.category_names
    ? String(row.category_names).split('|||').filter(Boolean).map((name, index) => ({
      id: row.category_ids ? Number(String(row.category_ids).split('|||')[index]) || undefined : undefined,
      name,
    }))
    : [];

  const latestChapter = row.latest_chapter_number ? {
    id: row.latest_chapter_id,
    chapter_number: row.latest_chapter_number,
    slug: row.latest_chapter_slug,
    title: row.latest_chapter_title,
    view_count: row.latest_chapter_view_count || 0,
  } : null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    alternative_names: row.alternative_names,
    description: row.description,
    cover_image: row.cover_image,
    author: row.author,
    status: row.status,
    view_count: Number(row.view_count) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    relevance: Number(row.relevance) || 0,
    matched_fields: String(row.matched_fields || '').split(',').filter(Boolean),
    Categories: categories,
    Chapters: latestChapter ? [latestChapter] : [],
    latest_chapter: latestChapter,
  };
};

const getFallbackLatestChapter = manga => {
  const chapters = Array.isArray(manga.Chapters) ? manga.Chapters : [];
  return [...chapters].sort((a, b) => Number(b.chapter_number || 0) - Number(a.chapter_number || 0))[0] || null;
};

const buildFallbackSearchItem = (manga, keyword) => {
  const data = manga.toJSON ? manga.toJSON() : manga;
  const categories = Array.isArray(data.Categories) ? data.Categories : [];
  const normalizedKeyword = normalizeVietnameseText(keyword);
  const title = normalizeVietnameseText(data.title);
  const alternativeNames = normalizeVietnameseText(data.alternative_names);
  const author = normalizeVietnameseText(data.author);
  const categoryText = normalizeVietnameseText(categories.map(category => category.name).join(' '));
  const description = normalizeVietnameseText(data.description);

  let relevance = 0;
  const matchedFields = [];

  if (title === normalizedKeyword) relevance += 110;
  if (title.startsWith(normalizedKeyword)) relevance += 70;
  if (title.includes(normalizedKeyword)) {
    relevance += 42;
    matchedFields.push('title');
  }
  if (alternativeNames.includes(normalizedKeyword)) {
    relevance += 34;
    matchedFields.push('alternative_names');
  }
  if (author.includes(normalizedKeyword)) {
    relevance += 26;
    matchedFields.push('author');
  }
  if (categoryText.includes(normalizedKeyword)) {
    relevance += 24;
    matchedFields.push('category');
  }
  if (description.includes(normalizedKeyword)) relevance += 8;

  if (relevance <= 0) return null;

  const latestChapter = getFallbackLatestChapter(data);
  return {
    ...data,
    relevance: relevance + Math.min((Number(data.view_count) || 0) / 10000, 8),
    matched_fields: [...new Set(matchedFields)],
    Chapters: latestChapter ? [latestChapter] : [],
    latest_chapter: latestChapter,
  };
};

const getFallbackSearchResults = async (keyword, existingIds, limit) => {
  const mangas = await Manga.findAll({
    include: includeMangaDetails,
    order: [['view_count', 'DESC']],
  });

  return mangas
    .filter(manga => !existingIds.has(Number(manga.id)))
    .map(manga => buildFallbackSearchItem(manga, keyword))
    .filter(Boolean)
    .sort((a, b) => Number(b.relevance || 0) - Number(a.relevance || 0))
    .slice(0, limit);
};

const searchMangas = async (req, res) => {
  try {
    const keyword = normalizeSearchQuery(req.query.q || req.query.keyword);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const mode = String(req.query.mode || '').toLowerCase();

    if (!keyword) return res.json([]);

    const like = `%${keyword}%`;
    const prefix = `${keyword}%`;
    const booleanQuery = makeBooleanSearchQuery(keyword) || keyword;

    const rows = await sequelize.query(
      `
      SELECT
        m.id,
        m.title,
        m.slug,
        m.alternative_names,
        m.description,
        m.cover_image,
        m.author,
        m.status,
        m.view_count,
        m.created_at,
        m.updated_at,
        GROUP_CONCAT(DISTINCT c.id ORDER BY c.name SEPARATOR '|||') AS category_ids,
        GROUP_CONCAT(DISTINCT c.name ORDER BY c.name SEPARATOR '|||') AS category_names,
        latest_chapter.id AS latest_chapter_id,
        latest_chapter.chapter_number AS latest_chapter_number,
        latest_chapter.slug AS latest_chapter_slug,
        latest_chapter.title AS latest_chapter_title,
        latest_chapter.view_count AS latest_chapter_view_count,
        CONCAT_WS(',',
          IF(LOWER(m.title) LIKE LOWER(:like), 'title', NULL),
          IF(LOWER(COALESCE(m.alternative_names, '')) LIKE LOWER(:like), 'alternative_names', NULL),
          IF(LOWER(COALESCE(m.author, '')) LIKE LOWER(:like), 'author', NULL),
          IF(MAX(CASE WHEN LOWER(COALESCE(c.name, '')) LIKE LOWER(:like) THEN 1 ELSE 0 END) = 1, 'category', NULL)
        ) AS matched_fields,
        (
          CASE WHEN LOWER(m.title) = LOWER(:keyword) THEN 120 ELSE 0 END +
          CASE WHEN LOWER(m.title) LIKE LOWER(:prefix) THEN 80 ELSE 0 END +
          CASE WHEN LOWER(m.title) LIKE LOWER(:like) THEN 45 ELSE 0 END +
          CASE WHEN LOWER(COALESCE(m.alternative_names, '')) LIKE LOWER(:like) THEN 36 ELSE 0 END +
          CASE WHEN LOWER(COALESCE(m.author, '')) LIKE LOWER(:like) THEN 28 ELSE 0 END +
          MAX(CASE WHEN LOWER(COALESCE(c.name, '')) LIKE LOWER(:like) THEN 24 ELSE 0 END) +
          MATCH(m.title, m.author, m.alternative_names, m.description) AGAINST(:booleanQuery IN BOOLEAN MODE) * 10 +
          LEAST(COALESCE(m.view_count, 0) / 10000, 8)
        ) AS relevance
      FROM mangas m
      LEFT JOIN manga_categories mc ON mc.manga_id = m.id
      LEFT JOIN categories c ON c.id = mc.category_id
      LEFT JOIN chapters latest_chapter
        ON latest_chapter.id = (
          SELECT ch.id
          FROM chapters ch
          WHERE ch.manga_id = m.id
          ORDER BY ch.chapter_number DESC, ch.id DESC
          LIMIT 1
        )
      GROUP BY
        m.id, m.title, m.slug, m.alternative_names, m.description, m.cover_image, m.author,
        m.status, m.view_count, m.created_at, m.updated_at,
        latest_chapter.id, latest_chapter.chapter_number, latest_chapter.slug, latest_chapter.title, latest_chapter.view_count
      HAVING
        LOWER(m.title) LIKE LOWER(:like)
        OR LOWER(COALESCE(m.alternative_names, '')) LIKE LOWER(:like)
        OR LOWER(COALESCE(m.author, '')) LIKE LOWER(:like)
        OR MAX(CASE WHEN LOWER(COALESCE(c.name, '')) LIKE LOWER(:like) THEN 1 ELSE 0 END) = 1
        OR MATCH(m.title, m.author, m.alternative_names, m.description) AGAINST(:booleanQuery IN BOOLEAN MODE) > 0
      ORDER BY relevance DESC, m.view_count DESC, m.updated_at DESC
      LIMIT :limit
      `,
      {
        replacements: {
          keyword,
          like,
          prefix,
          booleanQuery,
          limit,
        },
        type: QueryTypes.SELECT,
      }
    );

    const mappedRows = rows.map(mapSearchRow);
    if (mappedRows.length < limit) {
      const existingIds = new Set(mappedRows.map(item => Number(item.id)));
      const fallbackRows = await getFallbackSearchResults(keyword, existingIds, limit - mappedRows.length);
      mappedRows.push(...fallbackRows);
      mappedRows.sort((a, b) => Number(b.relevance || 0) - Number(a.relevance || 0));
    }

    if (mode === 'suggest') {
      return res.json(mappedRows.map(item => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        alternative_names: item.alternative_names,
        author: item.author,
        cover_image: item.cover_image,
        status: item.status,
        relevance: item.relevance,
        matched_fields: item.matched_fields,
        latest_chapter: item.latest_chapter,
        Chapters: item.Chapters,
        Categories: item.Categories,
      })));
    }

    res.json(mappedRows);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getMangaById = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.id || req.params.identifier, {
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
    const chapterInclude = [
      {
        model: Manga,
        attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image'],
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
      {
        model: ChapterContent,
        attributes: ['id', 'content', 'word_count', 'reading_time_minutes', 'updated_at'],
      },
    ];

    let chapter;
    if (req.params.mangaSlug && req.params.chapterSlug) {
      const mangaIdentifier = String(req.params.mangaSlug).trim();
      const chapterIdentifier = String(req.params.chapterSlug).trim();
      const chapterNumber = parseChapterNumberFromSlug(chapterIdentifier);
      const mangaWhere = getIdentifierWhere(mangaIdentifier);

      chapter = await Chapter.findOne({
        where: {
          [Op.and]: [
            chapterNumber ? { chapter_number: chapterNumber } : { slug: chapterIdentifier },
          ],
        },
        include: chapterInclude.map(item => {
          if (item.model !== Manga) return item;
          return {
            ...item,
            where: mangaWhere,
            required: true,
          };
        }),
      });
    } else {
      chapter = await Chapter.findByPk(req.params.id, {
        include: chapterInclude,
      });
    }

    if (!chapter) return res.status(404).json({ message: 'Không tìm thấy chapter' });

    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const increaseMangaView = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Không tìm thấy truyện' });

    const counted = await shouldCountView(req, {
      target_type: 'manga',
      manga_id: manga.id,
    });

    if (counted) {
      await manga.increment('view_count');
      await createViewLog(req, {
        target_type: 'manga',
        manga_id: manga.id,
      });
    }
    await manga.reload();

    res.json({
      id: manga.id,
      view_count: manga.view_count,
      counted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

const increaseChapterView = async (req, res) => {
  try {
    const chapter = await Chapter.findByPk(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    const counted = await shouldCountView(req, {
      target_type: 'chapter',
      chapter_id: chapter.id,
    });

    if (counted) {
      await chapter.increment('view_count');
      await createViewLog(req, {
        target_type: 'chapter',
        manga_id: chapter.manga_id,
        chapter_id: chapter.id,
      });
    }
    await chapter.reload();

    res.json({
      id: chapter.id,
      view_count: chapter.view_count,
      counted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const commentInclude = [
  {
    model: User,
    attributes: ['id', 'username', 'avatar', 'role_id'],
  },
  {
    model: CommentSticker,
    as: 'Sticker',
    attributes: ['id', 'name', 'image_url', 'public_id', 'type', 'status'],
  },
];

const enrichCommentsWithReactions = async (comments, userId = null) => {
  const rows = Array.isArray(comments) ? comments : [comments];
  const commentIds = rows.map(comment => comment.id).filter(Boolean);

  if (!commentIds.length) return Array.isArray(comments) ? [] : null;

  const reactionRows = await CommentReaction.findAll({
    where: { comment_id: { [Op.in]: commentIds } },
    attributes: [
      'comment_id',
      'reaction_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
    ],
    group: ['comment_id', 'reaction_type'],
    raw: true,
  });

  const countMap = reactionRows.reduce((map, row) => {
    const commentId = Number(row.comment_id);
    if (!map[commentId]) map[commentId] = {};
    map[commentId][row.reaction_type] = Number(row.count);
    return map;
  }, {});

  let userReactionMap = {};
  if (userId) {
    const userReactions = await CommentReaction.findAll({
      where: {
        comment_id: { [Op.in]: commentIds },
        user_id: userId,
      },
      raw: true,
    });

    userReactionMap = userReactions.reduce((map, reaction) => {
      map[Number(reaction.comment_id)] = reaction.reaction_type;
      return map;
    }, {});
  }

  const enriched = rows.map(comment => {
    const data = comment.toJSON ? comment.toJSON() : comment;
    return {
      ...data,
      reaction_counts: countMap[Number(data.id)] || {},
      current_user_reaction: userReactionMap[Number(data.id)] || null,
    };
  });

  return Array.isArray(comments) ? enriched : enriched[0];
};

const buildCommentTree = (comments) => {
  const map = new Map();

  comments.forEach((comment) => {
    map.set(Number(comment.id), { ...comment, replies: [] });
  });

  const roots = [];
  comments.forEach((comment) => {
    const item = map.get(Number(comment.id));
    const parentId = Number(comment.parent_id);

    if (comment.parent_id && map.has(parentId)) {
      map.get(parentId).replies.push(item);
    } else if (!comment.parent_id) {
      roots.push(item);
    }
  });

  const sortReplies = (items) => {
    items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    items.forEach(item => sortReplies(item.replies || []));
  };

  roots.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  roots.forEach(root => sortReplies(root.replies || []));

  return roots;
};

const normalizeId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeProgressPercent = value => {
  if (value === undefined || value === null || value === '') return null;
  const percent = Number(value);
  if (!Number.isFinite(percent)) return null;
  return Math.min(Math.max(percent, 0), 100);
};

const normalizeScrollPosition = value => {
  if (value === undefined || value === null || value === '') return null;
  const position = Number(value);
  if (!Number.isFinite(position)) return null;
  return Math.max(Math.round(position), 0);
};

const normalizeRatingScore = value => {
  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 5) return null;
  return score;
};

const getCommentSortDirection = (req) => (
  String(req.query.sort || req.query.order || '').toLowerCase() === 'oldest' ? 'ASC' : 'DESC'
);

const validateCommentPayload = async (req, mangaIdFromParams = null) => {
  const mangaId = normalizeId(
    mangaIdFromParams ||
    req.body.mangaId ||
    req.body.manga_id ||
    req.body.storyId ||
    req.body.story_id
  );
  const chapterIdInput = normalizeId(req.body.chapterId || req.body.chapter_id);
  const stickerId = normalizeId(req.body.stickerId || req.body.sticker_id);
  const parentInput = normalizeId(req.body.parentId || req.body.parent_id);
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

  if (!mangaId) return { error: { status: 400, message: 'Thieu mangaId' } };
  if (!content && !stickerId) {
    return { error: { status: 400, message: 'Binh luan can co noi dung hoac sticker' } };
  }
  if (content.length > 1000) {
    return { error: { status: 400, message: 'Binh luan toi da 1000 ky tu' } };
  }

  const manga = await Manga.findByPk(mangaId);
  if (!manga) return { error: { status: 404, message: 'Khong tim thay truyen' } };

  let chapterId = chapterIdInput;
  if (chapterId) {
    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter || Number(chapter.manga_id) !== Number(manga.id)) {
      return { error: { status: 400, message: 'Chapter khong thuoc truyen nay' } };
    }
  }

  let sticker = null;
  if (stickerId) {
    sticker = await CommentSticker.findOne({
      where: { id: stickerId, status: 'active' },
    });
    if (!sticker) {
      return { error: { status: 400, message: 'Sticker khong hop le hoac da bi tat' } };
    }
  }

  let parentId = null;
  if (parentInput) {
    const parentComment = await Comment.findByPk(parentInput);
    if (!parentComment || Number(parentComment.manga_id) !== Number(manga.id)) {
      return { error: { status: 400, message: 'Binh luan goc khong hop le' } };
    }
    if (parentComment.status !== 'visible') {
      return { error: { status: 400, message: 'Khong the tra loi binh luan da bi an hoac xoa' } };
    }
    if (chapterId && parentComment.chapter_id && Number(parentComment.chapter_id) !== Number(chapterId)) {
      return { error: { status: 400, message: 'Binh luan goc khong thuoc chapter nay' } };
    }
    if (parentComment.chapter_id && !chapterId) {
      chapterId = parentComment.chapter_id;
    }

    parentId = parentComment.id;
  }

  return {
    manga,
    values: {
      manga_id: manga.id,
      chapter_id: chapterId,
      parent_id: parentId,
      sticker_id: sticker?.id || null,
      content: content || null,
    },
  };
};

const getCommentsByManga = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.id || req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    const where = { manga_id: manga.id, status: 'visible' };
    const chapterId = normalizeId(req.query.chapterId || req.query.chapter_id);
    if (chapterId) where.chapter_id = chapterId;

    const comments = await Comment.findAll({
      where,
      include: commentInclude,
      order: [['created_at', getCommentSortDirection(req)]],
    });

    const enrichedComments = await enrichCommentsWithReactions(comments, req.user?.id);
    res.json(buildCommentTree(enrichedComments));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getCommentsByChapter = async (req, res) => {
  try {
    const chapterId = normalizeId(req.params.chapterId || req.params.id);
    if (!chapterId) return res.status(400).json({ message: 'Thieu chapterId' });

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    const comments = await Comment.findAll({
      where: { chapter_id: chapter.id, status: 'visible' },
      include: commentInclude,
      order: [['created_at', getCommentSortDirection(req)]],
    });

    const enrichedComments = await enrichCommentsWithReactions(comments, req.user?.id);
    res.json(buildCommentTree(enrichedComments));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const createComment = async (req, res) => {
  try {
    const payload = await validateCommentPayload(req, req.params.id || req.params.mangaId);
    if (payload.error) return res.status(payload.error.status).json({ message: payload.error.message });

    const recentComment = await Comment.findOne({
      where: {
        user_id: req.user.id,
        created_at: {
          [Op.gte]: new Date(Date.now() - COMMENT_COOLDOWN_MS),
        },
      },
      order: [['created_at', 'DESC']],
    });
    if (recentComment) {
      return res.status(429).json({ message: 'Ban dang binh luan qua nhanh, vui long thu lai sau.' });
    }

    const comment = await Comment.create({
      user_id: req.user.id,
      ...payload.values,
      status: 'visible',
    });

    const createdComment = await Comment.findByPk(comment.id, {
      include: commentInclude,
    });

    res.status(201).json(await enrichCommentsWithReactions(createdComment, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });

    const isOwner = Number(comment.user_id) === Number(req.user.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Chi chu binh luan moi duoc sua binh luan nay' });
    }
    if (comment.status !== 'visible') {
      return res.status(400).json({ message: 'Khong the sua binh luan da bi an hoac xoa' });
    }

    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const stickerId = normalizeId(req.body.stickerId || req.body.sticker_id);
    if (!content && !stickerId) {
      return res.status(400).json({ message: 'Binh luan can co noi dung hoac sticker' });
    }
    if (content.length > 1000) return res.status(400).json({ message: 'Binh luan toi da 1000 ky tu' });

    if (stickerId) {
      const sticker = await CommentSticker.findOne({
        where: { id: stickerId, status: 'active' },
      });
      if (!sticker) return res.status(400).json({ message: 'Sticker khong hop le hoac da bi tat' });
      comment.sticker_id = sticker.id;
    } else {
      comment.sticker_id = null;
    }

    comment.content = content || null;
    await comment.save();

    const updatedComment = await Comment.findByPk(comment.id, {
      include: commentInclude,
    });

    res.json(await enrichCommentsWithReactions(updatedComment, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });

    const isOwner = Number(comment.user_id) === Number(req.user.id);
    const isAdmin = Number(req.user.role_id) === 1;
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Khong co quyen xoa binh luan nay' });
    }

    await comment.update({ status: 'deleted' });
    res.json({ message: 'Da xoa binh luan' });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const setCommentReaction = async (req, res) => {
  try {
    const { reaction_type } = req.body;
    if (!VALID_COMMENT_REACTIONS.includes(reaction_type)) {
      return res.status(400).json({ message: 'Loai reaction khong hop le' });
    }

    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });
    if (comment.status !== 'visible') {
      return res.status(400).json({ message: 'Khong the tha cam xuc cho binh luan da bi an hoac xoa' });
    }

    const [reaction, created] = await CommentReaction.findOrCreate({
      where: {
        comment_id: comment.id,
        user_id: req.user.id,
      },
      defaults: { reaction_type },
    });

    if (!created && reaction.reaction_type !== reaction_type) {
      reaction.reaction_type = reaction_type;
      await reaction.save();
    }

    const fullComment = await Comment.findByPk(comment.id, { include: commentInclude });
    res.json(await enrichCommentsWithReactions(fullComment, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const deleteCommentReaction = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Khong tim thay binh luan' });

    await CommentReaction.destroy({
      where: {
        comment_id: comment.id,
        user_id: req.user.id,
      },
    });

    const fullComment = await Comment.findByPk(comment.id, { include: commentInclude });
    res.json(await enrichCommentsWithReactions(fullComment, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getActiveCommentStickers = async (req, res) => {
  try {
    const stickers = await CommentSticker.findAll({
      where: { status: 'active' },
      order: [['created_at', 'DESC']],
    });

    res.json(stickers);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const reportComment = async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment || comment.status !== 'visible') {
      return res.status(404).json({ message: 'Khong tim thay binh luan' });
    }

    const reason = String(req.body.reason || '').trim();
    const detail = String(req.body.detail || '').trim();
    if (!reason) return res.status(400).json({ message: 'Vui long nhap ly do bao cao' });
    if (reason.length > 100) return res.status(400).json({ message: 'Ly do bao cao toi da 100 ky tu' });
    if (detail.length > 1000) return res.status(400).json({ message: 'Chi tiet bao cao toi da 1000 ky tu' });

    const [report, created] = await CommentReport.findOrCreate({
      where: {
        comment_id: comment.id,
        user_id: req.user.id,
      },
      defaults: {
        reason,
        detail: detail || null,
        status: 'pending',
      },
    });

    if (!created) {
      await report.update({
        reason,
        detail: detail || null,
        status: 'pending',
      });
    }

    res.status(created ? 201 : 200).json({
      message: created ? 'Da gui bao cao binh luan' : 'Da cap nhat bao cao binh luan',
      report,
    });
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const favoriteInclude = [
  {
    model: Manga,
    attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'view_count'],
    include: [
      {
        model: Category,
        through: { attributes: [] },
      },
      {
        model: Chapter,
        attributes: ['id', 'chapter_number', 'slug', 'title', 'view_count', 'created_at'],
      },
    ],
  },
];

const getRatingPayload = async (manga, userId = null) => {
  const [ratingCount, ratingSum, userRating] = await Promise.all([
    MangaRating.count({ where: { manga_id: manga.id } }),
    MangaRating.sum('score', { where: { manga_id: manga.id } }),
    userId
      ? MangaRating.findOne({ where: { manga_id: manga.id, user_id: userId } })
      : null,
  ]);
  const ratingAverage = ratingCount ? Number((Number(ratingSum || 0) / ratingCount).toFixed(1)) : 0;

  return {
    manga_id: manga.id,
    rating_average: ratingAverage,
    rating_count: ratingCount,
    current_user_rating: userRating ? userRating.score : null,
  };
};

const getMangaRating = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    res.json(await getRatingPayload(manga, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const setMangaRating = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    const score = normalizeRatingScore(req.body.score || req.body.rating);
    if (!score) return res.status(400).json({ message: 'Diem danh gia phai tu 1 den 5 sao' });

    const [rating, created] = await MangaRating.findOrCreate({
      where: { manga_id: manga.id, user_id: req.user.id },
      defaults: {
        manga_id: manga.id,
        user_id: req.user.id,
        score,
      },
    });

    if (!created && rating.score !== score) {
      await rating.update({ score });
    }

    res.status(created ? 201 : 200).json(await getRatingPayload(manga, req.user.id));
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

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
    const manga = await findMangaByIdentifier(req.params.mangaId);
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
          attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'view_count'],
          include: [
            {
              model: Category,
              through: { attributes: [] },
            },
          ],
        },
        {
          model: Chapter,
          attributes: ['id', 'chapter_number', 'slug', 'title', 'chapter_type', 'view_count', 'created_at'],
        },
      ],
      order: [['updated_at', 'DESC']],
    });

    res.json(histories);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const getReadingHistoryByManga = async (req, res) => {
  try {
    const manga = await findMangaByIdentifier(req.params.mangaId);
    if (!manga) return res.status(404).json({ message: 'Khong tim thay truyen' });

    const history = await ReadingHistory.findOne({
      where: { user_id: req.user.id, manga_id: manga.id },
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'view_count'],
        },
        {
          model: Chapter,
          attributes: ['id', 'chapter_number', 'slug', 'title', 'chapter_type', 'view_count', 'created_at'],
        },
      ],
    });

    res.json(history || null);
  } catch (error) {
    res.status(500).json({ message: 'Loi server', error: error.message });
  }
};

const saveReadingHistory = async (req, res) => {
  try {
    const chapterId = req.body.chapter_id || req.body.chapterId;
    const progressPercent = normalizeProgressPercent(req.body.progress_percent ?? req.body.progressPercent);
    const scrollPosition = normalizeScrollPosition(req.body.scroll_position ?? req.body.scrollPosition);
    if (!chapterId) return res.status(400).json({ message: 'Vui long chon chapter' });

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Khong tim thay chapter' });

    const existingHistory = await ReadingHistory.findOne({
      where: { user_id: req.user.id, manga_id: chapter.manga_id },
    });
    const sameChapter = Number(existingHistory?.chapter_id) === Number(chapter.id);
    const existingProgress = Number(existingHistory?.progress_percent || 0);
    const nextProgress = progressPercent !== null
      ? sameChapter ? Math.max(existingProgress, progressPercent) : progressPercent
      : sameChapter ? Number(existingHistory.progress_percent || 0) : 0;
    const nextScrollPosition = scrollPosition !== null
      ? sameChapter && progressPercent !== null && progressPercent < existingProgress
        ? Number(existingHistory.scroll_position || 0)
        : scrollPosition
      : sameChapter ? Number(existingHistory.scroll_position || 0) : 0;

    await ReadingHistory.upsert({
      user_id: req.user.id,
      manga_id: chapter.manga_id,
      chapter_id: chapter.id,
      progress_percent: nextProgress,
      scroll_position: nextScrollPosition,
      chapter_type: chapter.chapter_type || 'image',
      last_read_at: new Date(),
      updated_at: new Date(),
    });

    const history = await ReadingHistory.findOne({
      where: { user_id: req.user.id, manga_id: chapter.manga_id },
      include: [
        {
          model: Manga,
          attributes: ['id', 'title', 'slug', 'author', 'status', 'cover_image', 'view_count'],
        },
        {
          model: Chapter,
          attributes: ['id', 'chapter_number', 'slug', 'title', 'chapter_type', 'view_count', 'created_at'],
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
  getHeroSlides,
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
  getCategories,
};
