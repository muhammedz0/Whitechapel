/* ============================================
   Games Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const { Game, GameSession } = require('../models/Game');
const { authenticateToken, requireDiscordMember, optionalAuth } = require('../middleware/auth');

/* Get All Games */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const games = await Game.getActive();
    res.json({ games });
  } catch (error) {
    res.status(500).json({ error: 'Oyunlar yüklenemedi' });
  }
});

/* Get Popular Games */
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const games = await Game.getPopular(limit);
    res.json({ games });
  } catch (error) {
    res.status(500).json({ error: 'Popüler oyunlar yüklenemedi' });
  }
});

/* Get Single Game */
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const game = await Game.findOne({ slug: req.params.slug });
    
    if (!game) {
      return res.status(404).json({ error: 'Oyun bulunamadı' });
    }

    res.json({ game });
  } catch (error) {
    res.status(500).json({ error: 'Oyun yüklenemedi' });
  }
});

/* Create Game Session */
router.post('/:gameId/session', authenticateToken, requireDiscordMember, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Oyun bulunamadı' });
    }

    if (!game.isActive || game.isComingSoon) {
      return res.status(400).json({ error: 'Oyun şu anda aktif değil' });
    }

    const session = new GameSession({
      game: game._id,
      host: req.user._id,
      participants: [{
        user: req.user._id,
        status: 'ready'
      }]
    });

    await session.save();
    await session.populate('host', 'username profile.displayName avatar discordId');
    await session.populate('participants.user', 'username profile.displayName avatar discordId');

    res.status(201).json({ session, message: 'Oyun oturumu oluşturuldu' });
  } catch (error) {
    res.status(500).json({ error: 'Oturum oluşturulamadı' });
  }
});

/* Join Game Session */
router.post('/session/:sessionId/join', authenticateToken, requireDiscordMember, async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.sessionId)
      .populate('game');

    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    if (session.status !== 'waiting') {
      return res.status(400).json({ error: 'Oyun zaten başladı' });
    }

    await session.addParticipant(req.user._id);
    await session.populate('participants.user', 'username profile.displayName avatar discordId');

    res.json({ session, message: 'Oyuna katıldınız' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Katılma başarısız' });
  }
});

/* Start Game Session */
router.post('/session/:sessionId/start', authenticateToken, async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.sessionId)
      .populate('game');

    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    // Sadece host başlatabilir
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Sadece host oyunu başlatabilir' });
    }

    await session.startGame();
    await session.populate('participants.user', 'username profile.displayName avatar discordId');

    res.json({ session, message: 'Oyun başladı' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Oyun başlatılamadı' });
  }
});

/* Finish Game Session */
router.post('/session/:sessionId/finish', authenticateToken, async (req, res) => {
  try {
    const { winnerId } = req.body;
    
    const session = await GameSession.findById(req.params.sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    // Sadece host bitirebilir
    if (session.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Sadece host oyunu bitirebilir' });
    }

    await session.finishGame(winnerId);

    res.json({ session, message: 'Oyun tamamlandı' });
  } catch (error) {
    res.status(500).json({ error: 'Oyun bitirilemedi' });
  }
});

/* Get Active Sessions */
router.get('/sessions/active', optionalAuth, async (req, res) => {
  try {
    const sessions = await GameSession.find({ status: 'waiting' })
      .populate('game', 'name slug thumbnail minPlayers maxPlayers')
      .populate('host', 'username profile.displayName avatar discordId')
      .populate('participants.user', 'username profile.displayName avatar discordId')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Oturumlar yüklenemedi' });
  }
});

/* Get User's Game History */
router.get('/history/my', authenticateToken, async (req, res) => {
  try {
    const sessions = await GameSession.find({
      'participants.user': req.user._id,
      status: 'finished'
    })
    .populate('game', 'name slug thumbnail')
    .populate('winner', 'username profile.displayName avatar')
    .sort({ finishedAt: -1 })
    .limit(50);

    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Geçmiş yüklenemedi' });
  }
});

module.exports = router;
