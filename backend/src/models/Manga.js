const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Manga = sequelize.define('Manga', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  alternative_names: { type: DataTypes.TEXT },
  description: { type: DataTypes.TEXT },
  cover_image: { type: DataTypes.STRING(255) },
  banner_image: { type: DataTypes.STRING(255) },
  author: { type: DataTypes.STRING(150) },
  status: { type: DataTypes.ENUM('ongoing', 'completed'), defaultValue: 'ongoing' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { timestamps: true, tableName: 'mangas', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Manga;
