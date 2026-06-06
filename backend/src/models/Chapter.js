const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chapter = sequelize.define('Chapter', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  manga_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_number: { type: DataTypes.FLOAT, allowNull: false },
  slug: { type: DataTypes.STRING(255) },
  title: { type: DataTypes.STRING(255) },
  chapter_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'image' },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { timestamps: true, tableName: 'chapters', createdAt: 'created_at', updatedAt: false });

module.exports = Chapter;
