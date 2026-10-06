/* ============================================
   Socket.IO Handler (Real-time Messaging)
   ============================================ */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const JWT_SECRET = process.env.JWT_SECRET || 'whitechapel_secret_key_change_in_production';

module.exports = (io) => {
  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || user.isBannedNow()) {
        return next(new Error('User not found or banned'));
      }

      socket.userId = user._id.toString();
      socket.username = user.username;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✓ User connected: ${socket.username} (${socket.userId})`);

    // Kullanıcıyı kendi odasına ekle
    socket.join(`user_${socket.userId}`);

    /* ═══════════════════════════════════════
       Typing Indicator
    ══════════════════════════════════════════ */
    socket.on('typing_start', ({ recipientId }) => {
      io.to(`user_${recipientId}`).emit('user_typing', {
        userId: socket.userId,
        username: socket.username
      });
    });

    socket.on('typing_stop', ({ recipientId }) => {
      io.to(`user_${recipientId}`).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    /* ═══════════════════════════════════════
       Online Status
    ══════════════════════════════════════════ */
    socket.on('update_status', async ({ status }) => {
      // Broadcast to all connections (friends could listen to this)
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: status || 'online'
      });

      // Update lastActive in database
      try {
        await User.findByIdAndUpdate(socket.userId, {
          lastActive: new Date()
        });
      } catch (error) {
        console.error('Update status error:', error);
      }
    });

    /* ═══════════════════════════════════════
       Read Receipt
    ══════════════════════════════════════════ */
    socket.on('message_read', async ({ messageId, senderId }) => {
      try {
        const message = await Message.findById(messageId);
        if (message && message.recipient.toString() === socket.userId) {
          await message.markAsRead();
          
          // Gönderene bildir
          io.to(`user_${senderId}`).emit('message_read_receipt', {
            messageId,
            readAt: message.readAt
          });
        }
      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    /* ═══════════════════════════════════════
       Real-time Notifications
    ══════════════════════════════════════════ */
    socket.on('send_notification', ({ userId, notification }) => {
      io.to(`user_${userId}`).emit('notification', notification);
    });

    /* ═══════════════════════════════════════
       Disconnect
    ══════════════════════════════════════════ */
    socket.on('disconnect', async () => {
      console.log(`✗ User disconnected: ${socket.username}`);
      
      // Broadcast offline status
      socket.broadcast.emit('user_status_change', {
        userId: socket.userId,
        status: 'offline'
      });

      // Update lastActive
      try {
        await User.findByIdAndUpdate(socket.userId, {
          lastActive: new Date()
        });
      } catch (error) {
        console.error('Disconnect update error:', error);
      }
    });

    /* ═══════════════════════════════════════
       Error Handling
    ══════════════════════════════════════════ */
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✓ Socket.IO handlers initialized');
};
