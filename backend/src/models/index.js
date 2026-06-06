const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Manga = require('./Manga');
const Category = require('./Category');
const MangaCategory = require('./MangaCategory');
const Chapter = require('./Chapter');
const ChapterImage = require('./ChapterImage');
const ChapterContent = require('./ChapterContent');
const Comment = require('./Comment');
const CommentReaction = require('./CommentReaction');
const CommentSticker = require('./CommentSticker');
const CommentReport = require('./CommentReport');
const Favorite = require('./Favorite');
const ReadingHistory = require('./ReadingHistory');
const ViewLog = require('./ViewLog');
const MangaRating = require('./MangaRating');
const HeroSlide = require('./HeroSlide');

// User - Role
Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id' });

// Manga - Category (many-to-many)
Manga.belongsToMany(Category, { through: MangaCategory, foreignKey: 'manga_id' });
Category.belongsToMany(Manga, { through: MangaCategory, foreignKey: 'category_id' });

// Manga - Chapter
Manga.hasMany(Chapter, { foreignKey: 'manga_id' });
Chapter.belongsTo(Manga, { foreignKey: 'manga_id' });

// Chapter - ChapterImage
Chapter.hasMany(ChapterImage, { foreignKey: 'chapter_id' });
ChapterImage.belongsTo(Chapter, { foreignKey: 'chapter_id' });

// Chapter - ChapterContent
Chapter.hasOne(ChapterContent, { foreignKey: 'chapter_id' });
ChapterContent.belongsTo(Chapter, { foreignKey: 'chapter_id' });

// Manga - Comment
Manga.hasMany(Comment, { foreignKey: 'manga_id' });
Comment.belongsTo(Manga, { foreignKey: 'manga_id' });

// Chapter - Comment
Chapter.hasMany(Comment, { foreignKey: 'chapter_id' });
Comment.belongsTo(Chapter, { foreignKey: 'chapter_id' });

// User - Comment
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

// Comment - Reply
Comment.hasMany(Comment, { as: 'Replies', foreignKey: 'parent_id' });
Comment.belongsTo(Comment, { as: 'Parent', foreignKey: 'parent_id' });

// Comment - Reaction
Comment.hasMany(CommentReaction, { foreignKey: 'comment_id' });
CommentReaction.belongsTo(Comment, { foreignKey: 'comment_id' });
User.hasMany(CommentReaction, { foreignKey: 'user_id' });
CommentReaction.belongsTo(User, { foreignKey: 'user_id' });

// Comment - Report
Comment.hasMany(CommentReport, { foreignKey: 'comment_id' });
CommentReport.belongsTo(Comment, { foreignKey: 'comment_id' });
User.hasMany(CommentReport, { foreignKey: 'user_id' });
CommentReport.belongsTo(User, { foreignKey: 'user_id', as: 'Reporter' });

// Comment - Sticker
CommentSticker.hasMany(Comment, { foreignKey: 'sticker_id' });
Comment.belongsTo(CommentSticker, { foreignKey: 'sticker_id', as: 'Sticker' });

// User - Favorite
User.belongsToMany(Manga, { through: Favorite, foreignKey: 'user_id', as: 'FavoritedMangas' });
Manga.belongsToMany(User, { through: Favorite, foreignKey: 'manga_id', as: 'FavoritedByUsers' });
User.hasMany(Favorite, { foreignKey: 'user_id' });
Favorite.belongsTo(User, { foreignKey: 'user_id' });
Manga.hasMany(Favorite, { foreignKey: 'manga_id' });
Favorite.belongsTo(Manga, { foreignKey: 'manga_id' });

// User - ReadingHistory
User.hasMany(ReadingHistory, { foreignKey: 'user_id' });
ReadingHistory.belongsTo(User, { foreignKey: 'user_id' });
ReadingHistory.belongsTo(Manga, { foreignKey: 'manga_id' });
ReadingHistory.belongsTo(Chapter, { foreignKey: 'chapter_id' });

// Manga ratings
User.hasMany(MangaRating, { foreignKey: 'user_id' });
MangaRating.belongsTo(User, { foreignKey: 'user_id' });
Manga.hasMany(MangaRating, { foreignKey: 'manga_id' });
MangaRating.belongsTo(Manga, { foreignKey: 'manga_id' });

// Hero slides
Manga.hasMany(HeroSlide, { foreignKey: 'manga_id' });
HeroSlide.belongsTo(Manga, { foreignKey: 'manga_id' });

// View logs
Manga.hasMany(ViewLog, { foreignKey: 'manga_id' });
ViewLog.belongsTo(Manga, { foreignKey: 'manga_id' });
Chapter.hasMany(ViewLog, { foreignKey: 'chapter_id' });
ViewLog.belongsTo(Chapter, { foreignKey: 'chapter_id' });

module.exports = {
  sequelize,
  Role, User, Manga, Category, MangaCategory,
  Chapter, ChapterImage, ChapterContent, Comment,
  CommentReaction, CommentSticker, CommentReport, Favorite, ReadingHistory, ViewLog, MangaRating, HeroSlide,
};
