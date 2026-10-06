/* ============================================
   Authentication Middleware
   ============================================ */

const jwt = require('jsonwebtoken');

// JWT token doğrulama
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token gerekli' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'whitechapel_secret_key_change_in_production');
    
    // Kullanıcıyı veritabanından getir
    const { User } = global.db;
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Ban kontrolü
    if (user.isBannedNow()) {
      return res.status(403).json({ 
        error: 'Hesabınız yasaklanmış', 
        bannedUntil: user.bannedUntil,
        banReason: user.banReason
      });
    }

    // Son aktiflik zamanını güncelle
    user.lastActive = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    return res.status(500).json({ error: 'Kimlik doğrulama hatası' });
  }
};

// Opsiyonel auth (token yoksa da devam eder)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'whitechapel_secret_key_change_in_production');
      const { User } = global.db;
      const user = await User.findByPk(decoded.userId);
      
      if (user && !user.isBannedNow()) {
        req.user = user;
        user.lastActive = new Date();
        await user.save();
      }
    }
    
    next();
  } catch (error) {
    // Token hatalı olsa bile devam et
    next();
  }
};

// Admin yetkisi kontrolü
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  next();
};

// Moderator veya Admin yetkisi
const requireModerator = (req, res, next) => {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Moderator yetkisi gerekli' });
  }
  next();
};

// Discord sunucu üyeliği kontrolü
const requireDiscordMember = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Giriş gerekli' });
  }

  // Son kontrolden 1 saat geçmişse tekrar kontrol et
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (req.user.discordServer.lastChecked < oneHourAgo) {
    const axios = require('axios');
    await req.user.checkDiscordMembership(axios, process.env.DISCORD_BOT_TOKEN);
  }

  if (!req.user.discordServer.isMember) {
    return res.status(403).json({ 
      error: 'Discord sunucusu üyeliği gerekli',
      inviteUrl: process.env.DISCORD_INVITE_URL
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireDiscordMember
};
