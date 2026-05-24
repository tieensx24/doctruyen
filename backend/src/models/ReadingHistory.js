const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReadingHistory = sequelize.define('ReadingHistory', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  manga_id: { type: DataTypes.INTEGER, primaryKey: true },
  chapter_id: { type: DataTypes.INTEGER },
}, { timestamps: true, tableName: 'reading_histories', createdAt: false, updatedAt: 'updated_at' });

module.exports = ReadingHistory;