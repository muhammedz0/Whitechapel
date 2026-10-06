/* ============================================
   WHITECHAPEL – app.js
   Korku/Slasher/Gore Topluluk Platformu
   ============================================ */

'use strict';

/* ══════════════════════════════════════════
   API & AUTH CONFIG
══════════════════════════════════════════ */
const API_BASE = window.location.origin + '/api';
let currentUser = null;
let authToken = localStorage.getItem('whitechapel_token');

// Token'ı URL'den al (Discord callback'ten geri dönüş)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('token')) {
  authToken = urlParams.get('token');
  localStorage.setItem('whitechapel_token', authToken);
  window.history.replaceState({}, document.title, '/');
}

/* ══════════════════════════════════════════
   LOADER
══════════════════════════════════════════ */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    document.body.style.overflow = '';
    // Hero animasyonları başlat
    document.querySelectorAll('.hero-content .reveal-up').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 150 + 200);
    });
    startCounters();
    
    // Kullanıcı bilgilerini yükle
    if (authToken) {
      loadCurrentUser();
    }
  }, 2000);
});
document.body.style.overflow = 'hidden';

/* ══════════════════════════════════════════
   AUTH & USER MANAGEMENT
══════════════════════════════════════════ */
async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      updateUIForLoggedInUser();
    } else {
      localStorage.removeItem('whitechapel_token');
      authToken = null;
    }
  } catch (error) {
    console.error('User load error:', error);
  }
}

