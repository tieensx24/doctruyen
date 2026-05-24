const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Favorite = sequelize.define('Favorite', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  manga_id: { type: DataTypes.INTEGER, primaryKey: true },
}, { timestamps: true, tableName: 'favorites', createdAt: 'created_at', updatedAt: false });

module.exports = Favorite;