/* ============================================
   WHITECHAPEL - Main Server
   Korku/Slasher/Gore Topluluk Platformu
   ============================================ */

require('dotenv').config();
const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
// const postRoutes = require('./routes/posts'); // MongoDB kullanıyor - geçici devre dışı
// const announcementRoutes = require('./routes/announcements'); // MongoDB kullanıyor - geçici devre dışı
const messageRoutes = require('./routes/messages');
// const achievementRoutes = require('./routes/achievements'); // MongoDB kullanıyor - geçici devre dışı
// const gameRoutes = require('./routes/games'); // MongoDB kullanıyor - geçici devre dışı
const discordRoutes = require('./routes/discord');
const commentRoutes = require('./routes/comments');
const followRoutes = require('./routes/follow');

// Middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Port configuration
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════

// Trust proxy (Render, Heroku gibi platformlar için gerekli)
app.set('trust proxy', 1);

// Security & optimization
app.use(helmet({
  contentSecurityPolicy: false, // Frontend'te custom CSP kullanacağız
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting (geçici olarak kapalı - proxy sorunu için)
// app.use('/api/', rateLimiter);

// ═══════════════════════════════════════
// DATABASE CONNECTION - SQLite
// ═══════════════════════════════════════

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: false
  }
});

// Model'leri yükle
const User = require('./models/User')(sequelize);
const Comment = require('./models/Comment')(sequelize);
const Follow = require('./models/Follow')(sequelize);
const Message = require('./models/Message')(sequelize);

// İlişkileri tanımla
User.hasMany(Comment, { foreignKey: 'authorId', as: 'comments' });
User.hasMany(Comment, { foreignKey: 'targetUserId', as: 'receivedComments' });
Comment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Comment.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });

User.hasMany(Follow, { foreignKey: 'followerId', as: 'following' });
User.hasMany(Follow, { foreignKey: 'followingId', as: 'followers' });
Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
Follow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

// Model'leri global'e export et (route'larda kullanabilmek için)
global.db = {
  sequelize,
  User,
  Comment,
  Follow,
  Message
};

// Veritabanını senkronize et
sequelize.sync({ alter: process.env.NODE_ENV === 'development' })
  .then(() => {
    console.log('✓ SQLite veritabanı bağlantısı başarılı');
    console.log(`📁 Database: ${path.join(__dirname, '..', 'database.db')}`);
  })
  .catch((err) => {
    console.error('✗ SQLite bağlantı hatası:', err);
    process.exit(1);
  });

// ═══════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/profile', profileRoutes);
// app.use('/api/posts', postRoutes); // Geçici devre dışı
// app.use('/api/announcements', announcementRoutes); // Geçici devre dışı
app.use('/api/messages', messageRoutes);
// app.use('/api/achievements', achievementRoutes); // Geçici devre dışı
// app.use('/api/games', gameRoutes); // Geçici devre dışı
app.use('/api/discord', discordRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follow', followRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ═══════════════════════════════════════
// SOCKET.IO (Real-time messaging)
// ═══════════════════════════════════════

const socketHandler = require('./sockets/messageSocket');
socketHandler(io);

// ═══════════════════════════════════════
// FRONTEND ROUTING (SPA)
// ═══════════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ═══════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════

app.use(errorHandler);

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║      WHITECHAPEL COMMUNITY SERVER     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💀 Korku/Slasher/Gore Topluluğu Aktif`);
  console.log('════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal alındı. Sunucu kapatılıyor...');
  server.close(() => {
    sequelize.close();
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

module.exports = { app, io };
