const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HeroSlide = sequelize.define('HeroSlide', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  manga_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255) },
  subtitle: { type: DataTypes.STRING(255) },
  image_url: { type: DataTypes.STRING(255), allowNull: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { timestamps: true, tableName: 'hero_slides', createdAt: 'created_at', updatedAt: 'updated_at' });

module.exports = HeroSlide;
