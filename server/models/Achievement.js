/* ============================================
   Achievement Model (Başarımlar)
   Discord botundan senkronize edilecek
   ============================================ */

const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  // Benzersiz tanımlayıcı (Discord bot ile eşleşmesi için)
  achievementKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Başarım bilgileri
  name: {
    type: String,
    required: true,
    maxlength: 100
  },

  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // İkon
  icon: {
    type: String,
    default: '🏆'
  },

  // Kategori
  category: {
    type: String,
    enum: ['social', 'gaming', 'activity', 'special', 'event', 'horror'],
    default: 'social'
  },

  // Zorluk seviyesi
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'legendary'],
    default: 'easy'
  },

  // Puan
  points: {
    type: Number,
    default: 10
  },

  // Gizli başarım mı?
  isHidden: {
    type: Boolean,
    default: false
  },

  // Progress gerekiyor mu? (örn: 100 mesaj gönder)
  requiresProgress: {
    type: Boolean,
    default: false
  },

  progressMax: {
    type: Number,
    default: 1
  },

  // Ödül (opsiyonel)
  reward: {
    type: {
      type: String,
      enum: ['badge', 'role', 'title', 'cosmetic'],
      default: null
    },
    value: {
      type: String,
      default: null
    }
  },

  // Discord sunucusundaki role ID (ödül olarak verilecekse)
  discordRoleId: {
    type: String,
    default: null
  },

  // Rarity (nadir başarımlar farklı gösterilecek)
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },

  // İstatistikler
  stats: {
    unlockedCount: {
      type: Number,
      default: 0
    },
    unlockedPercentage: {
      type: Number,
      default: 0
    }
  },

  // Aktif mi?
  isActive: {
    type: Boolean,
    default: true
  },

  // Sıralama
  order: {
    type: Number,
    default: 0
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
achievementSchema.index({ category: 1, order: 1 });
achievementSchema.index({ rarity: 1 });
achievementSchema.index({ isActive: 1 });

// Static: Tüm aktif başarımları getir
achievementSchema.statics.getActive = function() {
  return this.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 });
};

// Static: Kategoriye göre başarımları getir
achievementSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ order: 1, points: -1 });
};

// Static: Kullanıcının unlock ettiği başarımları hesapla
achievementSchema.statics.calculateUserStats = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).populate('achievements.achievementId');
  
  if (!user) return null;

  const totalAchievements = await this.countDocuments({ isActive: true });
  const unlockedCount = user.achievements.length;
  const totalPoints = user.achievements.reduce((sum, a) => {
    return sum + (a.achievementId ? a.achievementId.points : 0);
  }, 0);

  return {
    unlocked: unlockedCount,
    total: totalAchievements,
    percentage: totalAchievements > 0 ? (unlockedCount / totalAchievements * 100).toFixed(1) : 0,
    points: totalPoints
  };
};

// Method: Unlock yüzdesini güncelle
achievementSchema.methods.updateUnlockedPercentage = async function() {
  const User = mongoose.model('User');
  const totalUsers = await User.countDocuments({ isBanned: false });
  const unlockedUsers = await User.countDocuments({
    'achievements.achievementId': this._id,
    isBanned: false
  });

  this.stats.unlockedCount = unlockedUsers;
  this.stats.unlockedPercentage = totalUsers > 0 
    ? parseFloat((unlockedUsers / totalUsers * 100).toFixed(2))
    : 0;

  await this.save();
};

// Pre-save middleware
achievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Achievement', achievementSchema);
