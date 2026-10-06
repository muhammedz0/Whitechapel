/* ============================================
   Profile Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer konfigürasyonu - resim yükleme
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.discordId + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Sadece resim dosyaları yüklenebilir (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

/* ============================================
   GET /api/profile/:identifier
   Kullanıcı profili görüntüleme (discordId veya username ile)
   ============================================ */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // discordId veya username ile kullanıcı bul
    const user = await User.findOne({
      $or: [
        { discordId: identifier },
        { username: new RegExp('^' + identifier + '$', 'i') }
      ]
    })
      .populate('achievements.achievementId', 'name description icon rarity')
      .select('-email -publicKey -notifications');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Profil gizlilik kontrolü
    if (user.profile.profileVisibility === 'private') {
      // Sadece kendi profilini veya admin görebilir
      if (!req.user || (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Bu profil gizli' });
      }
    }

    // Profil görüntülenme sayısını artır (kendi profili değilse)
    if (req.user && req.user._id.toString() !== user._id.toString()) {
      user.profile.views += 1;
      
      // Son görüntüleyenler listesine ekle
      const viewerIndex = user.profile.recentViewers.findIndex(
        v => v.userId && v.userId.toString() === req.user._id.toString()
      );
      
      if (viewerIndex !== -1) {
        // Zaten varsa güncelle
        user.profile.recentViewers[viewerIndex].viewedAt = new Date();
      } else {
        // Yeni görüntüleyen ekle
        user.profile.recentViewers.unshift({
          userId: req.user._id,
          viewedAt: new Date()
        });
        // Son 10'u tut
        if (user.profile.recentViewers.length > 10) {
          user.profile.recentViewers = user.profile.recentViewers.slice(0, 10);
        }
      }
      
      await user.save();
    }

    // Son görüntüleyenleri populate et
    await user.populate('profile.recentViewers.userId', 'username avatar discordId');

    res.json({
      user: {
        id: user._id,
        discordId: user.discordId,
        username: user.username,
        avatar: user.profile.customAvatar || user.discordAvatarUrl,
        profile: user.profile,
        stats: user.stats,
        achievements: user.achievements,
        role: user.role,
        createdAt: user.createdAt,
        lastActive: user.lastActive
      }
    });

  } catch (error) {
    console.error('Profil görüntüleme hatası:', error);
    res.status(500).json({ error: 'Profil yüklenemedi' });
  }
});

/* ============================================
   PUT /api/profile
   Kendi profilini güncelleme
   ============================================ */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const {
      displayName,
      bio,
      theme,
      backgroundColor,
      accentColor,
      textColor,
      profileVisibility,
      socialLinks,
      displayBadges,
      favoriteSlasher,
      statusMessage
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Profil alanlarını güncelle
    if (displayName !== undefined) user.profile.displayName = displayName;
    if (bio !== undefined) user.profile.bio = bio;
    if (theme !== undefined) user.profile.theme = theme;
    if (backgroundColor !== undefined) user.profile.backgroundColor = backgroundColor;
    if (accentColor !== undefined) user.profile.accentColor = accentColor;
    if (textColor !== undefined) user.profile.textColor = textColor;
    if (profileVisibility !== undefined) user.profile.profileVisibility = profileVisibility;
    if (favoriteSlasher !== undefined) user.profile.favoriteSlasher = favoriteSlasher;
    if (statusMessage !== undefined) user.profile.statusMessage = statusMessage;

    // Sosyal medya linklerini güncelle
    if (socialLinks) {
      if (socialLinks.twitter !== undefined) user.profile.socialLinks.twitter = socialLinks.twitter;
      if (socialLinks.instagram !== undefined) user.profile.socialLinks.instagram = socialLinks.instagram;
      if (socialLinks.youtube !== undefined) user.profile.socialLinks.youtube = socialLinks.youtube;
      if (socialLinks.twitch !== undefined) user.profile.socialLinks.twitch = socialLinks.twitch;
      if (socialLinks.steam !== undefined) user.profile.socialLinks.steam = socialLinks.steam;
      if (socialLinks.custom !== undefined) user.profile.socialLinks.custom = socialLinks.custom;
    }

    // Rozetleri güncelle (max 5)
    if (displayBadges && Array.isArray(displayBadges)) {
      user.profile.displayBadges = displayBadges.slice(0, 5);
    }

    await user.save();

    res.json({
      message: 'Profil güncellendi',
      profile: user.profile
    });

  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

/* ============================================
   POST /api/profile/upload/avatar
   Avatar yükleme
   ============================================ */
router.post('/upload/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Eski avatar'ı sil
    if (user.profile.customAvatar && user.profile.customAvatar.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../..', user.profile.customAvatar);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.error('Eski avatar silinemedi:', err);
      }
    }

    // Yeni avatar'ı kaydet
    user.profile.customAvatar = '/uploads/profiles/' + req.file.filename;
    await user.save();

    res.json({
      message: 'Avatar yüklendi',
      avatarUrl: user.profile.customAvatar
    });

  } catch (error) {
    console.error('Avatar yükleme hatası:', error);
    res.status(500).json({ error: 'Avatar yüklenemedi' });
  }
});

