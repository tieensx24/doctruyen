const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChapterContent = sequelize.define('ChapterContent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  chapter_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  content: { type: DataTypes.TEXT('long'), allowNull: false },
  word_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  reading_time_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, {
  tableName: 'chapter_contents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ChapterContent;
