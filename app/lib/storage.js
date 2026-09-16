// Helper penyimpanan riwayat chat di localStorage (tanpa backend).
const CHATS_KEY = 'pa-chats-v1';
const THEME_KEY = 'pa-theme';

export function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(chats) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // abaikan (mis. mode privat / kuota penuh)
  }
}

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // abaikan
  }
}

export function createChat() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    title: 'Chat baru',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