/* ============================================
   POST /api/profile/upload/banner
   Banner yükleme
   ============================================ */
router.post('/upload/banner', authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Eski banner'ı sil
    if (user.profile.banner && user.profile.banner.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../..', user.profile.banner);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.error('Eski banner silinemedi:', err);
      }
    }

    // Yeni banner'ı kaydet
    user.profile.banner = '/uploads/profiles/' + req.file.filename;
    await user.save();

    res.json({
      message: 'Banner yüklendi',
      bannerUrl: user.profile.banner
    });

  } catch (error) {
    console.error('Banner yükleme hatası:', error);
    res.status(500).json({ error: 'Banner yüklenemedi' });
  }
});

/* ============================================
   DELETE /api/profile/avatar
   Avatar'ı sil (Discord avatar'a dön)
   ============================================ */
router.delete('/avatar', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Custom avatar varsa dosyayı sil
    if (user.profile.customAvatar && user.profile.customAvatar.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../..', user.profile.customAvatar);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Avatar dosyası silinemedi:', err);
      }
    }

    user.profile.customAvatar = null;
    await user.save();

    res.json({
      message: 'Avatar silindi, Discord avatar kullanılıyor',
      avatarUrl: user.discordAvatarUrl
    });

  } catch (error) {
    console.error('Avatar silme hatası:', error);
    res.status(500).json({ error: 'Avatar silinemedi' });
  }
});

/* ============================================
   DELETE /api/profile/banner
   Banner'ı sil
   ============================================ */
router.delete('/banner', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Banner varsa dosyayı sil
    if (user.profile.banner && user.profile.banner.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../..', user.profile.banner);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Banner dosyası silinemedi:', err);
      }
    }

    user.profile.banner = null;
    await user.save();

    res.json({
      message: 'Banner silindi'
    });

  } catch (error) {
    console.error('Banner silme hatası:', error);
    res.status(500).json({ error: 'Banner silinemedi' });
  }
});

/* ============================================
   GET /api/profile/:identifier/achievements
   Kullanıcının başarımlarını getir
   ============================================ */
router.get('/:identifier/achievements', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    const user = await User.findOne({
      $or: [
        { discordId: identifier },
        { username: new RegExp('^' + identifier + '$', 'i') }
      ]
    })
      .populate('achievements.achievementId')
      .select('username achievements');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({
      username: user.username,
      achievements: user.achievements
    });

  } catch (error) {
    console.error('Başarımlar yükleme hatası:', error);
    res.status(500).json({ error: 'Başarımlar yüklenemedi' });
  }
});

module.exports = router;
