# WHITECHAPEL - Deploy Rehberi

## RENDER.COM İLE DEPLOY (ÜCRETSİZ)

### Adım 1: GitHub Hesabı Oluştur
1. https://github.com adresine git
2. Sign up → Hesap oluştur
3. Email doğrula

### Adım 2: Repository Oluştur
1. GitHub'da "New repository" butonuna tıkla
2. Repository adı: `whitechapel`
3. Public seç
4. "Create repository" tıkla

### Adım 3: Dosyaları Yükle
1. Repository sayfasında "uploading an existing file" linkine tıkla
2. Proje klasöründeki TÜM DOSYALARI sürükle-bırak
   - **SADECE .env dosyasını yükleme!**
3. "Commit changes" tıkla

### Adım 4: Render Hesabı Oluştur
1. https://render.com adresine git
2. "Get Started for Free" → GitHub ile giriş yap
3. GitHub hesabını bağla

### Adım 5: Web Service Oluştur
1. Dashboard'da "New +" → "Web Service"
2. GitHub repository'ni seç: `whitechapel`
3. Ayarlar:
   - **Name**: `whitechapel` (veya istediğin)
   - **Region**: Frankfurt (veya yakın)
   - **Branch**: `main`
   - **Root Directory**: boş bırak
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

### Adım 6: Environment Variables Ekle
"Environment Variables" bölümünde şunları ekle:

```
PORT = 10000
MONGODB_URI = mongodb+srv://mehmetyildizzzz361_db_user:Muhammed33..@cluster0.yf0zybv.mongodb.net/Whitechapel
JWT_SECRET = whitechapel_super_secret_key_2024_horror_community_666
DISCORD_CLIENT_ID = 1556473546937466910
DISCORD_CLIENT_SECRET = uC-uk7T18WycMHR5vvUbFpm9tyUacT8I
DISCORD_GUILD_ID = 1415926415576272949
```

**ÖNEMLİ:** 
- `DISCORD_REDIRECT_URI` ve `CLIENT_URL` değişkenlerini Render URL'ini aldıktan sonra ekleyeceğiz!

### Adım 7: Deploy Et
1. "Create Web Service" butonuna tıkla
2. Deploy başlayacak (5-10 dakika sürer)
3. Deploy bitince URL verilecek: `https://whitechapel-xxxx.onrender.com`

### Adım 8: Discord Developer Portal'ı Güncelle
1. https://discord.com/developers/applications adresine git
2. Uygulamanı seç
3. OAuth2 → Redirects bölümüne ekle:
   ```
   https://whitechapel-xxxx.onrender.com/api/auth/discord/callback
   ```
4. "Save Changes"

### Adım 9: Environment Variables'ı Tamamla
Render dashboard'da:
1. Web Service'e tıkla
2. "Environment" sekmesi
3. Şunları ekle:
   ```
   DISCORD_REDIRECT_URI = https://whitechapel-xxxx.onrender.com/api/auth/discord/callback
   CLIENT_URL = https://whitechapel-xxxx.onrender.com
   ```
4. "Save Changes"
5. Otomatik olarak yeniden deploy olacak

### Adım 10: Test Et!
`https://whitechapel-xxxx.onrender.com` adresine git - SİTEN ÇALIŞIYOR! 🎉

---

## NOTLAR:

### Free Plan Sınırlamaları:
- ✅ Ücretsiz
- ✅ SSL (HTTPS) otomatik
- ⚠️ 15 dakika kullanılmazsa uyur (ilk istek 30 saniye sürer)
- ⚠️ Ayda 750 saat limit (yeterli)

### Upload Dosyaları:
- Free plan'da upload edilen dosyalar her deploy'da silinir
- Çözüm: Cloudinary, AWS S3 veya MongoDB GridFS kullan (istersenyapabilirim)

### Custom Domain:
- Render'da Settings → Custom Domain → Kendi domain'ini ekle
- Örnek: `whitechapel.com`

---

## ALTERNATİF SEÇENEKLER:

### 1. Railway.app (Ücretsiz)
- https://railway.app
- GitHub ile deploy
- $5 ücretsiz kredi
- Daha hızlı

### 2. Vercel (Frontend için)
- https://vercel.com  
- Ücretsiz
- SADECE frontend için (backend ayrı host etmen gerek)

### 3. Heroku (Artık ücretli)
- https://heroku.com
- $7/ay
- Daha stabil

---

## YARDIM:

Deploy sırasında hata alırsan:
1. Render logs'u kontrol et
2. MongoDB bağlantısını test et
3. Discord credentials'ı doğrula

Bana söyle, yardım ederim! 🔪
