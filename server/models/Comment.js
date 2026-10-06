/* ============================================
   Comment Model - SQLite/Sequelize
   ============================================ */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Yorumun yapıldığı kullanıcı (profil sahibi) - User ID
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Yorumu yapan kullanıcı - User ID
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Yorum içeriği
    content: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    
    // Silinmiş mi?
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    // Düzenlenmiş mi?
    edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'comments',
    timestamps: true,
    indexes: [
      { fields: ['targetUserId', 'createdAt'] },
      { fields: ['authorId'] }
    ]
  });

  return Comment;
};
