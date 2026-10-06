/* ============================================
   Rate Limiting Middleware
   ============================================ */

const rateLimit = require('express-rate-limit');

// Genel API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // 15 dakikada max 100 istek
  message: { error: 'Çok fazla istek gönderdiniz. Lütfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoint'leri için sıkı limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 15 dakikada max 5 giriş denemesi
  message: { error: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  skipSuccessfulRequests: true,
});

// Mesajlaşma için limiter
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 20, // Dakikada 20 mesaj
  message: { error: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen yavaşlayın.' },
});

// Post oluşturma için limiter
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 10, // Saatte 10 post
  message: { error: 'Saatte maximum 10 gönderi oluşturabilirsiniz.' },
  skipFailedRequests: true,
});

// Yorum için limiter
const commentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 10, // Dakikada 10 yorum
  message: { error: 'Çok hızlı yorum yapıyorsunuz.' },
});

module.exports = apiLimiter;
module.exports.authLimiter = authLimiter;
module.exports.messageLimiter = messageLimiter;
module.exports.postLimiter = postLimiter;
module.exports.commentLimiter = commentLimiter;
