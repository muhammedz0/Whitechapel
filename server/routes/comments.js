const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// Bir kullanıcının profil yorumlarını getir (Public - login gerekmez)
router.get('/profile/:userId', async (req, res) => {
  try {
    const targetUser = await User.findOne({
      $or: [
        { discordId: req.params.userId },
        { _id: req.params.userId }
      ]
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Yorumları getir, silinmemişleri
    const comments = await Comment.find({
      targetUser: targetUser._id,
      deleted: false
    })
      .populate('author', 'username avatar discordId role')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Yorum yap (Auth required)
router.post('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    // Target user'ı bul
    const targetUser = await User.findOne({
      $or: [
        { discordId: req.params.userId },
        { _id: req.params.userId }
      ]
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Kendi profiline yorum yapmasına izin ver (Steam gibi)
    
    // Yorum oluştur
    const comment = new Comment({
      targetUser: targetUser._id,
      author: req.user._id,
      content: content.trim()
    });

    await comment.save();

    // Populate et
    await comment.populate('author', 'username avatar discordId role');

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Yorumu düzenle (Sadece kendi yorumunu)
router.put('/:commentId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Sadece kendi yorumunu düzenleyebilir
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    comment.content = content.trim();
    comment.edited = true;
    comment.editedAt = new Date();

    await comment.save();
    await comment.populate('author', 'username avatar discordId role');

    res.json({ comment });
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Yorumu sil (Kendi yorumunu veya profilin sahibi)
router.delete('/:commentId', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Kendi yorumunu silebilir VEYA kendi profilindeki herhangi bir yorumu silebilir
    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isProfileOwner = comment.targetUser.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isAuthor && !isProfileOwner && !isAdmin) {
      return res.status(403).json({ error: 'You cannot delete this comment' });
    }

    comment.deleted = true;
    await comment.save();

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
