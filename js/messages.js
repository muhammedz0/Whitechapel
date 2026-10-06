/* Messages.js - Basit Mesajlaşma Sistemi */

const API_BASE = window.location.origin + '/api';
const authToken = localStorage.getItem('whitechapel_token');
let currentUser = null;
let currentChatUser = null;
let conversations = [];
let messages = [];

// Auth kontrolü
if (!authToken) {
  window.location.href = '/index.html';
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
  await loadCurrentUser();
  await loadConversations();
  
  // URL'den user ID varsa direkt o sohbeti aç
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user');
  if (userId) {
    await openChatWithUser(userId);
  }
});

async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) {
      window.location.href = '/index.html';
      return;
    }
    
    const data = await response.json();
    currentUser = data.user;
    
    // Avatar'ı göster
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar && currentUser.avatar) {
      if (currentUser.avatar.startsWith('http')) {
        navAvatar.src = currentUser.avatar;
      } else {
        navAvatar.src = `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`;
      }
    }
  } catch (error) {
    console.error('Load user error:', error);
    window.location.href = '/index.html';
  }
}

async function loadConversations() {
  try {
    const response = await fetch(`${API_BASE}/messages/conversations`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!response.ok) return;
    
    const data = await response.json();
    conversations = data.conversations || [];
    
    renderConversations();
  } catch (error) {
    console.error('Load conversations error:', error);
  }
}

function renderConversations() {
  const list = document.getElementById('conversationsList');
  
  if (conversations.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-comment-slash"></i>
        <p>Henüz mesaj yok</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = conversations.map(conv => {
    const user = conv.otherUser;
    const avatar = user.avatar && user.avatar.startsWith('http') 
      ? user.avatar 
      : `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    
    return `
      <div class="conversation-item" onclick="openChatWithUser('${user._id}')">
        <img src="${avatar}" alt="${user.username}" class="conversation-avatar" />
        <div class="conversation-info">
          <div class="conversation-name">${user.username}</div>
          <div class="conversation-last-message">${conv.lastMessage.content || 'Mesaj'}</div>
        </div>
        <div class="conversation-time">${getTimeAgo(new Date(conv.lastMessage.createdAt))}</div>
      </div>
    `;
  }).join('');
}

async function openChatWithUser(userId) {
  try {
    showLoader();
    
    // Kullanıcı bilgilerini al
    const userResponse = await fetch(`${API_BASE}/users/${userId}`);
    if (!userResponse.ok) throw new Error('User not found');
    
    const userData = await userResponse.json();
    currentChatUser = userData.user;
    
    // Mesajları yükle
    const messagesResponse = await fetch(`${API_BASE}/messages/conversation/${userId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const messagesData = await messagesResponse.json();
    messages = messagesData.messages || [];
    
    renderChatArea();
    hideLoader();
  } catch (error) {
    console.error('Open chat error:', error);
    hideLoader();
    showToast('Sohbet açılamadı', 'error');
  }
}

function renderChatArea() {
  const chatArea = document.getElementById('chatArea');
  
  const avatar = currentChatUser.avatar && currentChatUser.avatar.startsWith('http')
    ? currentChatUser.avatar
    : `https://cdn.discordapp.com/avatars/${currentChatUser.discordId}/${currentChatUser.avatar}.png`;
  
  chatArea.innerHTML = `
    <div class="chat-header">
      <img src="${avatar}" alt="${currentChatUser.username}" class="chat-header-avatar" />
      <div class="chat-header-info">
        <div class="chat-header-name">${currentChatUser.username}</div>
        <div class="chat-header-status">Aktif</div>
      </div>
    </div>
    
    <div class="chat-messages" id="chatMessages">
      ${messages.length === 0 ? '<div class="empty-state"><p>Henüz mesaj yok. İlk mesajı sen gönder!</p></div>' : ''}
    </div>
    
    <div class="chat-input-area">
      <textarea 
        class="chat-input" 
        id="messageInput" 
        placeholder="Mesaj yaz..."
        rows="1"
      ></textarea>
      <button class="btn-send" id="sendBtn" onclick="sendMessage()">
        <i class="fa-solid fa-paper-plane"></i> Gönder
      </button>
    </div>
  `;
  
  if (messages.length > 0) {
    renderMessages();
  }
  
  // Enter tuşu ile gönder
  const messageInput = document.getElementById('messageInput');
  messageInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
}

function renderMessages() {
  const chatMessages = document.getElementById('chatMessages');
  
  chatMessages.innerHTML = messages.map(msg => {
    const isOwn = msg.sender._id === currentUser.id || msg.sender.toString() === currentUser.id;
    const avatar = isOwn 
      ? (currentUser.avatar.startsWith('http') ? currentUser.avatar : `https://cdn.discordapp.com/avatars/${currentUser.discordId}/${currentUser.avatar}.png`)
      : (currentChatUser.avatar.startsWith('http') ? currentChatUser.avatar : `https://cdn.discordapp.com/avatars/${currentChatUser.discordId}/${currentChatUser.avatar}.png`);
    
    return `
      <div class="message-item ${isOwn ? 'own' : ''}">
        <img src="${avatar}" alt="Avatar" class="message-avatar" />
        <div class="message-content">
          <div class="message-text">${escapeHtml(msg.content)}</div>
          <div class="message-time">${getTimeAgo(new Date(msg.createdAt))}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // En alta scroll
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const content = messageInput.value.trim();
  
  if (!content) return;
  
  try {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientId: currentChatUser._id,
        content: content
      })
    });
    
    if (!response.ok) throw new Error('Failed to send message');
    
    const data = await response.json();
    messages.push(data.message);
    
    renderMessages();
    messageInput.value = '';
    
    // Konuşma listesini güncelle
    await loadConversations();
  } catch (error) {
    console.error('Send message error:', error);
    showToast('Mesaj gönderilemedi', 'error');
  }
}

// Utility functions
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Az önce';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'dk';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'sa';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'g';
  
  return date.toLocaleDateString('tr-TR');
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

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function showLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.remove('hidden');
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');
}
