/* ============================================
   Message Model - SQLite/Sequelize
   ============================================ */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Conversation ID (iki kullanıcı arasındaki konuşma)
    conversationId: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Gönderen ve alıcı
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },

    // Şifrelenmiş içerik
    encryptedContent: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // Nonce (encryption için gerekli)
    nonce: {
      type: DataTypes.STRING,
      allowNull: false
    },

    // Mesaj türü
    messageType: {
      type: DataTypes.STRING,
      defaultValue: 'text',
      validate: {
        isIn: [['text', 'image', 'file', 'system']]
      }
    },

    // Medya (JSON olarak)
    media: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null
    },

    // Okundu bilgisi
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    readAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    // Silindi mi? (JSON array)
    deletedBy: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    // Reply to (başka bir mesaja cevap)
    replyToId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'messages',
        key: 'id'
      }
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    indexes: [
      { fields: ['conversationId', 'createdAt'] },
      { fields: ['senderId', 'createdAt'] },
      { fields: ['recipientId', 'read'] }
    ]
  });

  // Static Methods
  Message.getConversationId = function(userId1, userId2) {
    const ids = [userId1.toString(), userId2.toString()].sort();
    return `${ids[0]}_${ids[1]}`;
  };

  Message.getUnreadCount = async function(userId) {
    const { Op } = require('sequelize');
    return await this.count({
      where: {
        recipientId: userId,
        read: false,
        deletedBy: {
          [Op.not]: {
            [Op.contains]: [{ user: userId }]
          }
        }
      }
    });
  };

  // Instance Methods
  Message.prototype.markAsRead = async function() {
    if (!this.read) {
      this.read = true;
      this.readAt = new Date();
      await this.save();
    }
  };

  Message.prototype.deleteForUser = async function(userId) {
    const deletedBy = this.deletedBy || [];
    const alreadyDeleted = deletedBy.some(d => d.user === userId);

    if (!alreadyDeleted) {
      deletedBy.push({ user: userId, deletedAt: new Date() });
      this.deletedBy = deletedBy;
      await this.save();
    }

    // Her iki kullanıcı da sildiyse, gerçekten sil
    if (deletedBy.length >= 2) {
      await this.destroy();
    }
  };

  return Message;
};
