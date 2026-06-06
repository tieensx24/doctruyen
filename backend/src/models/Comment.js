const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  manga_id: { type: DataTypes.INTEGER, allowNull: false },
  chapter_id: { type: DataTypes.INTEGER, allowNull: true },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  sticker_id: { type: DataTypes.INTEGER, allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'visible' },
}, { timestamps: true, tableName: 'comments', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = Comment;
