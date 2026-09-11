import axios from 'axios';

export const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Helper to retrieve auth token from localStorage, sessionStorage, or persistent cookie
export function getSavedToken(): string | null {
  try {
    const local = localStorage.getItem('lg_auth_token');
    if (local && local.trim()) return local.trim();
  } catch {}

  try {
    const session = sessionStorage.getItem('lg_auth_token');
    if (session && session.trim()) {
      try { localStorage.setItem('lg_auth_token', session.trim()); } catch {}
      return session.trim();
    }
  } catch {}

  try {
    // Fallback: persistent cookie
    const match = document.cookie.match(/(?:^|;\s*)lg_auth_token=([^;]+)/);
    if (match && match[1]) {
      const val = decodeURIComponent(match[1]).trim();
      if (val) {
        try { localStorage.setItem('lg_auth_token', val); } catch {}
        try { sessionStorage.setItem('lg_auth_token', val); } catch {}
        return val;
      }
    }
  } catch {}

  return null;
}

// Helper to save auth token across localStorage, sessionStorage, and 30-day cookie
export function saveSavedToken(token: string) {
  if (!token) return;
  const clean = token.trim();

  try {
    localStorage.setItem('lg_auth_token', clean);
  } catch {}

  try {
    sessionStorage.setItem('lg_auth_token', clean);
  } catch {}

  try {
    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    const isSecure = window.location.protocol === 'https:';

    // 1. Host-level cookie (always works on mobile Safari/Chrome)
    document.cookie = `lg_auth_token=${encodeURIComponent(clean)}; path=/; max-age=${maxAge}; expires=${expires}; SameSite=Lax${isSecure ? '; Secure' : ''}`;

    // 2. Domain-level cookie if on custom domain
    if (window.location.hostname.includes('loupgarou.online')) {
      document.cookie = `lg_auth_token=${encodeURIComponent(clean)}; path=/; domain=.loupgarou.online; max-age=${maxAge}; expires=${expires}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    }
  } catch {}
}

// Helper to wipe auth token from all storages
export function clearSavedToken() {
  try {
    localStorage.removeItem('lg_auth_token');
  } catch {}

  try {
    sessionStorage.removeItem('lg_auth_token');
  } catch {}

  try {
    document.cookie = 'lg_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    if (window.location.hostname.includes('loupgarou.online')) {
      document.cookie = 'lg_auth_token=; path=/; domain=.loupgarou.online; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
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

