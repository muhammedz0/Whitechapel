/* ============================================
   User Routes (Profil Yönetimi)
   ============================================ */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Multer yapılandırması (profil resimleri için)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

/* ═══════════════════════════════════════
   Get User Profile
══════════════════════════════════════════ */
router.get('/:identifier', optionalAuth, async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Discord ID veya MongoDB ID ile kullanıcı bul
    const user = await User.findOne({
      $or: [
        { discordId: identifier },
        { _id: identifier }
      ]
    })
    .select('-email -publicKey -__v')
    .populate('achievements.achievementId', 'name description icon category points rarity');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Profil görünürlüğü kontrolü
    const isOwner = req.user && req.user._id.toString() === user._id.toString();
    const isPublic = user.profile.profileVisibility === 'public';

    if (!isPublic && !isOwner) {
      return res.status(403).json({ error: 'Bu profil gizli' });
    }

    // İstatistikleri ekle
    const response = {
      user,
      isOwner,
      stats: user.stats
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Profil yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Update Profile
══════════════════════════════════════════ */
router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const {
      displayName,
      bio,
      theme,
      backgroundColor,
      accentColor,
      profileVisibility
    } = req.body;

    const updates = {};

    if (displayName !== undefined) {
      if (displayName.length > 50) {
        return res.status(400).json({ error: 'Görünen ad çok uzun (max 50 karakter)' });
      }
      updates['profile.displayName'] = displayName.trim();
    }

    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({ error: 'Bio çok uzun (max 500 karakter)' });
      }
      updates['profile.bio'] = bio.trim();
    }

    if (theme !== undefined) {
      const validThemes = ['blood', 'dark', 'nightmare', 'asylum'];
      if (!validThemes.includes(theme)) {
        return res.status(400).json({ error: 'Geçersiz tema' });
      }
      updates['profile.theme'] = theme;
    }

    if (backgroundColor !== undefined) {
      updates['profile.backgroundColor'] = backgroundColor;
    }

    if (accentColor !== undefined) {
      updates['profile.accentColor'] = accentColor;
    }

    if (profileVisibility !== undefined) {
      const validVisibility = ['public', 'friends', 'private'];
      if (!validVisibility.includes(profileVisibility)) {
        return res.status(400).json({ error: 'Geçersiz görünürlük ayarı' });
      }
      updates['profile.profileVisibility'] = profileVisibility;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-email -publicKey -__v');

    res.json({ user, message: 'Profil güncellendi' });
  } catch (error) {
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

/* ═══════════════════════════════════════
   Upload Custom Avatar
══════════════════════════════════════════ */
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya bulunamadı' });
    }

    const uploadsDir = path.join(__dirname, '../uploads/avatars');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `avatar_${req.user.discordId}_${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Resmi optimize et ve kaydet
    await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Eski avatar'ı sil (varsa)
    if (req.user.profile.customAvatar) {
      const oldPath = path.join(__dirname, '../uploads/avatars', path.basename(req.user.profile.customAvatar));
      await fs.unlink(oldPath).catch(() => {});
    }

    // Kullanıcıyı güncelle
    req.user.profile.customAvatar = `/uploads/avatars/${filename}`;
    await req.user.save();

    res.json({ 
      avatarUrl: req.user.profile.customAvatar,
      message: 'Avatar yüklendi'
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Upload Banner
══════════════════════════════════════════ */
router.post('/banner', authenticateToken, upload.single('banner'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya bulunamadı' });
    }

    const uploadsDir = path.join(__dirname, '../uploads/banners');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `banner_${req.user.discordId}_${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Resmi optimize et ve kaydet (banner boyutu)
    await sharp(req.file.buffer)
      .resize(1500, 500, { fit: 'cover' })
      .webp({ quality: 85 })
      .toFile(filepath);

    // Eski banner'ı sil (varsa)
    if (req.user.profile.banner) {
      const oldPath = path.join(__dirname, '../uploads/banners', path.basename(req.user.profile.banner));
      await fs.unlink(oldPath).catch(() => {});
    }

    // Kullanıcıyı güncelle
    req.user.profile.banner = `/uploads/banners/${filename}`;
    await req.user.save();

    res.json({ 
      bannerUrl: req.user.profile.banner,
      message: 'Banner yüklendi'
    });
  } catch (error) {
    console.error('Banner upload error:', error);
    res.status(500).json({ error: 'Banner yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Follow / Unfollow User
══════════════════════════════════════════ */
router.post('/:userId/follow', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Kendinizi takip edemezsiniz' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const isFollowing = req.user.following.includes(userId);

    if (isFollowing) {
      // Unfollow
      req.user.following.pull(userId);
      targetUser.followers.pull(req.user._id);
      req.user.stats.followingCount = Math.max(0, req.user.stats.followingCount - 1);
      targetUser.stats.followersCount = Math.max(0, targetUser.stats.followersCount - 1);
    } else {
      // Follow
      req.user.following.push(userId);
      targetUser.followers.push(req.user._id);
      req.user.stats.followingCount += 1;
      targetUser.stats.followersCount += 1;
    }

    await req.user.save();
    await targetUser.save();

    res.json({ 
      following: !isFollowing,
      message: isFollowing ? 'Takipten çıkıldı' : 'Takip edildi'
    });
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

/* ═══════════════════════════════════════
   Get User's Followers
══════════════════════════════════════════ */
router.get('/:userId/followers', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username profile.displayName avatar discordId');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ followers: user.followers });
  } catch (error) {
    res.status(500).json({ error: 'Takipçiler yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Get User's Following
══════════════════════════════════════════ */
router.get('/:userId/following', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username profile.displayName avatar discordId');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ following: user.following });
  } catch (error) {
    res.status(500).json({ error: 'Takip edilenler yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Update Notification Settings
══════════════════════════════════════════ */
router.patch('/notifications', authenticateToken, async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['email', 'push', 'announcements', 'messages', 'likes', 'comments', 'games'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[`notifications.${field}`] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    ).select('notifications');

    res.json({ notifications: user.notifications, message: 'Bildirim ayarları güncellendi' });
  } catch (error) {
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

/* ═══════════════════════════════════════
   Search Users
══════════════════════════════════════════ */
router.get('/search/:query', optionalAuth, async (req, res) => {
  try {
    const { query } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { 'profile.displayName': { $regex: query, $options: 'i' } }
      ],
      isBanned: false
    })
    .select('username profile.displayName avatar discordId stats.followersCount')
    .limit(limit)
    .sort({ 'stats.followersCount': -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Arama başarısız' });
  }
});

module.exports = router;
