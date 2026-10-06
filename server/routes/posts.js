/* ============================================
   Posts Routes (Sosyal İçerik)
   ============================================ */

const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { postLimiter, commentLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları'));
    }
  }
});

/* ═══════════════════════════════════════
   Create Post
══════════════════════════════════════════ */
router.post('/', authenticateToken, postLimiter, upload.array('media', 4), async (req, res) => {
  try {
    const { content, category, contentWarning } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'İçerik gerekli' });
    }

    // Medya dosyalarını işle
    const mediaUrls = [];
    if (req.files && req.files.length > 0) {
      const uploadsDir = path.join(__dirname, '../uploads/posts');
      await fs.mkdir(uploadsDir, { recursive: true });

      for (const file of req.files) {
        const filename = `post_${req.user.discordId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webp`;
        const filepath = path.join(uploadsDir, filename);

        await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(filepath);

        mediaUrls.push({
          type: 'image',
          url: `/uploads/posts/${filename}`,
          alt: ''
        });
      }
    }

    const post = new Post({
      author: req.user._id,
      content: content.trim(),
      media: mediaUrls,
      category: category || 'general',
      contentWarning: contentWarning ? JSON.parse(contentWarning) : { enabled: false }
    });

    await post.save();

    // Kullanıcı stats güncelle
    req.user.stats.totalPosts += 1;
    await req.user.save();

    // Populate ve geri dön
    await post.populate('author', 'username profile.displayName avatar discordId role');

    res.status(201).json({ post, message: 'Gönderi oluşturuldu' });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Gönderi oluşturulamadı' });
  }
});

/* ═══════════════════════════════════════
   Get Feed (Timeline)
══════════════════════════════════════════ */
router.get('/feed', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { isHidden: false };

    // Kategori filtresi
    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profile.displayName avatar discordId role')
      .populate('comments.user', 'username profile.displayName avatar discordId');

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Feed yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Get Single Post
══════════════════════════════════════════ */
router.get('/:postId', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username profile.displayName avatar discordId role')
      .populate('comments.user', 'username profile.displayName avatar discordId');

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    // View sayısını artır
    await post.incrementViews();

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Gönderi yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Toggle Like
══════════════════════════════════════════ */
router.post('/:postId/like', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    const liked = await post.toggleLike(req.user._id);

    res.json({ 
      liked,
      likesCount: post.stats.likesCount,
      message: liked ? 'Beğenildi' : 'Beğeni kaldırıldı'
    });
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

/* ═══════════════════════════════════════
   Add Comment
══════════════════════════════════════════ */
router.post('/:postId/comments', authenticateToken, commentLimiter, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Yorum içeriği gerekli' });
    }

    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    const comment = await post.addComment(req.user._id, content.trim());

    // Populate comment
    await post.populate('comments.user', 'username profile.displayName avatar discordId');

    // Kullanıcı stats güncelle
    req.user.stats.totalComments += 1;
    await req.user.save();

    const populatedComment = post.comments.id(comment._id);

    res.status(201).json({ 
      comment: populatedComment,
      message: 'Yorum eklendi'
    });
  } catch (error) {
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Delete Comment
══════════════════════════════════════════ */
router.delete('/:postId/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Yorum bulunamadı' });
    }

    // Sadece yorum sahibi veya admin/moderator silebilir
    const canDelete = 
      comment.user.toString() === req.user._id.toString() ||
      ['admin', 'moderator'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ error: 'Yetkisiz işlem' });
    }

    comment.deleteOne();
    post.stats.commentsCount = Math.max(0, post.stats.commentsCount - 1);
    await post.save();

    res.json({ message: 'Yorum silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Yorum silinemedi' });
  }
});

/* ═══════════════════════════════════════
   Toggle Bookmark
══════════════════════════════════════════ */
router.post('/:postId/bookmark', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    const bookmarked = await post.toggleBookmark(req.user._id);

    res.json({ 
      bookmarked,
      bookmarksCount: post.stats.bookmarksCount,
      message: bookmarked ? 'Kaydedildi' : 'Kayıtlardan çıkarıldı'
    });
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

/* ═══════════════════════════════════════
   Get User's Bookmarks
══════════════════════════════════════════ */
router.get('/bookmarks/my', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      bookmarks: req.user._id,
      isHidden: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username profile.displayName avatar discordId role');

    const total = await Post.countDocuments({
      bookmarks: req.user._id,
      isHidden: false
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Kaydedilenler yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Get User's Posts
══════════════════════════════════════════ */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      author: req.params.userId,
      isHidden: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username profile.displayName avatar discordId role');

    const total = await Post.countDocuments({
      author: req.params.userId,
      isHidden: false
    });

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Gönderiler yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Delete Post
══════════════════════════════════════════ */
router.delete('/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ error: 'Gönderi bulunamadı' });
    }

    // Sadece gönderi sahibi veya admin/moderator silebilir
    const canDelete = 
      post.author.toString() === req.user._id.toString() ||
      ['admin', 'moderator'].includes(req.user.role);

    if (!canDelete) {
      return res.status(403).json({ error: 'Yetkisiz işlem' });
    }

    // Medya dosyalarını sil
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        const filepath = path.join(__dirname, '..', media.url);
        await fs.unlink(filepath).catch(() => {});
      }
    }

    await post.deleteOne();

    // Kullanıcı stats güncelle
    if (post.author.toString() === req.user._id.toString()) {
      req.user.stats.totalPosts = Math.max(0, req.user.stats.totalPosts - 1);
      await req.user.save();
    }

    res.json({ message: 'Gönderi silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Gönderi silinemedi' });
  }
});

/* ═══════════════════════════════════════
   Get Trending Posts
══════════════════════════════════════════ */
router.get('/trending/all', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await Post.getTrending(limit);

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Trending yüklenemedi' });
  }
});

/* ═══════════════════════════════════════
   Search Posts by Hashtag
══════════════════════════════════════════ */
router.get('/hashtag/:tag', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const tag = req.params.tag.toLowerCase().replace('#', '');

    const posts = await Post.find({
      hashtags: tag,
      isHidden: false
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username profile.displayName avatar discordId role');

    const total = await Post.countDocuments({
      hashtags: tag,
      isHidden: false
    });

    res.json({
      posts,
      hashtag: tag,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Hashtag araması başarısız' });
  }
});

module.exports = router;
