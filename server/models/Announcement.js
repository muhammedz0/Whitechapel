/* ============================================
   Announcement Model (Duyurular)
   ============================================ */

const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  // Admin/Moderator bilgisi
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Başlık ve içerik
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },

  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  // Özet (liste görünümü için)
  excerpt: {
    type: String,
    maxlength: 300
  },

  // Banner görsel
  banner: {
    type: String,
    default: null
  },

  // Duyuru türü
  type: {
    type: String,
    enum: ['general', 'event', 'update', 'maintenance', 'game', 'discord', 'urgent'],
    default: 'general'
  },

  // Önem seviyesi
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },

  // Sabitleme
  isPinned: {
    type: Boolean,
    default: false
  },

  // Kategori/tag'ler
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Yayınlanma durumu
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },

  // Zamanlanmış yayın
  publishAt: {
    type: Date,
    default: null
  },

  // Etkileşimler
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      enum: ['👍', '❤️', '😱', '🔥', '💀', '🩸', '👻', '😈']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // İstatistikler
  stats: {
    views: {
      type: Number,
      default: 0
    },
    reactionsCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    }
  },

  // Discord webhook ile paylaşıldı mı?
  sharedToDiscord: {
    type: Boolean,
    default: false
  },
  discordMessageId: {
    type: String,
    default: null
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
announcementSchema.index({ status: 1, publishedAt: -1 });
announcementSchema.index({ isPinned: -1, createdAt: -1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ tags: 1 });

// Virtual: yayınlandı mı kontrolü
announcementSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && 
         (!this.publishAt || this.publishAt <= new Date());
});

// Method: Reaction toggle
announcementSchema.methods.toggleReaction = async function(userId, emoji) {
  const reactionIndex = this.reactions.findIndex(
    r => r.user.toString() === userId.toString() && r.emoji === emoji
  );

  if (reactionIndex > -1) {
    this.reactions.splice(reactionIndex, 1);
    this.stats.reactionsCount = Math.max(0, this.stats.reactionsCount - 1);
  } else {
    // Aynı kullanıcının başka bir reaction'ını kaldır
    const existingReaction = this.reactions.findIndex(
      r => r.user.toString() === userId.toString()
    );
    if (existingReaction > -1) {
      this.reactions.splice(existingReaction, 1);
    } else {
      this.stats.reactionsCount += 1;
    }
    
    this.reactions.push({ user: userId, emoji });
  }

  await this.save();
  return reactionIndex === -1;
};

// Method: Yorum ekleme
announcementSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date()
  });
  this.stats.commentsCount += 1;
  await this.save();
  return this.comments[this.comments.length - 1];
};

// Method: View sayısını artır
announcementSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Static: Aktif duyuruları getir
announcementSchema.statics.getPublished = function(limit = 20) {
  return this.find({
    status: 'published',
    $or: [
      { publishAt: null },
      { publishAt: { $lte: new Date() } }
    ]
  })
  .sort({ isPinned: -1, publishedAt: -1, createdAt: -1 })
  .limit(limit)
  .populate('author', 'username profile.displayName avatar role');
};

// Pre-save middleware
announcementSchema.pre('save', function(next) {
  // Excerpt yoksa, content'ten oluştur
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 250) + (this.content.length > 250 ? '...' : '');
  }

  // Yayınlanma zamanı ayarla
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
