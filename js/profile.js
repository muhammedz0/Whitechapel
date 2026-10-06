/* ============================================
   WHITECHAPEL – profile.js
   Profil Sayfaları JavaScript
   ============================================ */

'use strict';

/* ══════════════════════════════════════════
   GLOBAL VARIABLES
══════════════════════════════════════════ */
const API_BASE = window.location.origin + '/api';
let authToken = localStorage.getItem('whitechapel_token');
let currentUser = null;
let viewingUser = null;

// Window scope'a export et
window.API_BASE = API_BASE;
window.authToken = authToken;
window.currentUser = currentUser;

/* ══════════════════════════════════════════
   PROFILE PAGE (profile.html)
══════════════════════════════════════════ */
if (document.querySelector('.profile-page')) {
  initProfilePage();
}

async function initProfilePage() {
  // URL'den kullanıcı identifier'ını al
  const urlParams = new URLSearchParams(window.location.search);
  const identifier = urlParams.get('user');
  
  if (!identifier) {
    // Identifier yoksa, kendi profilini göster
    if (!authToken) {
      window.location.href = '/index.html';
      return;
    }
    await loadCurrentUserProfile();
  } else {
    // Başka bir kullanıcının profilini göster
    await loadUserProfile(identifier);
  }
  
  // Event listeners
  setupProfileEventListeners();
}

async function loadCurrentUserProfile() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) throw new Error('Auth failed');
    
    const data = await response.json();
    currentUser = data.user;
    viewingUser = data.user;
    
    // Profili tekrar yükle (view counter için)
    await loadUserProfile(currentUser.discordId);
  } catch (error) {
    console.error('Error loading current user:', error);
    window.location.href = '/index.html';
  }
}

async function loadUserProfile(identifier) {
  try {
    showLoader();
    
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_BASE}/profile/${identifier}`, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        showToast('Kullanıcı bulunamadı', 'error');
      } else if (response.status === 403) {
        showToast('Bu profil gizli', 'error');
      }
      setTimeout(() => window.location.href = '/index.html', 2000);
      return;
    }
    
    const data = await response.json();
    viewingUser = data.user;
    
    // Profili render et
    renderProfile(viewingUser);
    
    hideLoader();
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Profil yüklenirken hata oluştu', 'error');
    hideLoader();
  }
}

function renderProfile(user) {
  console.log('Rendering profile for user:', user.username);
  
  // Banner
  const banner = document.getElementById('profileBanner');
  if (user.profile.banner) {
    banner.style.backgroundImage = `url('${user.profile.banner}')`;
  }
  
  // Avatar
  const avatar = document.getElementById('profileAvatar');
  console.log('Avatar element:', avatar);
  console.log('User avatar data:', user.avatar, 'Custom:', user.profile.customAvatar);
  
  if (user.profile.customAvatar) {
    avatar.src = user.profile.customAvatar;
    console.log('Using custom avatar');
  } else if (user.avatar) {
    // user.avatar zaten tam URL (backend'den discordAvatarUrl virtual field)
    // Eğer tam URL değilse oluştur
    if (user.avatar.startsWith('http')) {
      avatar.src = user.avatar;
    } else {
      avatar.src = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    }
    console.log('Using Discord avatar:', avatar.src);
  } else {
    const defaultNum = parseInt(user.discriminator || '0') % 5;
    avatar.src = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    console.log('Using default avatar');
  }
  
  // Username
  document.getElementById('profileUsername').textContent = user.profile.displayName || user.username;
  
  // Role badge
  const roleBadge = document.getElementById('profileRoleBadge');
  if (user.role !== 'user') {
    roleBadge.textContent = user.role;
    roleBadge.className = `profile-role-badge ${user.role}`;
  } else {
    roleBadge.style.display = 'none';
  }
  
  // Status message
  const statusEl = document.getElementById('profileStatus');
  if (user.profile.statusMessage) {
    statusEl.textContent = user.profile.statusMessage;
  } else {
    statusEl.style.display = 'none';
  }
  
  // Joined date
  const joinedDate = new Date(user.createdAt);
  document.getElementById('joinedDate').textContent = joinedDate.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Profile views
  document.getElementById('profileViews').textContent = user.profile.views;
  
  // Favorite slasher
  if (user.profile.favoriteSlasher) {
    const slasherNames = {
      'michael-myers': 'Michael Myers',
      'jason-voorhees': 'Jason Voorhees',
      'ghostface': 'Ghostface',
      'freddy-krueger': 'Freddy Krueger',
      'leatherface': 'Leatherface',
      'pennywise': 'Pennywise',
      'chucky': 'Chucky',
      'pinhead': 'Pinhead',
      'art-the-clown': 'Art the Clown'
    };
    document.getElementById('favoriteSlasher').textContent = slasherNames[user.profile.favoriteSlasher];
    document.getElementById('favoriteSlasherMeta').style.display = 'inline-flex';
  }
  
  // Bio
  const bioEl = document.getElementById('profileBio');
  if (user.profile.bio) {
    bioEl.textContent = user.profile.bio;
  } else {
    bioEl.textContent = 'Henüz bir bio eklenmemiş.';
  }
  
  // Stats
  document.getElementById('statPosts').textContent = user.stats.totalPosts;
  document.getElementById('statFollowers').textContent = user.stats.followersCount;
  document.getElementById('statFollowing').textContent = user.stats.followingCount;
  document.getElementById('statLikes').textContent = user.stats.totalLikes;
  document.getElementById('statGames').textContent = user.stats.gamesPlayed;
  document.getElementById('statWins').textContent = user.stats.gamesWon;
  
  // Social links
  renderSocialLinks(user.profile.socialLinks);
  
  // Recent viewers
  if (user.profile.recentViewers && user.profile.recentViewers.length > 0) {
    renderRecentViewers(user.profile.recentViewers);
  }
  
  // Badges
  if (user.profile.displayBadges && user.profile.displayBadges.length > 0) {
    renderBadges(user.profile.displayBadges);
  }
  
  // Achievements
  if (user.achievements && user.achievements.length > 0) {
    renderAchievements(user.achievements);
  }
  
  // Action buttons
  setupActionButtons(user);
  
  // Apply custom theme
  applyUserTheme(user.profile);
}

function renderSocialLinks(socialLinks) {
  const container = document.getElementById('socialLinks');
  const card = document.getElementById('socialLinksCard');
  
  console.log('Rendering social links:', socialLinks);
  
  const links = [];
  
  if (socialLinks.twitter) {
    links.push({ icon: 'fa-brands fa-twitter', name: 'Twitter', url: socialLinks.twitter });
  }
  if (socialLinks.instagram) {
    links.push({ icon: 'fa-brands fa-instagram', name: 'Instagram', url: socialLinks.instagram });
  }
  if (socialLinks.youtube) {
    links.push({ icon: 'fa-brands fa-youtube', name: 'YouTube', url: socialLinks.youtube });
  }
  if (socialLinks.twitch) {
    links.push({ icon: 'fa-brands fa-twitch', name: 'Twitch', url: socialLinks.twitch });
  }
  if (socialLinks.steam) {
    links.push({ icon: 'fa-brands fa-steam', name: 'Steam', url: socialLinks.steam });
  }
  if (socialLinks.custom) {
    links.push({ icon: 'fa-solid fa-globe', name: 'Website', url: socialLinks.custom });
  }
  
  console.log('Links to render:', links);
  
  if (links.length > 0) {
    container.innerHTML = links.map(link => `
      <a href="${link.url}" class="social-link-item" target="_blank" rel="noopener" title="${link.name}">
        <i class="${link.icon}"></i>
      </a>
    `).join('');
    card.style.display = 'block';
  }
}

function renderRecentViewers(viewers) {
  const container = document.getElementById('recentViewers');
  const card = document.getElementById('recentViewersCard');
  
  const viewersHTML = viewers
    .filter(v => v.userId)
    .map(viewer => {
      const timeAgo = getTimeAgo(new Date(viewer.viewedAt));
      return `
        <a href="profile.html?user=${viewer.userId.discordId}" class="viewer-item">
          <img src="${viewer.userId.avatar || '/assets/default-avatar.png'}" alt="${viewer.userId.username}" class="viewer-avatar" />
          <div class="viewer-info">
            <div class="viewer-name">${viewer.userId.username}</div>
            <div class="viewer-time">${timeAgo}</div>
          </div>
        </a>
      `;
    })
    .join('');
  
  if (viewersHTML) {
    container.innerHTML = viewersHTML;
    card.style.display = 'block';
  }
}

function renderBadges(badges) {
  const container = document.getElementById('badgesGrid');
  const card = document.getElementById('badgesCard');
  
  // Bu örnekte badge'ler emoji olarak
  const badgesHTML = badges.map(badge => `
    <div class="badge-item">
      <div class="badge-icon">${badge}</div>
      <div class="badge-name">Badge</div>
    </div>
  `).join('');
  
  container.innerHTML = badgesHTML;
  card.style.display = 'block';
}

function renderAchievements(achievements) {
  const container = document.getElementById('achievementsGrid');
  const countEl = document.getElementById('achievementCount');
  
  countEl.textContent = `(${achievements.length})`;
  
  const achievementsHTML = achievements
    .filter(a => a.achievementId)
    .map(achievement => {
      const ach = achievement.achievementId;
      return `
        <div class="achievement-item">
          <div class="achievement-icon">${ach.icon || '🏆'}</div>
          <div class="achievement-info">
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.description}</div>
            <span class="achievement-rarity ${ach.rarity}">${ach.rarity}</span>
          </div>
        </div>
      `;
    })
    .join('');
  
  if (achievementsHTML) {
    container.innerHTML = achievementsHTML;
  }
}

function setupActionButtons(user) {
  const editBtn = document.getElementById('editProfileBtn');
  const followBtn = document.getElementById('followBtn');
  const messageBtn = document.getElementById('messageBtn');
  
  // Kendi profili mi?
  if (currentUser && currentUser.id === user.id) {
    editBtn.style.display = 'flex';
    editBtn.onclick = () => window.location.href = 'profile-edit.html';
  } else if (currentUser) {
    // Başka birinin profili
    followBtn.style.display = 'flex';
    messageBtn.style.display = 'flex';
    
    followBtn.onclick = () => toggleFollow(user.id);
    messageBtn.onclick = () => openChat(user.id);
    
    // Takip durumunu kontrol et
    checkFollowStatus(user.id);
  }
}

async function checkFollowStatus(userId) {
  try {
    const response = await fetch(`${API_BASE}/follow/status/${userId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const { following } = await response.json();
    
    const followBtn = document.getElementById('followBtn');
    if (following) {
      followBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Takip Ediliyor';
      followBtn.style.background = 'var(--dark-3)';
    } else {
      followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Takip Et';
      followBtn.style.background = 'var(--accent)';
    }
  } catch (error) {
    console.error('Check follow status error:', error);
  }
}

