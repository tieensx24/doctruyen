const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MangaRating = sequelize.define('MangaRating', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  manga_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  score: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  tableName: 'manga_ratings',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = MangaRating;
