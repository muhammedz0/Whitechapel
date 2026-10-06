/* ============================================
   Game Model (Oyun Altyapısı)
   Gelecekte oyun modülleri için hazırlık
   ============================================ */

const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  // Oyun bilgileri
  name: {
    type: String,
    required: true,
    maxlength: 100
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Banner ve thumbnail
  thumbnail: {
    type: String,
    default: null
  },

  banner: {
    type: String,
    default: null
  },

  // Oyun türü
  gameType: {
    type: String,
    enum: ['multiplayer', 'singleplayer', 'competitive', 'cooperative', 'event'],
    default: 'multiplayer'
  },

  // Kategori (korku temalı)
  category: {
    type: String,
    enum: ['horror', 'survival', 'puzzle', 'trivia', 'social', 'roleplay'],
    default: 'horror'
  },

  // Oyuncu sayısı
  minPlayers: {
    type: Number,
    default: 2
  },

  maxPlayers: {
    type: Number,
    default: 10
  },

  // Süre (dakika)
  estimatedDuration: {
    type: Number,
    default: 30
  },

  // Kurallar ve rehber
  rules: {
    type: String,
    maxlength: 5000
  },

  howToPlay: {
    type: String,
    maxlength: 5000
  },

  // Discord sunucu şartı
  requiresDiscordMembership: {
    type: Boolean,
    default: true
  },

  // Gereksinimler
  requirements: [{
    type: String
  }],

  // Oyun durumu
  isActive: {
    type: Boolean,
    default: true
  },

  isComingSoon: {
    type: Boolean,
    default: false
  },

  releaseDate: {
    type: Date,
    default: null
  },

  // İstatistikler
  stats: {
    totalPlays: {
      type: Number,
      default: 0
    },
    totalPlayers: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },

  // Ödüller (başarım kazanma)
  rewards: [{
    achievementKey: String,
    condition: String // örn: "win", "play_10_times"
  }],

  // Oyun ayarları (JSON formatında, oyuna göre değişir)
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Game Session Schema (Aktif oyun oturumları)
const gameSessionSchema = new mongoose.Schema({
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true
  },

  // Host (oluşturan)
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Katılımcılar
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['waiting', 'ready', 'playing', 'finished', 'left'],
      default: 'waiting'
    },
    score: {
      type: Number,
      default: 0
    }
  }],

  // Oturum durumu
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'finished', 'cancelled'],
    default: 'waiting'
  },

  // Kazanan
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Oyun verileri (oyuna göre değişir)
  gameData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Başlangıç ve bitiş zamanı
  startedAt: {
    type: Date,
    default: null
  },

  finishedAt: {
    type: Date,
    default: null
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false
});

// Indexes
gameSchema.index({ slug: 1 });
gameSchema.index({ isActive: 1, category: 1 });
gameSchema.index({ 'stats.totalPlays': -1 });

gameSessionSchema.index({ game: 1, status: 1 });
gameSessionSchema.index({ host: 1, createdAt: -1 });
gameSessionSchema.index({ 'participants.user': 1 });

// Static: Aktif oyunları getir
gameSchema.statics.getActive = function() {
  return this.find({ isActive: true, isComingSoon: false })
    .sort({ 'stats.totalPlays': -1 });
};

// Static: Popüler oyunlar
gameSchema.statics.getPopular = function(limit = 6) {
  return this.find({ isActive: true, isComingSoon: false })
    .sort({ 'stats.totalPlays': -1, 'stats.averageRating': -1 })
    .limit(limit);
};

// Method: Rating ekle
gameSchema.methods.addRating = async function(rating) {
  const currentTotal = this.stats.averageRating * this.stats.ratingCount;
  this.stats.ratingCount += 1;
  this.stats.averageRating = (currentTotal + rating) / this.stats.ratingCount;
  await this.save();
};

// GameSession Method: Katılımcı ekle
gameSessionSchema.methods.addParticipant = async function(userId) {
  const Game = mongoose.model('Game');
  const game = await Game.findById(this.game);
  
  if (!game) throw new Error('Oyun bulunamadı');
  if (this.participants.length >= game.maxPlayers) {
    throw new Error('Oyun dolu');
  }
  
  const exists = this.participants.some(
    p => p.user.toString() === userId.toString()
  );
  
  if (!exists) {
    this.participants.push({
      user: userId,
      joinedAt: new Date(),
      status: 'waiting'
    });
    await this.save();
  }
  
  return this;
};

// GameSession Method: Oyunu başlat
gameSessionSchema.methods.startGame = async function() {
  if (this.status !== 'waiting') {
    throw new Error('Oyun zaten başladı');
  }
  
  this.status = 'in_progress';
  this.startedAt = new Date();
  
  // Tüm katılımcıları playing durumuna al
  this.participants.forEach(p => {
    if (p.status === 'ready' || p.status === 'waiting') {
      p.status = 'playing';
    }
  });
  
  await this.save();
  
  // Oyun istatistiklerini güncelle
  const Game = mongoose.model('Game');
  await Game.findByIdAndUpdate(this.game, {
    $inc: { 
      'stats.totalPlays': 1,
      'stats.totalPlayers': this.participants.length
    }
  });
  
  return this;
};

// GameSession Method: Oyunu bitir
gameSessionSchema.methods.finishGame = async function(winnerId = null) {
  this.status = 'finished';
  this.finishedAt = new Date();
  
  if (winnerId) {
    this.winner = winnerId;
    
    // Kazanan kullanıcının stats'ini güncelle
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(winnerId, {
      $inc: { 'stats.gamesWon': 1 }
    });
  }
  
  // Tüm katılımcıların gamesPlayed istatistiğini artır
  const User = mongoose.model('User');
  const userIds = this.participants.map(p => p.user);
  await User.updateMany(
    { _id: { $in: userIds } },
    { $inc: { 'stats.gamesPlayed': 1 } }
  );
  
  await this.save();
  return this;
};

// Pre-save middleware
gameSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Game = mongoose.model('Game', gameSchema);
const GameSession = mongoose.model('GameSession', gameSessionSchema);

module.exports = { Game, GameSession };
