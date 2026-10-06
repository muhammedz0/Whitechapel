# GLITCH İLE DEPLOY (ÇOK BASIT)

## Adım 1: Glitch Hesabı
1. https://glitch.com
2. Sign In → GitHub ile giriş

## Adım 2: Yeni Proje
1. "New Project" → "glitch-hello-node"
2. Proje adı: "whitechapel-community"

## Adım 3: Dosyaları Kopyala
1. Sol tarafta "Tools" → "Import/Export" → "Import from GitHub"
2. VEYA: Manuel olarak dosyaları kopyala-yapıştır

## Adım 4: .env Ekle
1. Sol tarafta ".env" dosyasına tıkla
2. Şunu yapıştır:

```
MONGODB_URI=mongodb+srv://mehmetyildizzzz361_db_user:Muhammed33..@cluster0.yf0zybv.mongodb.net/Whitechapel
JWT_SECRET=whitechapel_secret_key_666
DISCORD_CLIENT_ID=1556473546937466910
DISCORD_CLIENT_SECRET=uC-uk7T18WycMHR5vvUbFpm9tyUacT8I
DISCORD_GUILD_ID=1415926415576272949
PORT=3000
CLIENT_URL=https://whitechapel-community.glitch.me
DISCORD_REDIRECT_URI=https://whitechapel-community.glitch.me/api/auth/discord/callback
```

## Adım 5: package.json Kontrol
```json
{
  "scripts": {
    "start": "node server/server.js"
  }
}
```

## Adım 6: Otomatik Deploy!
- Glitch otomatik olarak deploy eder
- URL: `https://whitechapel-community.glitch.me`

## Adım 7: Discord Güncelle
OAuth2 Redirects:
```
https://whitechapel-community.glitch.me/api/auth/discord/callback
```

TAMAM! 🎉

---

## Avantajlar:
✅ Git gerektirmez
✅ Tamamen ücretsiz
✅ Otomatik deploy
✅ SSL dahil
✅ 7/24 çalışır (bazı limitlerle)

## Dezavantajlar:
⚠️ 4000 saat/ay limit
⚠️ 5 dakika kullanılmazsa uyur
