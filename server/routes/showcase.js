const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Showcase = require('../models/Showcase');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Multer configuration for artwork uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/showcase');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `showcase-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Kullanıcının showcase'ini getir (Public)
router.get('/:userId', async (req, res) => {
  try {
    console.log('=== GET SHOWCASE REQUEST ===');
    console.log('userId param:', req.params.userId);
    
    // Discord ID mi yoksa MongoDB ObjectId mi kontrol et
    let user;
    if (req.params.userId.length === 24) {
      // MongoDB ObjectId (24 karakter hex)
      user = await User.findById(req.params.userId);
    } else {
      // Discord ID (uzun sayı)
      user = await User.findOne({ discordId: req.params.userId });
    }

    console.log('User found:', user ? user.username : 'null');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let showcase = await Showcase.findOne({ user: user._id });
    console.log('Showcase found:', showcase ? 'yes' : 'no');

    // Showcase yoksa boş bir tane oluştur
    if (!showcase) {
      console.log('Creating new empty showcase');
      showcase = new Showcase({
        user: user._id,
        items: []
      });
      await showcase.save();
    }

    console.log('Showcase items count:', showcase.items ? showcase.items.length : 0);

    // Görünürlük kontrolü
    if (showcase.visibility === 'private') {
      // Sadece kendi showcase'ini görebilir
      if (!req.user || req.user._id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: 'This showcase is private' });
      }
    }

    console.log('Sending showcase with', showcase.items.length, 'items');
    
    // Plain object olarak gönder
    const showcaseObj = showcase.toObject();
    
    res.json({ showcase: showcaseObj });
  } catch (error) {
    console.error('Get showcase error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Showcase'i güncelle (Auth required)
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { title, items, visibility } = req.body;

    let showcase = await Showcase.findOne({ user: req.user._id });

    if (!showcase) {
      showcase = new Showcase({ user: req.user._id });
    }

    if (title !== undefined) {
      showcase.title = title;
    }

    if (visibility !== undefined) {
      showcase.visibility = visibility;
    }

    if (items !== undefined) {
      // Max 12 item kontrolü
      if (items.length > 12) {
        return res.status(400).json({ error: 'Maximum 12 showcase items allowed' });
      }
      
      showcase.items = items;
    }

    await showcase.save();
    await showcase.populate('items.achievementId');

    res.json({ showcase });
  } catch (error) {
    console.error('Update showcase error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Showcase item ekle
router.post('/item', authenticateToken, async (req, res) => {
  try {
    const { type, achievementId, title, description, badge } = req.body;

    let showcase = await Showcase.findOne({ user: req.user._id });

    if (!showcase) {
      showcase = new Showcase({ user: req.user._id });
    }

    // Max 12 item kontrolü
    if (showcase.items.length >= 12) {
      return res.status(400).json({ error: 'Maximum 12 showcase items allowed' });
    }

    const newItem = {
      type,
      title,
      description,
      badge,
      order: showcase.items.length
    };

    if (type === 'achievement' && achievementId) {
      newItem.achievementId = achievementId;
    }

    showcase.items.push(newItem);
    await showcase.save();
    await showcase.populate('items.achievementId');

    res.json({ showcase });
  } catch (error) {
    console.error('Add showcase item error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Artwork/Screenshot upload (sadece dosyayı yükle, database'e ekleme)
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { title, description, type } = req.body;

    const imageUrl = `/uploads/showcase/${req.file.filename}`;

    const newItem = {
      type: type || 'artwork',
      image: imageUrl,
      title: title || 'Untitled',
      description: description || '',
      order: 0 // Client-side'da düzenlenecek
    };

    // Database'e ekleme, sadece item objesini döndür
    // Client-side saveShowcase çağrısında eklenecek
    res.json({ 
      item: newItem
    });
  } catch (error) {
    console.error('Upload showcase image error:', error);
    // Hata durumunda dosyayı sil
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Showcase item sil
router.delete('/item/:itemId', authenticateToken, async (req, res) => {
  try {
    const showcase = await Showcase.findOne({ user: req.user._id });

    if (!showcase) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    const item = showcase.items.id(req.params.itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Eğer resim varsa, dosyayı sil
    if (item.image) {
      const imagePath = path.join(__dirname, '..', item.image);
      await fs.unlink(imagePath).catch(err => console.error('Delete image error:', err));
    }

    // Item'ı kaldır
    showcase.items.pull(req.params.itemId);
    
    // Order'ları yeniden düzenle
    showcase.items.forEach((item, index) => {
      item.order = index;
    });

    await showcase.save();

    res.json({ message: 'Item deleted', showcase });
  } catch (error) {
    console.error('Delete showcase item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Showcase item'ları yeniden sırala
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const { itemIds } = req.body; // Array of item IDs in new order

    const showcase = await Showcase.findOne({ user: req.user._id });

    if (!showcase) {
      return res.status(404).json({ error: 'Showcase not found' });
    }

    // Yeni sıralamayı uygula
    itemIds.forEach((itemId, index) => {
      const item = showcase.items.id(itemId);
      if (item) {
        item.order = index;
      }
    });

    // Order'a göre sırala
    showcase.items.sort((a, b) => a.order - b.order);

    await showcase.save();
    await showcase.populate('items.achievementId');

    res.json({ showcase });
  } catch (error) {
    console.error('Reorder showcase error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Showcase'i tamamen sil (Debug için)
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await Showcase.deleteOne({ user: req.user._id });
    res.json({ message: 'Showcase cleared' });
  } catch (error) {
    console.error('Clear showcase error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