function applyUserTheme(profile) {
  // Tema renklerini CSS variables olarak uygula
  const root = document.documentElement;
  
  if (profile.backgroundColor) {
    root.style.setProperty('--profile-bg', profile.backgroundColor);
  }
  if (profile.accentColor) {
    root.style.setProperty('--profile-accent', profile.accentColor);
  }
  if (profile.textColor) {
    root.style.setProperty('--profile-text', profile.textColor);
  }
}

function setupProfileEventListeners() {
  // My Profile link
  const myProfileLink = document.getElementById('myProfileLink');
  if (myProfileLink && currentUser) {
    myProfileLink.href = `profile.html?user=${currentUser.discordId}`;
  }
  
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('whitechapel_token');
      window.location.href = '/index.html';
    };
  }
}

/* ══════════════════════════════════════════
   PROFILE EDIT PAGE (profile-edit.html)
══════════════════════════════════════════ */
if (document.querySelector('.profile-edit-page')) {
  console.log('=== PROFILE EDIT PAGE DETECTED ===');
  console.log('authToken:', authToken);
  initProfileEditPage();
}

async function initProfileEditPage() {
  console.log('Profile edit page initialized');
  
  if (!authToken) {
    console.log('No auth token, redirecting...');
    window.location.href = '/index.html';
    return;
  }
  
  console.log('Loading user for edit...');
  await loadCurrentUserForEdit();
  console.log('Setting up edit listeners...');
  setupEditEventListeners();
  console.log('Profile edit page ready!');
}

async function loadCurrentUserForEdit() {
  try {
    console.log('Fetching current user...');
    showLoader();
    
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) throw new Error('Auth failed');
    
    const data = await response.json();
    currentUser = data.user;
    console.log('User loaded:', currentUser);
    
    // Form'u doldur
    populateEditForm(currentUser);
    
    // Showcase'i yükle
    await loadShowcaseForEdit();
    
    // Preview'ı güncelle
    updatePreview();
    
    hideLoader();
  } catch (error) {
    console.error('Error loading user:', error);
    window.location.href = '/index.html';
  }
}

