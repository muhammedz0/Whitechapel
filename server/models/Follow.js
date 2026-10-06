/* ============================================
   Follow Model - SQLite/Sequelize
   ============================================ */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Takip eden kullanıcı
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    
    // Takip edilen kullanıcı
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'follows',
    timestamps: true,
    indexes: [
      { fields: ['followerId'] },
      { fields: ['followingId'] },
      { unique: true, fields: ['followerId', 'followingId'] } // Aynı takip 2 kere eklenemez
    ]
  });

  return Follow;
};
