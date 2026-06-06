const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ViewLog = sequelize.define('ViewLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  target_type: { type: DataTypes.STRING(20), allowNull: false },
  manga_id: { type: DataTypes.INTEGER, allowNull: true },
  chapter_id: { type: DataTypes.INTEGER, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  ip_address: { type: DataTypes.STRING(45), allowNull: true },
  user_agent: { type: DataTypes.STRING(255), allowNull: true },
}, {
  timestamps: true,
  tableName: 'view_logs',
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ViewLog;
