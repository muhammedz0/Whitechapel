/* ============================================
   Announcements Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { authenticateToken, requireModerator, optionalAuth } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

/* Get All Published Announcements */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const announcements = await Announcement.getPublished(limit);
    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ error: 'Duyurular yüklenemedi' });
  }
});

/* Get Single Announcement */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'username profile.displayName avatar role');
    
    if (!announcement) {
      return res.status(404).json({ error: 'Duyuru bulunamadı' });
    }

    await announcement.incrementViews();
    res.json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Duyuru yüklenemedi' });
  }
});

/* Create Announcement (Admin/Mod only) */
router.post('/', authenticateToken, requireModerator, upload.single('banner'), async (req, res) => {
  try {
    const { title, content, type, priority, tags, status } = req.body;

    let bannerUrl = null;
    if (req.file) {
      const uploadsDir = path.join(__dirname, '../uploads/announcements');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const filename = `banner_${Date.now()}.webp`;
      const filepath = path.join(uploadsDir, filename);
      
      await sharp(req.file.buffer)
        .resize(1200, 400, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(filepath);
      
      bannerUrl = `/uploads/announcements/${filename}`;
    }

    const announcement = new Announcement({
      author: req.user._id,
      title,
      content,
      banner: bannerUrl,
      type: type || 'general',
      priority: priority || 'normal',
      tags: tags ? JSON.parse(tags) : [],
      status: status || 'published'
    });

    await announcement.save();
    await announcement.populate('author', 'username profile.displayName avatar role');

    res.status(201).json({ announcement, message: 'Duyuru oluşturuldu' });
  } catch (error) {
    res.status(500).json({ error: 'Duyuru oluşturulamadı' });
  }
});

/* Toggle Reaction */
router.post('/:id/react', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const validEmojis = ['👍', '❤️', '😱', '🔥', '💀', '🩸', '👻', '😈'];
    
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ error: 'Geçersiz emoji' });
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Duyuru bulunamadı' });
    }

    await announcement.toggleReaction(req.user._id, emoji);
    res.json({ message: 'Reaction eklendi', reactions: announcement.reactions });
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

/* Add Comment */
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'Duyuru bulunamadı' });
    }

    const comment = await announcement.addComment(req.user._id, content);
    await announcement.populate('comments.user', 'username profile.displayName avatar discordId');

    res.status(201).json({ comment: announcement.comments.id(comment._id) });
  } catch (error) {
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

module.exports = router;