function populateEditForm(user) {
  console.log('Populating form with user data:', user);
  
  // Banner
  if (user.profile.banner) {
    const bannerImg = document.getElementById('bannerImg');
    console.log('Banner img element:', bannerImg);
    if (bannerImg) {
      bannerImg.src = user.profile.banner;
      bannerImg.style.display = 'block';
    }
    const bannerPlaceholder = document.getElementById('bannerPlaceholder');
    if (bannerPlaceholder) bannerPlaceholder.style.display = 'none';
    const removeBannerBtn = document.getElementById('removeBannerBtn');
    if (removeBannerBtn) removeBannerBtn.style.display = 'inline-flex';
  }
  
  // Avatar
  const avatarImg = document.getElementById('avatarImg');
  console.log('Avatar img element:', avatarImg);
  if (avatarImg) {
    // Custom avatar varsa onu kullan, yoksa Discord avatar'ı oluştur
    if (user.profile.customAvatar) {
      avatarImg.src = user.profile.customAvatar;
    } else if (user.avatar) {
      // user.avatar zaten tam URL olabilir (backend'den)
      if (user.avatar.startsWith('http')) {
        avatarImg.src = user.avatar;
      } else {
        avatarImg.src = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
      }
    } else {
      // Default Discord avatar
      const defaultNum = parseInt(user.discriminator || '0') % 5;
      avatarImg.src = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    }
  }
  if (user.profile.customAvatar) {
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    if (removeAvatarBtn) removeAvatarBtn.style.display = 'inline-flex';
  }
  
  // Basic info
  const displayName = document.getElementById('displayName');
  if (displayName) displayName.value = user.profile.displayName || '';
  
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) statusMessage.value = user.profile.statusMessage || '';
  
  const bio = document.getElementById('bio');
  if (bio) bio.value = user.profile.bio || '';
  
  const favoriteSlasher = document.getElementById('favoriteSlasher');
  if (favoriteSlasher) favoriteSlasher.value = user.profile.favoriteSlasher || '';
  
  const profileVisibility = document.getElementById('profileVisibility');
  if (profileVisibility) profileVisibility.value = user.profile.profileVisibility || 'public';
  
  // Theme
  const theme = document.getElementById('theme');
  if (theme) theme.value = user.profile.theme || 'blood';
  
  const backgroundColor = document.getElementById('backgroundColor');
  if (backgroundColor) backgroundColor.value = user.profile.backgroundColor || '#0a0a0a';
  
  const backgroundColorText = document.getElementById('backgroundColorText');
  if (backgroundColorText) backgroundColorText.value = user.profile.backgroundColor || '#0a0a0a';
  
  const accentColor = document.getElementById('accentColor');
  if (accentColor) accentColor.value = user.profile.accentColor || '#8b0000';
  
  const accentColorText = document.getElementById('accentColorText');
  if (accentColorText) accentColorText.value = user.profile.accentColor || '#8b0000';
  
  const textColor = document.getElementById('textColor');
  if (textColor) textColor.value = user.profile.textColor || '#ffffff';
  
  const textColorText = document.getElementById('textColorText');
  if (textColorText) textColorText.value = user.profile.textColor || '#ffffff';
  
  // Social links
  const socialTwitter = document.getElementById('socialTwitter');
  if (socialTwitter) socialTwitter.value = user.profile.socialLinks?.twitter || '';
  
  const socialInstagram = document.getElementById('socialInstagram');
  if (socialInstagram) socialInstagram.value = user.profile.socialLinks?.instagram || '';
  
  const socialYoutube = document.getElementById('socialYoutube');
  if (socialYoutube) socialYoutube.value = user.profile.socialLinks?.youtube || '';
  
  const socialTwitch = document.getElementById('socialTwitch');
  if (socialTwitch) socialTwitch.value = user.profile.socialLinks?.twitch || '';
  
  const socialSteam = document.getElementById('socialSteam');
  if (socialSteam) socialSteam.value = user.profile.socialLinks?.steam || '';
  
  const socialCustom = document.getElementById('socialCustom');
  if (socialCustom) socialCustom.value = user.profile.socialLinks?.custom || '';
  
  // Update character counts
  updateCharCount('displayName', 'displayNameCount');
  updateCharCount('statusMessage', 'statusCount');
  updateCharCount('bio', 'bioCount');
  
  console.log('Form populated successfully');
}

function setupEditEventListeners() {
  console.log('Setting up edit event listeners...');
  
  const form = document.getElementById('profileEditForm');
  console.log('Form element:', form);
  
  if (!form) {
    console.error('Profile edit form not found!');
    return;
  }
  
  // Form submit
  form.onsubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted');
    await saveProfile();
  };
  
  // Character counters
  document.getElementById('displayName').oninput = () => {
    updateCharCount('displayName', 'displayNameCount');
    updatePreview();
  };
  document.getElementById('statusMessage').oninput = () => {
    updateCharCount('statusMessage', 'statusCount');
    updatePreview();
  };
  document.getElementById('bio').oninput = () => {
    updateCharCount('bio', 'bioCount');
    updatePreview();
  };
  
  // Theme preset change
  document.getElementById('theme').onchange = (e) => {
    applyThemePreset(e.target.value);
    updatePreview();
  };
  
  // Color inputs sync
  syncColorInputs('backgroundColor', 'backgroundColorText');
  syncColorInputs('accentColor', 'accentColorText');
  syncColorInputs('textColor', 'textColorText');
  
  // Banner upload
  document.getElementById('bannerInput').onchange = (e) => handleBannerUpload(e.target.files[0]);
  document.getElementById('removeBannerBtn').onclick = removeBanner;
  
  // Avatar upload
  document.getElementById('avatarInput').onchange = (e) => handleAvatarUpload(e.target.files[0]);
  document.getElementById('removeAvatarBtn').onclick = removeAvatar;
  
  // Cancel button
  document.getElementById('cancelBtn').onclick = () => {
    if (confirm('Değişiklikleri kaydetmeden çıkmak istiyor musunuz?')) {
      window.location.href = `profile.html?user=${currentUser.discordId}`;
    }
  };
  
  // Back button
  document.getElementById('backBtn').onclick = (e) => {
    e.preventDefault();
    window.location.href = `profile.html?user=${currentUser.discordId}`;
  };
  
  // User menu
  const myProfileLink = document.getElementById('myProfileLink');
  if (myProfileLink) {
    myProfileLink.href = `profile.html?user=${currentUser.discordId}`;
  }
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('whitechapel_token');
      window.location.href = '/index.html';
    };
  }
}

function updateCharCount(inputId, countId) {
  const input = document.getElementById(inputId);
  const count = document.getElementById(countId);
  count.textContent = input.value.length;
}

function applyThemePreset(theme) {
  const themes = {
    blood: { bg: '#0a0a0a', accent: '#8b0000', text: '#ffffff' },
    dark: { bg: '#000000', accent: '#1a1a1a', text: '#e0e0e0' },
    nightmare: { bg: '#1a0a1a', accent: '#6a0a6a', text: '#e8d4f0' },
    asylum: { bg: '#0f1419', accent: '#2a8d5f', text: '#d4e8e0' }
  };
  
  if (themes[theme]) {
    document.getElementById('backgroundColor').value = themes[theme].bg;
    document.getElementById('backgroundColorText').value = themes[theme].bg;
    document.getElementById('accentColor').value = themes[theme].accent;
    document.getElementById('accentColorText').value = themes[theme].accent;
    document.getElementById('textColor').value = themes[theme].text;
    document.getElementById('textColorText').value = themes[theme].text;
  }
}

function syncColorInputs(colorId, textId) {
  const colorInput = document.getElementById(colorId);
  const textInput = document.getElementById(textId);
  
  colorInput.oninput = () => {
    textInput.value = colorInput.value;
    updatePreview();
  };
  
  textInput.oninput = () => {
    if (/^#[0-9A-F]{6}$/i.test(textInput.value)) {
      colorInput.value = textInput.value;
      updatePreview();
    }
  };
}

function updatePreview() {
  console.log('Updating preview...');
  
  // Banner
  const bannerImg = document.getElementById('bannerImg');
  const previewBanner = document.getElementById('previewBanner');
  if (bannerImg && previewBanner && bannerImg.style.display !== 'none') {
    previewBanner.style.backgroundImage = `url('${bannerImg.src}')`;
  }
  
  // Avatar
  const avatarImg = document.getElementById('avatarImg');
  const previewAvatar = document.getElementById('previewAvatar');
  if (avatarImg && previewAvatar) {
    previewAvatar.src = avatarImg.src;
  }
  
  // Username
  const displayName = document.getElementById('displayName');
  const previewUsername = document.getElementById('previewUsername');
  if (displayName && previewUsername) {
    previewUsername.textContent = displayName.value || (currentUser ? currentUser.username : 'Username');
  }
  
  // Status
  const statusMessage = document.getElementById('statusMessage');
  const previewStatus = document.getElementById('previewStatus');
  if (statusMessage && previewStatus) {
    previewStatus.textContent = statusMessage.value || 'Status message...';
  }
  
  // Bio
  const bio = document.getElementById('bio');
  const previewBio = document.getElementById('previewBio');
  if (bio && previewBio) {
    previewBio.textContent = bio.value || 'Bio text here...';
  }
  
  // Colors
  const bgColor = document.getElementById('backgroundColor');
  const accentColor = document.getElementById('accentColor');
  const textColor = document.getElementById('textColor');
  
  const previewBgColor = document.getElementById('previewBgColor');
  const previewAccentColor = document.getElementById('previewAccentColor');
  const previewTextColor = document.getElementById('previewTextColor');
  
  if (bgColor && previewBgColor) previewBgColor.style.backgroundColor = bgColor.value;
  if (accentColor && previewAccentColor) previewAccentColor.style.backgroundColor = accentColor.value;
  if (textColor && previewTextColor) previewTextColor.style.backgroundColor = textColor.value;
  
  console.log('Preview updated');
}

