const mongoose = require('mongoose');

const showcaseItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['artwork', 'achievement', 'badge', 'screenshot', 'custom'],
    required: true
  },
  
  // Resim URL'si
  image: String,
  
  title: {
    type: String,
    maxlength: 100
  },
  
  description: {
    type: String,
    maxlength: 300
  },
  
  // Badge ise emoji/icon
  badge: String,
  
  // Sıralama için
  order: {
    type: Number,
    default: 0
  }
}, { _id: true });

const showcaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Vitrin başlığı
  title: {
    type: String,
    default: 'Vitrinim',
    maxlength: 50
  },
  
  // Vitrin öğeleri (max 12 item)
  items: [showcaseItemSchema],
  
  // Görünürlük
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  }
}, {
  timestamps: true
});

// Max 12 item kontrolü
showcaseSchema.pre('save', function(next) {
  if (this.items && this.items.length > 12) {
    return next(new Error('Maximum 12 showcase items allowed'));
  }
  next();
});

module.exports = mongoose.model('Showcase', showcaseSchema);