function updateUIForLoggedInUser() {
  if (!currentUser) return;
  
  // User menu'yu göster, login butonunu gizle
  const userMenu = document.getElementById('userMenu');
  const loginBtn = document.getElementById('loginBtn');
  const navAvatar = document.getElementById('navAvatar');
  const myProfileLink = document.getElementById('myProfileLink');
  
  if (userMenu && loginBtn && navAvatar) {
    // Avatar URL'sini düzelt
    if (currentUser.profile && currentUser.profile.customAvatar) {
      navAvatar.src = currentUser.profile.customAvatar;
    } else if (currentUser.avatar) {
      // Zaten tam URL mi kontrol et
      if (currentUser.avatar.startsWith('http')) {
        navAvatar.src = currentUser.avatar;
      } else {
        navAvatar.src = `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
      }
    } else {
      const defaultNum = parseInt(currentUser.discriminator || '0') % 5;
      navAvatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    }
    
    userMenu.style.display = 'block';
    loginBtn.style.display = 'none';
    
    if (myProfileLink) {
      myProfileLink.href = `profile.html?user=${currentUser.discordId}`;
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        localStorage.removeItem('whitechapel_token');
        window.location.reload();
      };
    }
  }
  
  // Mobile menu için
  const loginBtnMobile = document.getElementById('loginBtnMobile');
  if (loginBtnMobile) {
    loginBtnMobile.textContent = currentUser.profile.displayName || currentUser.username;
    loginBtnMobile.onclick = () => window.location.href = `profile.html?user=${currentUser.discordId}`;
  }
}

// Discord login
async function loginWithDiscord() {
  try {
    const response = await fetch(`${API_BASE}/auth/discord/url`);
    const data = await response.json();
    window.location.href = data.url;
  } catch (error) {
    console.error('Login error:', error);
    showToast('Giriş yapılamadı. Lütfen tekrar deneyin.', 'error');
  }
}

// Login butonlarına event listener ekle
document.getElementById('loginBtn')?.addEventListener('click', () => {
  if (!authToken) loginWithDiscord();
});

document.getElementById('loginBtnMobile')?.addEventListener('click', () => {
  if (!authToken) loginWithDiscord();
});

// Discord butonları
document.getElementById('discordBtn')?.addEventListener('click', () => {
  window.open('https://discord.gg/whitechapel', '_blank');
});

document.getElementById('joinDiscord')?.addEventListener('click', () => {
  window.open('https://discord.gg/whitechapel', '_blank');
});

document.getElementById('joinBtn')?.addEventListener('click', () => {
  window.open('https://discord.gg/whitechapel', '_blank');
});

document.getElementById('finalDiscordBtn')?.addEventListener('click', () => {
  window.open('https://discord.gg/whitechapel', '_blank');
});

/* ══════════════════════════════════════════
   CUSTOM CURSOR (sadece pointer:fine)
══════════════════════════════════════════ */
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorDot  = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
  });

  (function animateCursor() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateCursor);
  })();

  document.querySelectorAll('a, button, .product-card, .service-card, .dot, .filter-btn, .ptab, .ss-card, .stylist-card, .time-slot, .cart-item-qty button')
    .forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('hovered'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovered'));
    });
}

/* ══════════════════════════════════════════
   NAVBAR — scroll efekti
══════════════════════════════════════════ */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

/* ══════════════════════════════════════════
   HAMBURGER MENÜ
══════════════════════════════════════════ */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  document.querySelectorAll('.mm-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ══════════════════════════════════════════
   HERO SLIDER
══════════════════════════════════════════ */
const slides      = document.querySelectorAll('.hero-slide');
const dots        = document.querySelectorAll('.dot');
let   currentSlide = 0;
let   slideTimer;

function goToSlide(n) {
  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (n + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

slideTimer = setInterval(() => goToSlide(currentSlide + 1), 6000);

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    clearInterval(slideTimer);
    goToSlide(parseInt(dot.dataset.slide));
    slideTimer = setInterval(() => goToSlide(currentSlide + 1), 6000);
  });
});

/* ══════════════════════════════════════════
   SAYAÇ ANİMASYONU
══════════════════════════════════════════ */
function startCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target   = parseInt(el.dataset.target);
    const duration = 2200;
    const step     = target / (duration / 16);
    let   cur      = 0;
    const timer    = setInterval(() => {
      cur += step;
      if (cur >= target) { el.textContent = target; clearInterval(timer); }
      else el.textContent = Math.floor(cur);
    }, 16);
  });
}

/* ══════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.14, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.reveal-up').forEach(el => revealObs.observe(el));

// Kategori kartları stagger
const cardObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), parseInt(e.target.dataset.delay || 0));
      cardObs.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.service-card').forEach(el => cardObs.observe(el));

/* ══════════════════════════════════════════
   BİLDİRİM SİSTEMİ (Notifications)
══════════════════════════════════════════ */
let notificationCount = 0;

const cartSidebar  = document.getElementById('cartSidebar');
const cartOverlay  = document.getElementById('cartOverlay');
const cartBtn      = document.getElementById('cartBtn');
const cartClose    = document.getElementById('cartClose');
const cartItems    = document.getElementById('cartItems');
const cartCountEl  = document.getElementById('cartCount');

/* Bildirimleri aç / kapat */
function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  loadNotifications();
}
function closeCart() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

/* Bildirim badge güncelle */
function updateNotificationBadge(count) {
  notificationCount = count;
  cartCountEl.textContent = count;
  cartCountEl.style.display = count > 0 ? 'flex' : 'none';
}

/* Bildirimleri yükle */
async function loadNotifications() {
  if (!authToken) {
    cartItems.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-ghost"></i><p>Giriş yapmalısınız</p></div>`;
    return;
  }
  
  // TODO: API'den bildirimleri çek
  cartItems.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-ghost"></i><p>Henüz bildirim yok</p></div>`;
}

/* ══════════════════════════════════════════
   ÜRÜN FİLTRESİ
══════════════════════════════════════════ */
const filterBtns   = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');

productCards.forEach(c => { c.style.transition = 'opacity .35s ease, transform .35s ease'; });

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;

    productCards.forEach(card => {
      const match = filter === 'all' || card.dataset.cat === filter;
      card.style.opacity    = '0';
      card.style.transform  = 'scale(.95)';
      setTimeout(() => {
        card.style.display = match ? '' : 'none';
        if (match) requestAnimationFrame(() => {
          card.style.opacity   = '1';
          card.style.transform = 'scale(1)';
        });
      }, 260);
    });
  });
});

/* ══════════════════════════════════════════
   FİYAT TABLARI
══════════════════════════════════════════ */
document.querySelectorAll('.ptab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pricing-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
  });
});

/* ══════════════════════════════════════════
   YORUMLAR SLIDER
══════════════════════════════════════════ */
const reviewTrack = document.getElementById('reviewTrack');
const reviewCards = document.querySelectorAll('.review-card');
let   revIndex    = 0;

function getCardsPerView() {
  if (window.innerWidth < 640) return 1;
  if (window.innerWidth < 960) return 2;
  return 3;
}

function updateReviewSlider() {
  const cpv       = getCardsPerView();
  const cardWidth = reviewCards[0].offsetWidth + 24;
  const maxIndex  = Math.max(0, reviewCards.length - cpv);
  revIndex = Math.min(revIndex, maxIndex);
  reviewTrack.style.transform = `translateX(-${revIndex * cardWidth}px)`;
}