async function handleBannerUpload(file) {
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('Lütfen bir resim dosyası seçin', 'error');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('Dosya boyutu 5MB\'dan küçük olmalı', 'error');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('banner', file);
    
    const response = await fetch(`${API_BASE}/profile/upload/banner`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const data = await response.json();
    
    // Preview'ı güncelle
    document.getElementById('bannerImg').src = data.bannerUrl;
    document.getElementById('bannerImg').style.display = 'block';
    document.getElementById('bannerPlaceholder').style.display = 'none';
    document.getElementById('removeBannerBtn').style.display = 'inline-flex';
    
    updatePreview();
    showToast('Banner yüklendi!', 'success');
  } catch (error) {
    console.error('Banner upload error:', error);
    showToast('Banner yüklenirken hata oluştu', 'error');
  }
}

async function removeBanner() {
  try {
    const response = await fetch(`${API_BASE}/profile/banner`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) throw new Error('Delete failed');
    
    document.getElementById('bannerImg').style.display = 'none';
    document.getElementById('bannerPlaceholder').style.display = 'flex';
    document.getElementById('removeBannerBtn').style.display = 'none';
    document.getElementById('previewBanner').style.backgroundImage = '';
    
    showToast('Banner kaldırıldı', 'success');
  } catch (error) {
    console.error('Banner remove error:', error);
    showToast('Banner kaldırılırken hata oluştu', 'error');
  }
}

