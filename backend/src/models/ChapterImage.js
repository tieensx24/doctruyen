const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChapterImage = sequelize.define('ChapterImage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false },
  image_url: { type: DataTypes.STRING(500), allowNull: false },
  page_number: { type: DataTypes.INTEGER, allowNull: false },
}, { timestamps: false, tableName: 'chapter_images' });

module.exports = ChapterImage;
