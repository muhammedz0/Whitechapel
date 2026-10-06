/* ============================================
   Messages Routes (E2E Encrypted)
   ============================================ */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { messageLimiter } = require('../middleware/rateLimiter');

/* Get Conversations List */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await Message.getConversations(req.user._id, 20);
    
    // Her conversation için diğer kullanıcının bilgilerini al
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.lastMessage.sender.toString() === req.user._id.toString()
          ? conv.lastMessage.recipient
          : conv.lastMessage.sender;
        
        const otherUser = await User.findById(otherUserId)
          .select('username profile.displayName avatar discordId lastActive');
        
        return {
          ...conv,
          otherUser
        };
      })
    );

    res.json({ conversations: enrichedConversations });
  } catch (error) {
    res.status(500).json({ error: 'Konuşmalar yüklenemedi' });
  }
});

/* Get Messages in Conversation */
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // Message ID for pagination

    const conversationId = Message.getConversationId(req.user._id, userId);
    
    const query = {
      conversationId,
      deletedBy: { $not: { $elemMatch: { user: req.user._id } } }
    };

    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username profile.displayName avatar discordId')
      .populate('recipient', 'username profile.displayName avatar discordId');

    // Okunmamış mesajları okundu işaretle
    const unreadMessages = messages.filter(
      m => !m.read && m.recipient._id.toString() === req.user._id.toString()
    );
    
    await Promise.all(unreadMessages.map(m => m.markAsRead()));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Mesajlar yüklenemedi' });
  }
});

/* Send Message */
router.post('/send', authenticateToken, messageLimiter, async (req, res) => {
  try {
    const { recipientId, encryptedContent, nonce, messageType } = req.body;

    if (!recipientId || !encryptedContent || !nonce) {
      return res.status(400).json({ error: 'Eksik alanlar' });
    }

    // Alıcıyı kontrol et
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Alıcı bulunamadı' });
    }

    const conversationId = Message.getConversationId(req.user._id, recipientId);

    const message = new Message({
      conversationId,
      sender: req.user._id,
      recipient: recipientId,
      encryptedContent,
      nonce,
      messageType: messageType || 'text'
    });

    await message.save();
    await message.populate('sender', 'username profile.displayName avatar discordId');
    await message.populate('recipient', 'username profile.displayName avatar discordId');

    // Socket.io ile real-time gönder (socket handler'da)
    const io = require('../server').io;
    io.to(`user_${recipientId}`).emit('new_message', message);

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Mesaj gönderilemedi' });
  }
});

/* Delete Message */
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }

    // Sadece gönderen veya alıcı silebilir
    const canDelete =
      message.sender.toString() === req.user._id.toString() ||
      message.recipient.toString() === req.user._id.toString();

    if (!canDelete) {
      return res.status(403).json({ error: 'Yetkisiz işlem' });
    }

    await message.deleteForUser(req.user._id);

    res.json({ message: 'Mesaj silindi' });
  } catch (error) {
    res.status(500).json({ error: 'Mesaj silinemedi' });
  }
});

/* Get Unread Count */
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: 'Sayı alınamadı' });
  }
});

/* Mark Conversation as Read */
router.post('/conversation/:userId/read', authenticateToken, async (req, res) => {
  try {
    const conversationId = Message.getConversationId(req.user._id, req.params.userId);

    await Message.updateMany(
      {
        conversationId,
        recipient: req.user._id,
        read: false
      },
      {
        $set: { read: true, readAt: new Date() }
      }
    );

    res.json({ message: 'Konuşma okundu işaretlendi' });
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız' });
  }
});

/* Update Public Key (for E2E encryption) */
router.post('/publickey', authenticateToken, async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: 'Public key gerekli' });
    }

    req.user.publicKey = publicKey;
    await req.user.save();

    res.json({ message: 'Public key güncellendi' });
  } catch (error) {
    res.status(500).json({ error: 'Güncelleme başarısız' });
  }
});

/* Get User's Public Key */
router.get('/publickey/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('publicKey');

    if (!user || !user.publicKey) {
      return res.status(404).json({ error: 'Public key bulunamadı' });
    }

    res.json({ publicKey: user.publicKey });
  } catch (error) {
    res.status(500).json({ error: 'Public key alınamadı' });
  }
});

module.exports = router;
