/* ============================================
   User Model - SQLite/Sequelize
   ============================================ */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Discord bilgileri
    discordId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    discriminator: {
      type: DataTypes.STRING,
      defaultValue: '0'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    
    // Profil özelleştirme (JSON olarak saklanacak)
    profile: {
      type: DataTypes.JSON,
      defaultValue: {
        displayName: '',
        bio: '',
        banner: null,
        customAvatar: null,
        theme: 'blood',
        backgroundColor: '#0a0a0a',
        accentColor: '#8b0000',
        textColor: '#ffffff',
        profileVisibility: 'public',
        socialLinks: {
          twitter: '',
          instagram: '',
          youtube: '',
          twitch: '',
          steam: '',
          custom: ''
        },
        displayBadges: [],
        views: 0,
        recentViewers: [],
        favoriteSlasher: '',
        statusMessage: ''
      }
    },

    // Discord sunucu bilgisi
    discordServer: {
      type: DataTypes.JSON,
      defaultValue: {
        isMember: false,
        joinedAt: null,
        roles: [],
        lastChecked: new Date()
      }
    },

    // Başarımlar
    achievements: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    // İstatistikler
    stats: {
      type: DataTypes.JSON,
      defaultValue: {
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        followersCount: 0,
        followingCount: 0,
        gamesPlayed: 0,
        gamesWon: 0
      }
    },

    // Mesajlaşma için public key
    publicKey: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Roller ve yetkiler
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user',
      validate: {
        isIn: [['user', 'moderator', 'admin']]
      }
    },
    permissions: {
      type: DataTypes.JSON,
      defaultValue: []
    },

    // Güvenlik
    isBanned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    bannedUntil: {
      type: DataTypes.DATE,
      allowNull: true
    },
    banReason: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // Bildirim tercihleri
    notifications: {
      type: DataTypes.JSON,
      defaultValue: {
        email: true,
        push: true,
        announcements: true,
        messages: true,
        likes: true,
        comments: true,
        games: true
      }
    },

    // Timestamp
    lastActive: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: true, // createdAt, updatedAt otomatik eklenecek
    indexes: [
      { fields: ['discordId'] },
      { fields: ['username'] },
      { fields: ['role'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance Methods
  User.prototype.isBannedNow = function() {
    if (!this.isBanned) return false;
    if (this.bannedUntil && this.bannedUntil < new Date()) {
      this.isBanned = false;
      this.bannedUntil = null;
      this.banReason = null;
      this.save();
      return false;
    }
    return this.isBanned;
  };

  User.prototype.checkDiscordMembership = async function(axios, botToken) {
    try {
      const response = await axios.get(
        `https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${this.discordId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`
          }
        }
      );
      
      this.discordServer = {
        ...this.discordServer,
        isMember: true,
        roles: response.data.roles || [],
        lastChecked: new Date()
      };
      await this.save();
      
      return true;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.discordServer = {
          ...this.discordServer,
          isMember: false,
          roles: [],
          lastChecked: new Date()
        };
        await this.save();
      }
      return false;
    }
  };

  User.prototype.addAchievement = async function(achievementId) {
    const achievements = this.achievements || [];
    const exists = achievements.find(a => a.achievementId === achievementId);
    
    if (!exists) {
      achievements.push({
        achievementId,
        unlockedAt: new Date(),
        progress: 100
      });
      this.achievements = achievements;
      await this.save();
      return true;
    }
    return false;
  };

  // Virtual: Discord avatar URL
  User.prototype.getDiscordAvatarUrl = function() {
    if (this.avatar) {
      return `https://cdn.discordapp.com/avatars/${this.discordId}/${this.avatar}.png`;
    }
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(this.discriminator) % 5}.png`;
  };

  User.prototype.getProfileUrl = function() {
    return `/profile/${this.discordId}`;
  };

  // Class Methods
  User.getActiveUsers = async function(hours = 24) {
    const { Op } = require('sequelize');
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.findAll({
      where: {
        lastActive: { [Op.gte]: since },
        isBanned: false
      },
      attributes: ['username', 'profile', 'avatar', 'discordId', 'lastActive']
    });
  };

  return User;
};
