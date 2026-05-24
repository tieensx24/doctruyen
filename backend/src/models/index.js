const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Manga = require('./Manga');
const Category = require('./Category');
const MangaCategory = require('./MangaCategory');
const Chapter = require('./Chapter');
const ChapterImage = require('./ChapterImage');
const Comment = require('./Comment');
const Favorite = require('./Favorite');
const ReadingHistory = require('./ReadingHistory');

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

// Manga - Comment
Manga.hasMany(Comment, { foreignKey: 'manga_id' });
Comment.belongsTo(Manga, { foreignKey: 'manga_id' });

// User - Comment
User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

// User - Favorite
User.belongsToMany(Manga, { through: Favorite, foreignKey: 'user_id', as: 'FavoritedMangas' });
Manga.belongsToMany(User, { through: Favorite, foreignKey: 'manga_id', as: 'FavoritedByUsers' });

// User - ReadingHistory
User.hasMany(ReadingHistory, { foreignKey: 'user_id' });
ReadingHistory.belongsTo(User, { foreignKey: 'user_id' });
ReadingHistory.belongsTo(Manga, { foreignKey: 'manga_id' });
ReadingHistory.belongsTo(Chapter, { foreignKey: 'chapter_id' });

module.exports = {
  sequelize,
  Role, User, Manga, Category, MangaCategory,
  Chapter, ChapterImage, Comment,
  Favorite, ReadingHistory,
};
