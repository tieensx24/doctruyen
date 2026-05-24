const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MangaCategory = sequelize.define('MangaCategory', {
  manga_id: { type: DataTypes.INTEGER, primaryKey: true },
  category_id: { type: DataTypes.INTEGER, primaryKey: true },
}, { timestamps: false, tableName: 'manga_categories' });

module.exports = MangaCategory;
