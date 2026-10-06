/* ============================================
   Authentication Routes
   Discord OAuth2 + JWT
   ============================================ */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { authLimiter } = require('../middleware/rateLimiter');

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'whitechapel_secret_key_change_in_production';
const JWT_EXPIRES_IN = '7d';

// Discord OAuth2 configuration
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/api/auth/discord/callback';
const DISCORD_API_ENDPOINT = 'https://discord.com/api/v10';

/* ═══════════════════════════════════════
   Discord Login URL Generate
══════════════════════════════════════════ */
router.get('/discord/url', (req, res) => {
  const scope = ['identify', 'email', 'guilds'].join(' ');
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: scope
  });

  const loginUrl = `https://discord.com/api/oauth2/authorize?${params}`;
  res.json({ url: loginUrl });
});

/* ═══════════════════════════════════════
   Discord OAuth2 Callback
══════════════════════════════════════════ */
router.get('/discord/callback', authLimiter, async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      `${DISCORD_API_ENDPOINT}/oauth2/token`,
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. Get user info
    const userResponse = await axios.get(`${DISCORD_API_ENDPOINT}/users/@me`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const discordUser = userResponse.data;

    // 3. Get user's guilds (Discord sunucu kontrolü için)
    let isMember = false;
    try {
      const guildsResponse = await axios.get(`${DISCORD_API_ENDPOINT}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
      if (DISCORD_GUILD_ID) {
        isMember = guildsResponse.data.some(guild => guild.id === DISCORD_GUILD_ID);
      }
    } catch (error) {
      console.error('Guild check error:', error.message);
    }

    // 4. Kullanıcıyı bul veya oluştur
    const { User } = global.db;
    let user = await User.findOne({ where: { discordId: discordUser.id } });

    if (user) {
      // Mevcut kullanıcı - bilgileri güncelle
      user.username = discordUser.username;
      user.discriminator = discordUser.discriminator || '0';
      user.email = discordUser.email;
      user.avatar = discordUser.avatar;
      
      const discordServer = user.discordServer || {};
      discordServer.isMember = isMember;
      discordServer.lastChecked = new Date();
      if (isMember && !discordServer.joinedAt) {
        discordServer.joinedAt = new Date();
      }
      user.discordServer = discordServer;
      user.lastActive = new Date();
    } else {
      // Yeni kullanıcı oluştur
      user = await User.create({
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        email: discordUser.email,
        avatar: discordUser.avatar,
        profile: {
          displayName: discordUser.username,
          theme: 'blood',
          bio: '',
          banner: null,
          customAvatar: null,
          backgroundColor: '#0a0a0a',
          accentColor: '#8b0000',
          textColor: '#ffffff',
          profileVisibility: 'public',
          socialLinks: {
            twitter: '',
            instagram: '',
            youtube: '',
            twitch: '',
            steam: '',
            custom: ''
          },
          displayBadges: [],
          views: 0,
          recentViewers: [],
          favoriteSlasher: '',
          statusMessage: ''
        },
        discordServer: {
          isMember: isMember,
          joinedAt: isMember ? new Date() : null,
          lastChecked: new Date(),
          roles: []
        }
      });
    }

    await user.save();

    // 5. JWT token oluştur
    const token = jwt.sign(
      { 
        userId: user.id,
        discordId: user.discordId,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 6. Frontend'e redirect (token ile)
    res.redirect(`/?token=${token}&success=true`);

  } catch (error) {
    console.error('Discord auth error:', error.response?.data || error.message);
    res.redirect('/?error=auth_failed');
  }
});

/* ═══════════════════════════════════════
   Get Current User
══════════════════════════════════════════ */
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { User } = global.db;
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['createdAt', 'updatedAt'] }
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı' });
  }
});

/* ═══════════════════════════════════════
   Refresh Token
══════════════════════════════════════════ */
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const newToken = jwt.sign(
      { 
        userId: req.user.id,
        discordId: req.user.discordId,
        role: req.user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(500).json({ error: 'Token yenilenemedi' });
  }
});

/* ═══════════════════════════════════════
   Logout (Client-side token silme işlemi)
══════════════════════════════════════════ */
router.post('/logout', authenticateToken, async (req, res) => {
  // Token'ı client-side silecek, server-side bir blacklist tutmuyoruz
  res.json({ message: 'Çıkış başarılı' });
});

module.exports = router;
