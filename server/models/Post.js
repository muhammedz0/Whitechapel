/* ============================================
   Post Model (Sosyal İçerik Paylaşımı)
   ============================================ */

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // İçerik
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  // Medya
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String
    },
    alt: {
      type: String,
      default: ''
    }
  }],

  // Hashtag'ler
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Kategori (korku türleri)
  category: {
    type: String,
    enum: ['slasher', 'gore', 'psychological', 'supernatural', 'thriller', 'general'],
    default: 'general'
  },

  // İçerik uyarısı
  contentWarning: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      maxlength: 200
    },
    reasons: [{
      type: String,
      enum: ['gore', 'violence', 'disturbing', 'spoiler', 'nsfw']
    }]
  },

  // Etkileşimler
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
    },
    editedAt: {
      type: Date
    }
  }],

  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
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
    likesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    sharesCount: {
      type: Number,
      default: 0
    },
    bookmarksCount: {
      type: Number,
      default: 0
    }
  },

  // Post türü
  postType: {
    type: String,
    enum: ['standard', 'poll', 'event', 'review'],
    default: 'standard'
  },

  // Poll (opsiyonel)
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    endsAt: Date,
    multipleChoice: {
      type: Boolean,
      default: false
    }
  },

  // Pinned (sabitleme)
  isPinned: {
    type: Boolean,
    default: false
  },

  // Moderasyon
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenReason: {
    type: String
  },
  reportCount: {
    type: Number,
    default: 0
  },

  // Edit geçmişi
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ 'stats.likesCount': -1 });
postSchema.index({ isPinned: -1, createdAt: -1 });

// Virtual: like var mı kontrol
postSchema.virtual('isLiked').get(function() {
  // Frontend'te kullanıcı ID'si ile kontrol edilecek
  return false;
});

// Method: Like toggle
postSchema.methods.toggleLike = async function(userId) {
  const likeIndex = this.likes.findIndex(
    like => like.user.toString() === userId.toString()
  );

  if (likeIndex > -1) {
    this.likes.splice(likeIndex, 1);
    this.stats.likesCount = Math.max(0, this.stats.likesCount - 1);
  } else {
    this.likes.push({ user: userId });
    this.stats.likesCount += 1;
  }

  await this.save();
  return likeIndex === -1; // true = liked, false = unliked
};

// Method: Yorum ekleme
postSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content,
    createdAt: new Date()
  });
  this.stats.commentsCount += 1;
  await this.save();
  return this.comments[this.comments.length - 1];
};

// Method: Bookmark toggle
postSchema.methods.toggleBookmark = async function(userId) {
  const bookmarkIndex = this.bookmarks.indexOf(userId);

  if (bookmarkIndex > -1) {
    this.bookmarks.splice(bookmarkIndex, 1);
    this.stats.bookmarksCount = Math.max(0, this.stats.bookmarksCount - 1);
  } else {
    this.bookmarks.push(userId);
    this.stats.bookmarksCount += 1;
  }

  await this.save();
  return bookmarkIndex === -1;
};

// Method: View sayısını artır
postSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Static: Trending posts
postSchema.statics.getTrending = function(limit = 10) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.find({
    createdAt: { $gte: oneDayAgo },
    isHidden: false
  })
  .sort({ 'stats.likesCount': -1, 'stats.commentsCount': -1 })
  .limit(limit)
  .populate('author', 'username profile.displayName avatar discordId');
};

// Pre-save middleware
postSchema.pre('save', function(next) {
  // Hashtag'leri otomatik çıkar
  if (this.isModified('content')) {
    const hashtagRegex = /#(\w+)/g;
    const matches = this.content.match(hashtagRegex);
    if (matches) {
      this.hashtags = [...new Set(matches.map(tag => tag.slice(1).toLowerCase()))];
    }
  }
  
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Post', postSchema);