document.querySelector('.rev-next').addEventListener('click', () => {
  const max = Math.max(0, reviewCards.length - getCardsPerView());
  revIndex  = revIndex < max ? revIndex + 1 : 0;
  updateReviewSlider();
});
document.querySelector('.rev-prev').addEventListener('click', () => {
  const max = Math.max(0, reviewCards.length - getCardsPerView());
  revIndex  = revIndex > 0 ? revIndex - 1 : max;
  updateReviewSlider();
});

window.addEventListener('resize', updateReviewSlider, { passive: true });
setInterval(() => {
  const max = Math.max(0, reviewCards.length - getCardsPerView());
  revIndex  = revIndex < max ? revIndex + 1 : 0;
  updateReviewSlider();
}, 5000);

/* Touch swipe yorumlar */
let touchStartX = 0;
document.getElementById('reviewsSlider').addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
document.getElementById('reviewsSlider').addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    if (diff > 0) document.querySelector('.rev-next').click();
    else          document.querySelector('.rev-prev').click();
  }
});

/* ══════════════════════════════════════════
   SİPARİŞ FORMU (4 adım)
══════════════════════════════════════════ */
let orderData = { type: '', tech: '', delivery: '' };

/* İleri butonları */
document.querySelectorAll('.step-next').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = parseInt(btn.dataset.next);
    if (!validateStep(next - 1)) return;
    goToStep(next);
  });
});

/* Geri butonları */
document.querySelectorAll('.step-prev').forEach(btn => {
  btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.prev)));
});

function goToStep(n) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-step="${n}"]`).classList.add('active');

  document.querySelectorAll('.fp-step').forEach(s => {
    const sn = parseInt(s.dataset.s);
    s.classList.remove('active', 'done');
    if (sn < n) s.classList.add('done');
    if (sn === n) s.classList.add('active');
  });
  document.querySelectorAll('.fp-line').forEach((line, i) => {
    line.classList.toggle('done', i < n - 1);
  });

  // Forma scroll et (mobil)
  const formEl = document.querySelector('.appt-form-wrap');
  if (formEl && window.innerWidth < 900) {
    setTimeout(() => {
      const top = formEl.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 100);
  }
}

function validateStep(step) {
  if (step === 1) {
    const sel = document.querySelector('input[name="ordertype"]:checked');
    if (!sel) { showToast('Lütfen bir sipariş türü seçin'); return false; }
    orderData.type = sel.value;
  }
  if (step === 2) {
    const sel = document.querySelector('input[name="tech"]:checked');
    if (!sel) { showToast('Lütfen baskı teknolojisi seçin'); return false; }
    orderData.tech = sel.value;
  }
  if (step === 3) {
    const sel = document.querySelector('input[name="delivery"]:checked');
    if (!sel) { showToast('Lütfen teslimat seçeneği seçin'); return false; }
    orderData.delivery = sel.value;
  }
  return true;
}

/* Form submit */
document.getElementById('appointmentForm').addEventListener('submit', e => {
  e.preventDefault();
  const fname = document.getElementById('fname').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!fname) { markError('fname', 'Ad zorunludur'); return; }
  if (!phone) { markError('phone', 'Telefon zorunludur'); return; }

  // Başarı ekranı
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  const success = document.getElementById('formSuccess');
  success.classList.add('visible');
  document.querySelector('.form-progress').style.display = 'none';

  // Sepetteki ürünleri de ekle
  let cartStr = '';
  if (cart.length > 0) {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    cartStr = ` Sepet: ${cart.map(i => `${i.name}×${i.qty}`).join(', ')} (₺${total.toLocaleString('tr-TR')}).`;
  }

  document.getElementById('successDetails').textContent =
    `${fname} bey/hanım, "${orderData.type}" siparişiniz (${orderData.tech}, ${orderData.delivery}) alındı.${cartStr} En kısa sürede iletişime geçeceğiz.`;

  // Sepeti temizle
  cart = [];
  updateCartBadge();

  showToast('Siparişiniz başarıyla alındı! 🎉', 'success');
});

function markError(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('error');
  showToast(msg);
  el.focus();
}

/* Yeni sipariş butonu */
document.getElementById('newAppt')?.addEventListener('click', () => {
  document.getElementById('appointmentForm').reset();
  orderData = { type: '', tech: '', delivery: '' };
  document.getElementById('formSuccess').classList.remove('visible');
  document.querySelector('.form-progress').style.display = '';
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-step="1"]').classList.add('active');
  goToStep(1);
});

/* Input hata temizle */
document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
  input.addEventListener('input', () => input.classList.remove('error'));
});

/* ══════════════════════════════════════════
   PARALLAX
══════════════════════════════════════════ */
if (window.matchMedia('(min-width: 768px)').matches) {
  window.addEventListener('scroll', () => {
    document.querySelectorAll('.parallax-bg').forEach(el => {
      el.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    });
  }, { passive: true });
}

/* ══════════════════════════════════════════
   SMOOTH SCROLL
══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - navbar.offsetHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ══════════════════════════════════════════
   BACK TO TOP
══════════════════════════════════════════ */
document.getElementById('backToTop').addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ══════════════════════════════════════════
   AKTİF NAV LINK
══════════════════════════════════════════ */
const navLinks = document.querySelectorAll('.nav-links a');
const navObs   = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${e.target.id}` ? 'var(--accent)' : '';
      });
    }
  });
}, { threshold: 0.35 });
document.querySelectorAll('section[id]').forEach(s => navObs.observe(s));

