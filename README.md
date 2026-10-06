# WHITECHAPEL - Horror Community Platform

Korku, slasher ve gore severler için Discord entegreli topluluk platformu.

## Özellikler

- 🔐 Discord OAuth2 ile giriş
- 👤 Özelleştirilebilir kullanıcı profilleri
- 💬 Profil yorumları (Steam tarzı)
- 👥 Takip sistemi
- 💌 Mesajlaşma sistemi
- 🎮 Topluluk özellikleri
- 📱 Responsive tasarım

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm start
```

## Gerekli Ortam Değişkenleri

`.env` dosyası oluştur:

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=your_redirect_uri
DISCORD_GUILD_ID=your_guild_id
CLIENT_URL=your_client_url
```

## Teknolojiler

- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- Discord OAuth2
- Vanilla JavaScript
