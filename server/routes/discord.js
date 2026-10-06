/* ============================================
   Discord Stats Routes
   ============================================ */

const express = require('express');
const router = express.Router();
const axios = require('axios');

/* ============================================
   GET /api/discord/stats
   Discord sunucu istatistikleri
   ============================================ */
router.get('/stats', async (req, res) => {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    
    if (!guildId) {
      return res.status(500).json({ error: 'Discord Guild ID not configured' });
    }
    
    // Discord Widget API (public, token gerektirmiyor)
    const widgetUrl = `https://discord.com/api/guilds/${guildId}/widget.json`;
    
    console.log('Fetching Discord widget from:', widgetUrl);
    
    try {
      const response = await axios.get(widgetUrl);
      const data = response.data;
      
      console.log('Discord widget raw data:', JSON.stringify(data, null, 2));
      
      // İstatistikleri hesapla
      const onlineCount = data.presence_count || 0;
      const memberCount = data.members?.length || onlineCount;
      
      console.log('Presence count:', data.presence_count);
      console.log('Members array length:', data.members?.length);
      console.log('Channels:', data.channels?.length);
      
      // Voice channel'daki üyeler
      let voiceCount = 0;
      if (data.members && data.channels) {
        voiceCount = data.members.filter(m => {
          if (!m.channel_id) return false;
          const channel = data.channels.find(c => c.id === m.channel_id);
          return channel && channel.type === 2; // Voice channel
        }).length;
      }
      
      console.log('Calculated stats - Online:', onlineCount, 'Members:', memberCount, 'Voice:', voiceCount);
      
      return res.json({
        online: onlineCount,
        members: memberCount,
        voice: voiceCount,
        name: data.name,
        instant_invite: data.instant_invite
      });
      
    } catch (widgetError) {
      // Widget kapalıysa veya hata varsa
      console.error('Discord widget error:', widgetError.response?.status);
      
      // Fallback: Davet linki üzerinden bilgi al
      if (process.env.DISCORD_INVITE_URL) {
        const inviteCode = process.env.DISCORD_INVITE_URL.split('/').pop();
        try {
          const inviteResponse = await axios.get(
            `https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`
          );
          
          return res.json({
            online: inviteResponse.data.approximate_presence_count || 0,
            members: inviteResponse.data.approximate_member_count || 0,
            voice: 0, // Bu API'den voice bilgisi alamıyoruz
            name: inviteResponse.data.guild?.name || 'Discord',
            instant_invite: process.env.DISCORD_INVITE_URL
          });
        } catch (inviteError) {
          console.error('Discord invite error:', inviteError.response?.status);
        }
      }
      
      // Her iki API de başarısız olursa
      return res.json({
        online: 0,
        members: 0,
        voice: 0,
        name: 'Whitechapel',
        instant_invite: process.env.DISCORD_INVITE_URL || null,
        error: 'Widget kapalı - Discord ayarlarından aktifleştirin'
      });
    }
    
  } catch (error) {
    console.error('Discord stats error:', error);
    res.status(500).json({ 
      error: 'İstatistikler yüklenemedi',
      online: 0,
      members: 0,
      voice: 0
    });
  }
});

module.exports = router;