/* ══════════════════════════════════════════
   KLAVYE
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCart();
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ══════════════════════════════════════════
   TOAST BİLDİRİM
══════════════════════════════════════════ */
function showToast(msg, type = 'info') {
  let toast = document.getElementById('delenToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'delenToast';
    toast.style.cssText = [
      'position:fixed',
      'bottom:max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
      'left:50%',
      'transform:translateX(-50%) translateY(16px)',
      'background:#1c2530',
      'color:#fff',
      'padding:13px 22px',
      'border-radius:8px',
      'font-size:13px',
      'font-family:"Jost",sans-serif',
      'z-index:5000',
      'opacity:0',
      'transition:opacity .3s,transform .3s',
      'max-width:88vw',
      'text-align:center',
      'pointer-events:none',
      'white-space:nowrap',
      'box-shadow:0 8px 32px rgba(0,0,0,.4)',
    ].join(';');
    document.body.appendChild(toast);
  }

  const colors = { success: '#00d4ff', info: '#c8702a', error: '#ff5555' };
  toast.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
  toast.textContent = msg;
  toast.style.opacity   = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(16px)';
  }, 3000);
}

/* ══════════════════════════════════════════
   SEPET BUTON SHAKE CSS ENJEKSİYONU
══════════════════════════════════════════ */
(function injectShake() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes shake {
      0%,100%{transform:rotate(0deg)}
      20%{transform:rotate(-12deg)}
      40%{transform:rotate(12deg)}
      60%{transform:rotate(-8deg)}
      80%{transform:rotate(8deg)}
    }
    .cart-btn.shake { animation: shake .45s ease; }
  `;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════
   CONSOLE
══════════════════════════════════════════ */
console.log('%c WHITECHAPEL ', 'background:#8b0000;color:#fff;font-size:18px;font-weight:bold;padding:6px 16px;border-radius:4px;');
console.log('%c Horror / Slasher / Gore Topluluğu | Türkiye ', 'color:#8b0000;font-size:12px;');
console.log('%c 💀 Discord: https://discord.gg/whitechapel ', 'color:#888;font-size:11px;');



/* ══════════════════════════════════════════
   DISCORD WIDGET - Canlı İstatistikler
══════════════════════════════════════════ */
async function loadDiscordStats() {
  console.log('Loading Discord stats from backend...');
  
  try {
    const response = await fetch(`${API_BASE}/discord/stats`);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    const data = await response.json();
    console.log('Discord stats:', data);
    
    // İstatistikleri güncelle
    document.getElementById('discordOnline').textContent = data.online || 0;
    document.getElementById('discordMembers').textContent = data.members || 0;
    document.getElementById('discordVoice').textContent = data.voice || 0;
    
    // Hata mesajı varsa göster
    if (data.error) {
      console.warn('Discord widget warning:', data.error);
    }
    
    // Animasyon
    animateNumbers();
    
  } catch (error) {
    console.error('Discord stats fetch error:', error);
    document.getElementById('discordOnline').textContent = '?';
    document.getElementById('discordMembers').textContent = '?';
    document.getElementById('discordVoice').textContent = '?';
  }
}

function animateNumbers() {
  document.querySelectorAll('.stat-value').forEach(el => {
    const target = parseInt(el.textContent);
    if (isNaN(target)) return;
    
    let current = 0;
    const increment = Math.ceil(target / 30);
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = current;
      }
    }, 30);
  });
}

// Discord join button
document.getElementById('discordJoinBtn')?.addEventListener('click', () => {
  window.open('https://discord.gg/qrgSVrWqPV', '_blank');
});

// Sayfa yüklendiğinde istatistikleri al
if (document.getElementById('discordOnline')) {
  loadDiscordStats();
  // Her 60 saniyede bir güncelle
  setInterval(loadDiscordStats, 60000);
}
