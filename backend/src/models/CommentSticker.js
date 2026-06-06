const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentSticker = sequelize.define('CommentSticker', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  image_url: { type: DataTypes.STRING(500), allowNull: false },
  public_id: { type: DataTypes.STRING(255), allowNull: true },
  type: { type: DataTypes.STRING(30), defaultValue: 'sticker' },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
}, {
  timestamps: true,
  tableName: 'comment_stickers',
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = CommentSticker;
