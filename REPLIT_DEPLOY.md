# REPLIT İLE DEPLOY (ÇOK KOLAY)

## Adım 1: Replit Hesabı
1. https://replit.com → Sign Up
2. Google ile giriş yap (hızlı)

## Adım 2: Yeni Repl Oluştur
1. "+ Create Repl" butonuna tıkla
2. Template: **Node.js**
3. Title: **Whitechapel**
4. "Create Repl"

## Adım 3: Dosyaları Yükle
1. Sol taraftaki Files bölümüne TÜM dosyalarını sürükle-bırak
2. .env dosyası da dahil HEPSINI yükle
3. Bekle, yüklensin

## Adım 4: Secrets Ekle
1. Sol menüde "Secrets" (🔒) ikonuna tıkla
2. Şunları ekle:

```
MONGODB_URI = mongodb+srv://mehmetyildizzzz361_db_user:Muhammed33..@cluster0.yf0zybv.mongodb.net/Whitechapel
JWT_SECRET = whitechapel_secret_key_666
DISCORD_CLIENT_ID = 1556473546937466910
DISCORD_CLIENT_SECRET = uC-uk7T18WycMHR5vvUbFpm9tyUacT8I
DISCORD_GUILD_ID = 1415926415576272949
PORT = 3000
```

## Adım 5: Run!
1. Yeşil "Run" butonuna bas
2. Sağ tarafta site açılacak
3. URL: `https://whitechapel.username.repl.co`

## Adım 6: Discord Güncelle
1. Discord Developer Portal
2. OAuth2 → Redirects:
   ```
   https://whitechapel.username.repl.co/api/auth/discord/callback
   ```

## Adım 7: .env Güncelle
Replit'te .env dosyasını aç, ekle:
```
CLIENT_URL = https://whitechapel.username.repl.co
DISCORD_REDIRECT_URI = https://whitechapel.username.repl.co/api/auth/discord/callback
```

Run butonuna tekrar bas - TAMAM! 🎉

---

## Avantajlar:
✅ Git gerektirmez
✅ Ücretsiz
✅ SSL otomatik
✅ 24/7 çalışır (Always On özelliği ile)

## Dezavantajlar:
⚠️ Free plan'da yavaş olabilir
⚠️ Upload dosyaları sınırlı

---

## Always On (7/24 Açık):
- Settings → Always On → Enable ($7/ay)
- VEYA: UptimeRobot ile pinglersen ücretsiz 7/24 çalışır!
