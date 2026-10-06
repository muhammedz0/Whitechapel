/* ============================================
   Achievements Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const { authenticateToken, requireAdmin, optionalAuth } = require('../middleware/auth');

/* Get All Achievements */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const achievements = await Achievement.getActive();
    res.json({ achievements });
  } catch (error) {
    res.status(500).json({ error: 'Başarımlar yüklenemedi' });
  }
});

/* Get Achievements by Category */
router.get('/category/:category', optionalAuth, async (req, res) => {
  try {
    const achievements = await Achievement.getByCategory(req.params.category);
    res.json({ achievements });
  } catch (error) {
    res.status(500).json({ error: 'Başarımlar yüklenemedi' });
  }
});

/* Get User's Achievements */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('achievements.achievementId');
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const stats = await Achievement.calculateUserStats(req.params.userId);

    res.json({
      achievements: user.achievements,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: 'Başarımlar yüklenemedi' });
  }
});

/* Sync Achievement from Discord Bot */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { achievementKey, progress } = req.body;

    const achievement = await Achievement.findOne({ achievementKey });
    if (!achievement) {
      return res.status(404).json({ error: 'Başarım bulunamadı' });
    }

    const added = await req.user.addAchievement(achievement._id);
    
    if (added) {
      await achievement.updateUnlockedPercentage();
    }

    res.json({ 
      unlocked: added,
      achievement,
      message: added ? 'Başarım kilidi açıldı!' : 'Başarım zaten kazanılmış'
    });
  } catch (error) {
    res.status(500).json({ error: 'Senkronizasyon başarısız' });
  }
});

/* Create Achievement (Admin only) */
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const achievement = new Achievement(req.body);
    await achievement.save();
    res.status(201).json({ achievement, message: 'Başarım oluşturuldu' });
  } catch (error) {
    res.status(500).json({ error: 'Başarım oluşturulamadı' });
  }
});

module.exports = router;