async function handleAvatarUpload(file) {
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast('Lütfen bir resim dosyası seçin', 'error');
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    showToast('Dosya boyutu 5MB\'dan küçük olmalı', 'error');
    return;
  }
  
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch(`${API_BASE}/profile/upload/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const data = await response.json();
    
    document.getElementById('avatarImg').src = data.avatarUrl;
    document.getElementById('removeAvatarBtn').style.display = 'inline-flex';
    
    updatePreview();
    showToast('Avatar yüklendi!', 'success');
  } catch (error) {
    console.error('Avatar upload error:', error);
    showToast('Avatar yüklenirken hata oluştu', 'error');
  }
}

async function removeAvatar() {
  try {
    const response = await fetch(`${API_BASE}/profile/avatar`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) throw new Error('Delete failed');
    
    const data = await response.json();
    document.getElementById('avatarImg').src = data.avatarUrl;
    document.getElementById('removeAvatarBtn').style.display = 'none';
    
    updatePreview();
    showToast('Discord avatar kullanılıyor', 'success');
  } catch (error) {
    console.error('Avatar remove error:', error);
    showToast('Avatar kaldırılırken hata oluştu', 'error');
  }
}

async function saveProfile() {
  try {
    console.log('=== SAVING PROFILE ===');
    showLoader();
    
    // Sosyal medya linklerini normalize et (otomatik https:// ekle)
    const normalizeSocialLink = (url, platform) => {
      if (!url || url.trim() === '') return '';
      
      url = url.trim();
      console.log(`Normalizing ${platform}:`, url);
      
      // Zaten tam URL ise olduğu gibi döndür
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log(`  → Already full URL:`, url);
        return url;
      }
      
      // Platform'a göre tam URL oluştur
      let result = '';
      switch(platform) {
        case 'twitter':
          if (url.includes('twitter.com/')) result = 'https://' + url;
          else {
            if (url.startsWith('@')) url = url.substring(1);
            result = `https://twitter.com/${url}`;
          }
          break;
          
        case 'instagram':
          if (url.includes('instagram.com/')) result = 'https://' + url;
          else {
            if (url.startsWith('@')) url = url.substring(1);
            result = `https://instagram.com/${url}`;
          }
          break;
          
        case 'youtube':
          if (url.includes('youtube.com/')) result = 'https://' + url;
          else {
            if (url.startsWith('@')) result = `https://youtube.com/${url}`;
            else result = `https://youtube.com/@${url}`;
          }
          break;
          
        case 'twitch':
          if (url.includes('twitch.tv/')) result = 'https://' + url;
          else result = `https://twitch.tv/${url}`;
          break;
          
        case 'steam':
          if (url.includes('steamcommunity.com/')) result = 'https://' + url;
          else result = `https://steamcommunity.com/id/${url}`;
          break;
          
        default:
          result = url.startsWith('http') ? url : 'https://' + url;
      }
      
      console.log(`  → Normalized to:`, result);
      return result;
    };
    
    const socialLinks = {
      twitter: normalizeSocialLink(document.getElementById('socialTwitter').value, 'twitter'),
      instagram: normalizeSocialLink(document.getElementById('socialInstagram').value, 'instagram'),
      youtube: normalizeSocialLink(document.getElementById('socialYoutube').value, 'youtube'),
      twitch: normalizeSocialLink(document.getElementById('socialTwitch').value, 'twitch'),
      steam: normalizeSocialLink(document.getElementById('socialSteam').value, 'steam'),
      custom: normalizeSocialLink(document.getElementById('socialCustom').value, 'custom')
    };
    
    console.log('Social links normalized:', socialLinks);
    
    const profileData = {
      displayName: document.getElementById('displayName').value,
      bio: document.getElementById('bio').value,
      theme: document.getElementById('theme').value,
      backgroundColor: document.getElementById('backgroundColor').value,
      accentColor: document.getElementById('accentColor').value,
      textColor: document.getElementById('textColor').value,
      profileVisibility: document.getElementById('profileVisibility').value,
      favoriteSlasher: document.getElementById('favoriteSlasher').value,
      statusMessage: document.getElementById('statusMessage').value,
      socialLinks: socialLinks
    };
    
    console.log('Profile data to save:', profileData);
    
    const response = await fetch(`${API_BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) throw new Error('Save failed');
    
    // Showcase'i kaydet (hata olursa profil yine de kaydedilmiş olur)
    try {
      await saveShowcaseFromEdit();
    } catch (showcaseError) {
      console.error('Showcase save error (non-critical):', showcaseError);
      // Showcase hatası olsa bile devam et
    }
    
    hideLoader();
    showToast('Profil güncellendi!', 'success');
    
    setTimeout(() => {
      window.location.href = `profile.html?user=${currentUser.discordId}`;
    }, 1500);
  } catch (error) {
    console.error('Save profile error:', error);
    hideLoader();
    showToast('Profil kaydedilirken hata oluştu', 'error');
  }
}

async function saveShowcaseFromEdit() {
  console.log('=== SAVE SHOWCASE FROM EDIT ===');
  console.log('showcaseEditItems:', showcaseEditItems);
  console.log('Items count:', showcaseEditItems.length);
  
  try {
    const showcaseTitle = document.getElementById('showcaseTitleEdit');
    const title = showcaseTitle ? showcaseTitle.value.trim() : 'Vitrinim';
    
    console.log('Showcase title:', title);
    console.log('Sending to API...');
    
    const requestBody = {
      title: title || 'Vitrinim',
      items: showcaseEditItems
    };
    
    console.log('Request body:', requestBody);
    
    const response = await fetch(`${API_BASE}/showcase`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save showcase. Response:', errorText);
    } else {
      const data = await response.json();
      console.log('Showcase saved successfully:', data);
    }
  } catch (error) {
    console.error('Save showcase error:', error);
  }
}

/* ══════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════ */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Az önce';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' dakika önce';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' saat önce';
  if (seconds < 604800) return Math.floor(seconds / 86400) + ' gün önce';
  
  return date.toLocaleDateString('tr-TR');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.remove('hidden');
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    loader.classList.add('hidden');
  }
}

async function toggleFollow(userId) {
  try {
    showLoader();
    
    // Takip durumunu kontrol et
    const statusResponse = await fetch(`${API_BASE}/follow/status/${userId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const { following } = await statusResponse.json();
    
    let response;
    if (following) {
      // Takibi bırak
      response = await fetch(`${API_BASE}/follow/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    } else {
      // Takip et
      response = await fetch(`${API_BASE}/follow/${userId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
    
    if (!response.ok) throw new Error('Failed to toggle follow');
    
    const data = await response.json();
    
    // Buton text'ini güncelle
    const followBtn = document.getElementById('followBtn');
    if (data.following) {
      followBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Takip Ediliyor';
      followBtn.style.background = 'var(--dark-3)';
      showToast('Takip edildi!', 'success');
    } else {
      followBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Takip Et';
      followBtn.style.background = 'var(--accent)';
      showToast('Takip bırakıldı', 'success');
    }
    
    // Takipçi sayısını güncelle
    document.getElementById('statFollowers').textContent = data.followersCount;
    
    hideLoader();
  } catch (error) {
    console.error('Toggle follow error:', error);
    hideLoader();
    showToast('İşlem başarısız', 'error');
  }
}

function openChat(userId) {
  // Mesajlaşma sayfasına yönlendir
  window.location.href = `messages.html?user=${userId}`;
}

/* ══════════════════════════════════════════
   NAVIGATION (Her sayfada)
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  if (authToken) {
    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        updateNavigation();
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }
});

function updateNavigation() {
  const userMenu = document.getElementById('userMenu');
  const loginBtn = document.getElementById('loginBtn');
  const navAvatar = document.getElementById('navAvatar');
  
  if (userMenu && loginBtn && navAvatar && currentUser) {
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
  }
}


/* ══════════════════════════════════════════
   CUSTOM CURSOR (Kanlı Bıçak)
══════════════════════════════════════════ */
if (window.matchMedia('(pointer: fine)').matches) {
  const cursorDot  = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  
  if (cursorDot && cursorRing) {
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX; 
      mouseY = e.clientY;
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

    // Hover efekti için elementler
    document.querySelectorAll('a, button, input, textarea, select, .profile-card, .stat-item, .badge-item, .achievement-item')
      .forEach(el => {
        el.addEventListener('mouseenter', () => cursorRing.classList.add('hovered'));
        el.addEventListener('mouseleave', () => cursorRing.classList.remove('hovered'));
      });
  }
}


/* ══════════════════════════════════════════
   PROFILE COMMENTS SYSTEM
══════════════════════════════════════════ */

let profileComments = [];
let editingCommentId = null;

// Profile page'de yorumları yükle
if (document.querySelector('.profile-page')) {
  // Sayfa yüklendiğinde yorumları getir
  document.addEventListener('DOMContentLoaded', () => {
    // viewingUser yüklendiğinde yorumları getir
    setTimeout(() => {
      if (viewingUser) {
        loadProfileComments();
        setupCommentListeners();
      }
    }, 1000);
  });
}

function setupCommentListeners() {
  // Comment form'u göster/gizle
  const commentForm = document.getElementById('commentForm');
  const commentTextarea = document.getElementById('commentTextarea');
  const commentSubmitBtn = document.getElementById('commentSubmitBtn');
  const commentCharCount = document.getElementById('commentCharCount');
  
  if (authToken && currentUser) {
    // Giriş yaptıysa form'u göster
    commentForm.style.display = 'block';
    
    // Avatar'ı ayarla
    const commentFormAvatar = document.getElementById('commentFormAvatar');
    if (currentUser.profile.customAvatar) {
      commentFormAvatar.src = currentUser.profile.customAvatar;
    } else if (currentUser.avatar) {
      if (currentUser.avatar.startsWith('http')) {
        commentFormAvatar.src = currentUser.avatar;
      } else {
        commentFormAvatar.src = `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
      }
    }
    
    // Karakter sayacı
    commentTextarea.oninput = () => {
      const length = commentTextarea.value.length;
      commentCharCount.textContent = length;
      
      // Submit button enable/disable
      commentSubmitBtn.disabled = length === 0 || length > 500;
    };
    
    // Submit
    commentSubmitBtn.onclick = () => submitComment();
    
    // Enter tuşu ile gönder (Shift+Enter yeni satır)
    commentTextarea.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!commentSubmitBtn.disabled) {
          submitComment();
        }
      }
    };
  }
}

async function loadProfileComments() {
  try {
    const userId = viewingUser.discordId || viewingUser._id;
    
    const response = await fetch(`${API_BASE}/comments/profile/${userId}`);
    
    if (!response.ok) throw new Error('Failed to load comments');
    
    const data = await response.json();
    profileComments = data.comments;
    
    renderComments();
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

function renderComments() {
  const commentsList = document.getElementById('commentsList');
  const commentCount = document.getElementById('commentCount');
  
  commentCount.textContent = `(${profileComments.length})`;
  
  if (profileComments.length === 0) {
    commentsList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-comment-slash"></i>
        <p>Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
      </div>
    `;
    return;
  }
  
  commentsList.innerHTML = profileComments.map(comment => {
    const isAuthor = currentUser && comment.author._id === currentUser.id;
    const isProfileOwner = currentUser && viewingUser.id === currentUser.id;
    const canDelete = isAuthor || isProfileOwner || (currentUser && ['admin', 'moderator'].includes(currentUser.role));
    
    // Avatar URL
    let avatarUrl = '';
    if (comment.author.avatar) {
      if (comment.author.avatar.startsWith('http')) {
        avatarUrl = comment.author.avatar;
      } else {
        avatarUrl = `https://cdn.discordapp.com/avatars/${comment.author.discordId}/${comment.author.avatar}.png`;
      }
    } else {
      const defaultNum = parseInt(comment.author.discriminator || '0') % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
    }
    
    // Time ago
    const timeAgo = getTimeAgo(new Date(comment.createdAt));
    
    // Role badge
    let roleBadge = '';
    if (comment.author.role !== 'user') {
      roleBadge = `<span class="comment-author-badge ${comment.author.role}">${comment.author.role}</span>`;
    }
    
    return `
      <div class="comment-item" data-comment-id="${comment._id}">
        <div class="comment-header">
          <img 
            src="${avatarUrl}" 
            alt="${comment.author.username}" 
            class="comment-author-avatar"
            onclick="window.location.href='profile.html?user=${comment.author.discordId}'"
          />
          <div class="comment-author-info">
            <div>
              <span 
                class="comment-author-name"
                onclick="window.location.href='profile.html?user=${comment.author.discordId}'"
              >
                ${comment.author.username}${roleBadge}
              </span>
              <span class="comment-time">${timeAgo}</span>
              ${comment.edited ? '<span class="comment-edited">(düzenlendi)</span>' : ''}
            </div>
          </div>
          ${(isAuthor || canDelete) ? `
            <div class="comment-actions">
              ${isAuthor ? `<button class="comment-action-btn edit" onclick="editComment('${comment._id}')">
                <i class="fa-solid fa-pen"></i> Düzenle
              </button>` : ''}
              ${canDelete ? `<button class="comment-action-btn delete" onclick="deleteComment('${comment._id}')">
                <i class="fa-solid fa-trash"></i> Sil
              </button>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="comment-content" id="commentContent-${comment._id}">${escapeHtml(comment.content)}</div>
      </div>
    `;
  }).join('');
}

async function submitComment() {
  const textarea = document.getElementById('commentTextarea');
  const content = textarea.value.trim();
  
  if (!content || content.length === 0) return;
  if (content.length > 500) {
    showToast('Yorum çok uzun (max 500 karakter)', 'error');
    return;
  }
  
  try {
    const userId = viewingUser.discordId || viewingUser._id;
    
    const response = await fetch(`${API_BASE}/comments/profile/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to post comment');
    }
    
    const data = await response.json();
    
    // Yorumu listeye ekle
    profileComments.unshift(data.comment);
    
    // Render et
    renderComments();
    
    // Formu temizle
    textarea.value = '';
    document.getElementById('commentCharCount').textContent = '0';
    document.getElementById('commentSubmitBtn').disabled = true;
    
    showToast('Yorum gönderildi!', 'success');
  } catch (error) {
    console.error('Submit comment error:', error);
    showToast(error.message || 'Yorum gönderilemedi', 'error');
  }
}

function editComment(commentId) {
  const comment = profileComments.find(c => c._id === commentId);
  if (!comment) return;
  
  const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
  const contentDiv = commentItem.querySelector('.comment-content');
  
  // Eğer zaten edit modundaysa, iptal et
  if (editingCommentId === commentId) {
    cancelEditComment();
    return;
  }
  
  // Önceki edit'i iptal et
  if (editingCommentId) {
    cancelEditComment();
  }
  
  editingCommentId = commentId;
  
  // Edit form'u oluştur
  const editForm = document.createElement('div');
  editForm.className = 'comment-edit-form';
  editForm.innerHTML = `
    <textarea class="comment-edit-textarea" maxlength="500">${escapeHtml(comment.content)}</textarea>
    <div class="comment-edit-actions">
      <button class="btn-comment-save" onclick="saveEditComment('${commentId}')">
        <i class="fa-solid fa-check"></i> Kaydet
      </button>
      <button class="btn-comment-cancel" onclick="cancelEditComment()">
        <i class="fa-solid fa-times"></i> İptal
      </button>
    </div>
  `;
  
  // Orijinal içeriği gizle
  contentDiv.style.display = 'none';
  commentItem.appendChild(editForm);
  
  // Textarea'ya focus
  const textarea = editForm.querySelector('textarea');
  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

async function saveEditComment(commentId) {
  const commentItem = document.querySelector(`[data-comment-id="${commentId}"]`);
  const textarea = commentItem.querySelector('.comment-edit-textarea');
  const content = textarea.value.trim();
  
  if (!content || content.length === 0) {
    showToast('Yorum boş olamaz', 'error');
    return;
  }
  
  if (content.length > 500) {
    showToast('Yorum çok uzun (max 500 karakter)', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to edit comment');
    }
    
    const data = await response.json();
    
    // Listeyi güncelle
    const index = profileComments.findIndex(c => c._id === commentId);
    if (index !== -1) {
      profileComments[index] = data.comment;
    }
    
    // Render et
    renderComments();
    
    editingCommentId = null;
    showToast('Yorum güncellendi!', 'success');
  } catch (error) {
    console.error('Edit comment error:', error);
    showToast(error.message || 'Yorum güncellenemedi', 'error');
  }
}

function cancelEditComment() {
  if (!editingCommentId) return;
  
  const commentItem = document.querySelector(`[data-comment-id="${editingCommentId}"]`);
  const editForm = commentItem.querySelector('.comment-edit-form');
  const contentDiv = commentItem.querySelector('.comment-content');
  
  if (editForm) editForm.remove();
  if (contentDiv) contentDiv.style.display = 'block';
  
  editingCommentId = null;
}

async function deleteComment(commentId) {
  if (!confirm('Bu yorumu silmek istediğine emin misin?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete comment');
    }
    
    // Listeden kaldır
    profileComments = profileComments.filter(c => c._id !== commentId);
    
    // Render et
    renderComments();
    
    showToast('Yorum silindi', 'success');
  } catch (error) {
    console.error('Delete comment error:', error);
    showToast(error.message || 'Yorum silinemedi', 'error');
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Global scope'a export et
window.editComment = editComment;
window.saveEditComment = saveEditComment;
window.cancelEditComment = cancelEditComment;
window.deleteComment = deleteComment;


/* ══════════════════════════════════════════
   SHOWCASE SYSTEM
══════════════════════════════════════════ */

let currentShowcase = null;
let showcaseItems = [];

// Profile page'de showcase'i yükle
if (document.querySelector('.profile-page')) {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (viewingUser) {
        loadShowcase();
      }
    }, 1200);
  });
}

async function loadShowcase() {
  try {
    console.log('=== LOADING SHOWCASE ===');
    console.log('viewingUser:', viewingUser);
    
    const userId = viewingUser.discordId || viewingUser._id;
    console.log('Loading showcase for userId:', userId);
    
    const response = await fetch(`${API_BASE}/showcase/${userId}`);
    console.log('Showcase response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 403) {
        console.log('Showcase is private');
        return;
      }
      throw new Error('Failed to load showcase');
    }
    
    const data = await response.json();
    console.log('Showcase data:', data);
    
    currentShowcase = data.showcase;
    showcaseItems = data.showcase.items || [];
    
    console.log('Showcase items:', showcaseItems);
    console.log('Items count:', showcaseItems.length);
    
    renderShowcase();
    
    // Kendi profili ise düzenle butonunu göster
    if (currentUser && viewingUser.id === currentUser.id) {
      const editBtn = document.getElementById('editShowcaseBtn');
      if (editBtn) {
        editBtn.style.display = 'flex';
        editBtn.onclick = openShowcaseModal;
      }
    }
  } catch (error) {
    console.error('Error loading showcase:', error);
    
    // Hata olsa bile boş showcase göster
    const showcaseGrid = document.getElementById('showcaseGrid');
    if (showcaseGrid) {
      showcaseGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-image"></i>
          <p>Vitrin yüklenemedi. Sayfayı yenile.</p>
        </div>
      `;
    }
  }
}

function renderShowcase() {
  console.log('=== RENDERING SHOWCASE ===');
  
  const showcaseGrid = document.getElementById('showcaseGrid');
  const showcaseTitle = document.getElementById('showcaseTitle');
  
  console.log('showcaseGrid element:', showcaseGrid);
  console.log('showcaseTitle element:', showcaseTitle);
  console.log('currentShowcase:', currentShowcase);
  console.log('showcaseItems:', showcaseItems);
  
  if (currentShowcase && currentShowcase.title) {
    showcaseTitle.textContent = currentShowcase.title;
  }
  
  if (!showcaseItems || showcaseItems.length === 0) {
    console.log('No showcase items, showing empty state');
    showcaseGrid.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-image"></i>
        <p>Vitrin boş${currentUser && viewingUser.id === currentUser.id ? '. Düzenle butonuna tıkla!' : '.'}</p>
      </div>
    `;
    return;
  }
  
  console.log('Rendering', showcaseItems.length, 'showcase items');
  
  showcaseGrid.innerHTML = showcaseItems.map(item => {
    console.log('Rendering item:', item);
    
    if (item.type === 'artwork' || item.type === 'screenshot') {
      return `
        <div class="showcase-item" onclick="openShowcaseItemModal('${item._id}')">
          <img src="${item.image}" alt="${item.title}" class="showcase-item-image" />
          <div class="showcase-item-content">
            <div class="showcase-item-type">
              <i class="fa-solid fa-image"></i> ${item.type === 'artwork' ? 'Çizim' : 'Ekran Görüntüsü'}
            </div>
            <div class="showcase-item-title">${escapeHtml(item.title)}</div>
            ${item.description ? `<div class="showcase-item-description">${escapeHtml(item.description)}</div>` : ''}
          </div>
        </div>
      `;
    } else if (item.type === 'achievement' && item.achievementId) {
      return `
        <div class="showcase-item showcase-achievement-item" onclick="openShowcaseItemModal('${item._id}')">
          <div class="showcase-achievement-icon">${item.achievementId.icon || '🏆'}</div>
          <div class="showcase-item-content">
            <div class="showcase-item-type">
              <i class="fa-solid fa-trophy"></i> Başarım
            </div>
            <div class="showcase-item-title">${item.achievementId.name}</div>
            <div class="showcase-item-description">${item.achievementId.description}</div>
          </div>
        </div>
      `;
    } else if (item.type === 'badge') {
      return `
        <div class="showcase-item showcase-badge-item" onclick="openShowcaseItemModal('${item._id}')">
          <div class="showcase-badge-icon">${item.badge || '🎖️'}</div>
          <div class="showcase-item-content">
            <div class="showcase-item-type">
              <i class="fa-solid fa-award"></i> Rozet
            </div>
            <div class="showcase-item-title">${escapeHtml(item.title || 'Rozet')}</div>
          </div>
        </div>
      `;
    }
    return '';
  }).join('');
  
  console.log('Showcase rendered successfully');
}

function openShowcaseModal() {
  const modal = document.getElementById('showcaseModal');
  const titleInput = document.getElementById('showcaseTitleInput');
  
  if (currentShowcase && currentShowcase.title) {
    titleInput.value = currentShowcase.title;
  }
  
  renderShowcaseItemsList();
  modal.classList.add('show');
}

function closeShowcaseModal() {
  document.getElementById('showcaseModal').classList.remove('show');
}

document.getElementById('closeShowcaseModal').onclick = closeShowcaseModal;

function renderShowcaseItemsList() {
  const list = document.getElementById('showcaseItemsList');
  
  // Eğer element yoksa (profile-edit sayfasındaysak), çık
  if (!list) {
    console.log('showcaseItemsList element not found, skipping render');
    return;
  }
  
  if (!showcaseItems || showcaseItems.length === 0) {
    list.innerHTML = '<p class="text-muted" style="text-align:center; color: var(--text-muted);">Vitrin boş. Yukarıdaki butonlardan item ekle!</p>';
    return;
  }
  
  list.innerHTML = showcaseItems.map((item, index) => {
    let previewHtml = '';
    
    if (item.type === 'artwork' || item.type === 'screenshot') {
      previewHtml = `<img src="${item.image}" alt="${item.title}" class="showcase-edit-item-image" />`;
    } else if (item.type === 'achievement' && item.achievementId) {
      previewHtml = `<div class="showcase-edit-item-image" style="display:flex; align-items:center; justify-content:center; font-size:48px;">${item.achievementId.icon || '🏆'}</div>`;
    } else if (item.type === 'badge') {
      previewHtml = `<div class="showcase-edit-item-image" style="display:flex; align-items:center; justify-content:center; font-size:36px;">${item.badge || '🎖️'}</div>`;
    }
    
    return `
      <div class="showcase-edit-item" draggable="true" data-index="${index}">
        ${previewHtml}
        <div class="showcase-edit-item-info">
          <div class="showcase-edit-item-title">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="showcase-edit-item-type">${item.type}</div>
        </div>
        <button class="btn-remove-showcase-item" onclick="removeShowcaseItem(${index})" style="display: flex;">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
}

async function saveShowcase() {
  try {
    showLoader();
    
    const title = document.getElementById('showcaseTitleInput').value.trim();
    
    const response = await fetch(`${API_BASE}/showcase`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title || 'Vitrinim',
        items: showcaseItems
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save showcase');
    }
    
    const data = await response.json();
    currentShowcase = data.showcase;
    showcaseItems = data.showcase.items || [];
    
    renderShowcase();
    closeShowcaseModal();
    hideLoader();
    showToast('Vitrin kaydedildi!', 'success');
  } catch (error) {
    console.error('Save showcase error:', error);
    hideLoader();
    showToast(error.message || 'Vitrin kaydedilemedi', 'error');
  }
}

function removeShowcaseItem(index) {
  if (!confirm('Bu item\'ı vitrinden kaldırmak istediğine emin misin?')) return;
  
  showcaseItems.splice(index, 1);
  renderShowcaseItemsList();
}

// Artwork modal
function openAddArtworkModal() {
  document.getElementById('addArtworkModal').classList.add('show');
  
  // Preview listener
  const fileInput = document.getElementById('artworkFileInput');
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('artworkPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
      };
      reader.readAsDataURL(file);
    }
  };
}

function closeAddArtworkModal() {
  document.getElementById('addArtworkModal').classList.remove('show');
  document.getElementById('artworkFileInput').value = '';
  document.getElementById('artworkTitle').value = '';
  document.getElementById('artworkDescription').value = '';
  document.getElementById('artworkPreview').innerHTML = '';
}

async function uploadArtwork() {
  try {
    const fileInput = document.getElementById('artworkFileInput');
    const title = document.getElementById('artworkTitle').value.trim();
    const description = document.getElementById('artworkDescription').value.trim();
    
    if (!fileInput.files[0]) {
      showToast('Lütfen bir resim seç', 'error');
      return;
    }
    
    if (!title) {
      showToast('Lütfen bir başlık gir', 'error');
      return;
    }
    
    if (showcaseItems.length >= 12) {
      showToast('Maksimum 12 item ekleyebilirsin', 'error');
      return;
    }
    
    showLoader();
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', 'artwork');
    
    const response = await fetch(`${API_BASE}/showcase/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    
    // Yeni item'ı listeye ekle
    showcaseItems.push(data.item);
    
    renderShowcaseItemsList();
    closeAddArtworkModal();
    hideLoader();
    showToast('Çizim eklendi!', 'success');
  } catch (error) {
    console.error('Upload artwork error:', error);
    hideLoader();
    showToast(error.message || 'Yükleme başarısız', 'error');
  }
}

function openAddAchievementModal() {
  showToast('Başarım ekleme özelliği yakında aktif olacak!', 'info');
  // TODO: Kullanıcının başarımlarını listele ve seçtir
}

function openAddBadgeModal() {
  showToast('Rozet ekleme özelliği yakında aktif olacak!', 'info');
  // TODO: Badge selector göster
}

function openShowcaseItemModal(itemId) {
  // TODO: Item detay modal'ı (büyük görsel, açıklama vs)
  console.log('Opening item:', itemId);
}

// Global scope'a export
window.openShowcaseModal = openShowcaseModal;
window.closeShowcaseModal = closeShowcaseModal;
window.saveShowcase = saveShowcase;
window.removeShowcaseItem = removeShowcaseItem;
window.openAddArtworkModal = openAddArtworkModal;
window.closeAddArtworkModal = closeAddArtworkModal;
window.uploadArtwork = uploadArtwork;
window.openAddAchievementModal = openAddAchievementModal;
window.openAddBadgeModal = openAddBadgeModal;
window.openShowcaseItemModal = openShowcaseItemModal;


/* ══════════════════════════════════════════
   SHOWCASE EDIT IN PROFILE EDIT PAGE
══════════════════════════════════════════ */

let showcaseEditItems = [];

async function loadShowcaseForEdit() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${API_BASE}/showcase/${currentUser.discordId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      showcaseEditItems = data.showcase.items || [];
      
      // Başlığı doldur
      const showcaseTitleInput = document.getElementById('showcaseTitleEdit');
      if (showcaseTitleInput && data.showcase.title) {
        showcaseTitleInput.value = data.showcase.title;
      }
      
      renderShowcaseEditGrid();
    }
  } catch (error) {
    console.error('Error loading showcase for edit:', error);
  }
}

function renderShowcaseEditGrid() {
  const grid = document.getElementById('showcaseItemsEditGrid');
  
  if (!showcaseEditItems || showcaseEditItems.length === 0) {
    grid.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px; grid-column: 1/-1;">Henüz vitrin item\'ı eklenmedi.</p>';
    return;
  }
  
  grid.innerHTML = showcaseEditItems.map((item, index) => {
    let contentHtml = '';
    
    if (item.type === 'artwork' || item.type === 'screenshot') {
      contentHtml = `<img src="${item.image}" alt="${item.title}" class="showcase-edit-item-small-image" />`;
    } else if (item.type === 'achievement' && item.achievementId) {
      contentHtml = `<div class="showcase-edit-item-small-content">${item.achievementId.icon || '🏆'}</div>`;
    } else if (item.type === 'badge') {
      contentHtml = `<div class="showcase-edit-item-small-content">${item.badge || '🎖️'}</div>`;
    }
    
    return `
      <div class="showcase-edit-item-small" draggable="true" data-index="${index}">
        ${contentHtml}
        <div class="showcase-edit-item-small-title">${escapeHtml(item.title || 'Untitled')}</div>
        <button class="btn-remove-showcase-item-small" onclick="removeShowcaseEditItem(${index})">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `;
  }).join('');
}

function removeShowcaseEditItem(index) {
  if (!confirm('Bu item\'ı vitrinden kaldırmak istediğine emin misin?')) return;
  
  showcaseEditItems.splice(index, 1);
  renderShowcaseEditGrid();
}

function openAddArtworkModalFromEdit() {
  document.getElementById('addArtworkModal').classList.add('show');
  
  // Preview listener
  const fileInput = document.getElementById('artworkFileInput');
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('artworkPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
      };
      reader.readAsDataURL(file);
    }
  };
}

async function uploadArtworkFromEdit() {
  console.log('=== UPLOAD ARTWORK FROM EDIT ===');
  
  try {
    const fileInput = document.getElementById('artworkFileInput');
    const title = document.getElementById('artworkTitle').value.trim();
    const description = document.getElementById('artworkDescription').value.trim();
    
    console.log('File:', fileInput.files[0]);
    console.log('Title:', title);
    console.log('Description:', description);
    console.log('Current items:', showcaseEditItems.length);
    
    if (!fileInput.files[0]) {
      showToast('Lütfen bir resim seç', 'error');
      return;
    }
    
    if (!title) {
      showToast('Lütfen bir başlık gir', 'error');
      return;
    }
    
    if (showcaseEditItems.length >= 12) {
      showToast('Maksimum 12 item ekleyebilirsin', 'error');
      return;
    }
    
    showLoader();
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', 'artwork');
    
    console.log('Uploading to:', `${API_BASE}/showcase/upload`);
    console.log('Auth token:', authToken ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE}/showcase/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Upload error:', errorData);
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    console.log('Upload success:', data);
    
    // Yeni item'ı listeye ekle
    showcaseEditItems.push(data.item);
    console.log('Item added to showcaseEditItems. New count:', showcaseEditItems.length);
    
    renderShowcaseEditGrid();
    closeAddArtworkModal();
    hideLoader();
    showToast('Çizim eklendi! "Değişiklikleri Kaydet" butonuna basmayı unutma!', 'success');
  } catch (error) {
    console.error('Upload artwork error:', error);
    console.error('Error stack:', error.stack);
    hideLoader();
    showToast(error.message || 'Yükleme başarısız', 'error');
  }
}

function openAddAchievementModalFromEdit() {
  showToast('Başarım ekleme özelliği yakında aktif olacak!', 'info');
}

function openAddBadgeModalFromEdit() {
  showToast('Rozet ekleme özelliği yakında aktif olacak!', 'info');
}

// uploadArtwork fonksiyonunu güncelle - hangi sayfada olduğumuza göre
window.uploadArtwork = async function() {
  console.log('uploadArtwork called');
  
  // Eğer profile-edit sayfasındaysak
  if (document.querySelector('.profile-edit-page')) {
    console.log('Calling uploadArtworkFromEdit');
    return uploadArtworkFromEdit();
  }
  
  // Değilse normal uploadArtwork (profile.html'deki modal için)
  console.log('Calling uploadArtworkNormal');
  return uploadArtworkNormal();
};

async function uploadArtworkNormal() {
  try {
    const fileInput = document.getElementById('artworkFileInput');
    const title = document.getElementById('artworkTitle').value.trim();
    const description = document.getElementById('artworkDescription').value.trim();
    
    if (!fileInput.files[0]) {
      showToast('Lütfen bir resim seç', 'error');
      return;
    }
    
    if (!title) {
      showToast('Lütfen bir başlık gir', 'error');
      return;
    }
    
    if (showcaseItems.length >= 12) {
      showToast('Maksimum 12 item ekleyebilirsin', 'error');
      return;
    }
    
    showLoader();
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('type', 'artwork');
    
    const response = await fetch(`${API_BASE}/showcase/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    
    // Yeni item'ı listeye ekle
    showcaseItems.push(data.item);
    
    renderShowcaseItemsList();
    closeAddArtworkModal();
    hideLoader();
    showToast('Çizim eklendi!', 'success');
  } catch (error) {
    console.error('Upload artwork error:', error);
    hideLoader();
    showToast(error.message || 'Yükleme başarısız', 'error');
  }
}

// Global scope'a export
window.removeShowcaseEditItem = removeShowcaseEditItem;
window.openAddArtworkModalFromEdit = openAddArtworkModalFromEdit;
window.openAddAchievementModalFromEdit = openAddAchievementModalFromEdit;
window.openAddBadgeModalFromEdit = openAddBadgeModalFromEdit;
