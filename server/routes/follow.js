const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Kullanıcıyı takip et
router.post('/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Kendini takip edemezsin' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentUser = await User.findById(currentUserId);

    // Zaten takip ediyorsa
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ error: 'Zaten takip ediyorsun' });
    }

    // Takip et
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    // Stats güncelle
    currentUser.stats.followingCount = currentUser.following.length;
    targetUser.stats.followersCount = targetUser.followers.length;

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      message: 'Takip edildi',
      following: true,
      followersCount: targetUser.stats.followersCount
    });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Takibi bırak
router.delete('/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentUser = await User.findById(currentUserId);

    // Takip etmiyorsa
    if (!currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ error: 'Zaten takip etmiyorsun' });
    }

    // Takibi bırak
    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());

    // Stats güncelle
    currentUser.stats.followingCount = currentUser.following.length;
    targetUser.stats.followersCount = targetUser.followers.length;

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      message: 'Takip bırakıldı',
      following: false,
      followersCount: targetUser.stats.followersCount
    });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Takip durumunu kontrol et
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);
    const following = currentUser.following.includes(targetUserId);

    res.json({ following });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Takipçileri listele
router.get('/:userId/followers', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('followers', 'username avatar discordId role');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ followers: user.followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Takip edilenleri listele
router.get('/:userId/following', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate('following', 'username avatar discordId role');

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ following: user.following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
