const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentReport = sequelize.define('CommentReport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  comment_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.STRING(100), allowNull: false },
  detail: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
}, {
  tableName: 'comment_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['comment_id', 'user_id'], name: 'unique_user_comment_report' },
    { fields: ['comment_id'], name: 'idx_comment_reports_comment_id' },
    { fields: ['user_id'], name: 'idx_comment_reports_user_id' },
    { fields: ['status'], name: 'idx_comment_reports_status' },
  ],
});

module.exports = CommentReport;
