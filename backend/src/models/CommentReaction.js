const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CommentReaction = sequelize.define('CommentReaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  comment_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  reaction_type: { type: DataTypes.STRING(30), allowNull: false },
}, {
  timestamps: true,
  tableName: 'comment_reactions',
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['comment_id', 'user_id'], name: 'unique_user_comment_reaction' },
    { fields: ['comment_id'], name: 'idx_comment_id' },
    { fields: ['user_id'], name: 'idx_user_id' },
    { fields: ['reaction_type'], name: 'idx_reaction_type' },
  ],
});

module.exports = CommentReaction;
