const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReadingHistory = sequelize.define('ReadingHistory', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  manga_id: { type: DataTypes.INTEGER, primaryKey: true },
  chapter_id: { type: DataTypes.INTEGER },
  progress_percent: { type: DataTypes.FLOAT, defaultValue: 0 },
  scroll_position: { type: DataTypes.INTEGER, defaultValue: 0 },
  chapter_type: { type: DataTypes.STRING(20), defaultValue: 'image' },
  last_read_at: { type: DataTypes.DATE },
}, { timestamps: true, tableName: 'reading_histories', createdAt: false, updatedAt: 'updated_at' });

module.exports = ReadingHistory;
