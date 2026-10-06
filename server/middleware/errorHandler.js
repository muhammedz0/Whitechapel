/* ============================================
   Global Error Handler Middleware
   ============================================ */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation hatası
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validasyon hatası',
      details: errors
    });
  }

  // Mongoose duplicate key hatası
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: `Bu ${field} zaten kullanılıyor`
    });
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Geçersiz token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token süresi dolmuş' });
  }

  // Multer (dosya yükleme) hataları
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Dosya çok büyük (max 10MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Çok fazla dosya' });
    }
    return res.status(400).json({ error: 'Dosya yükleme hatası' });
  }

  // Custom error statusu varsa kullan
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Sunucu hatası';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
