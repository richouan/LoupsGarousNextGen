import axios from 'axios';

export const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to retrieve auth token from localStorage or persistent cookie
export function getSavedToken(): string | null {
  try {
    const local = localStorage.getItem('lg_auth_token');
    if (local) return local;

    // Fallback: persistent cookie
    const match = document.cookie.match(/(?:^|;\s*)lg_auth_token=([^;]+)/);
    if (match && match[1]) {
      const val = decodeURIComponent(match[1]);
      try { localStorage.setItem('lg_auth_token', val); } catch {}
      return val;
    }
  } catch {}
  return null;
}

// Helper to save auth token across both localStorage and 30-day cookie
export function saveSavedToken(token: string) {
  try {
    localStorage.setItem('lg_auth_token', token);
  } catch {}

  try {
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const isSecure = window.location.protocol === 'https:';
    const isCustomDomain = window.location.hostname.includes('loupgarou.online');
    const domainPart = isCustomDomain ? '; domain=.loupgarou.online' : '';
    document.cookie = `lg_auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}${domainPart}`;
  } catch {}
}

// Helper to wipe auth token from all storages
export function clearSavedToken() {
  try {
    localStorage.removeItem('lg_auth_token');
  } catch {}

  try {
    const isCustomDomain = window.location.hostname.includes('loupgarou.online');
    const domainPart = isCustomDomain ? '; domain=.loupgarou.online' : '';
    document.cookie = `lg_auth_token=; path=/; max-age=0; SameSite=Lax${domainPart}`;
    document.cookie = `lg_auth_token=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

// Attach JWT token from localStorage or cookie to all requests
api.interceptors.request.use((config) => {
  const token = getSavedToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

