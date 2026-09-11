import { Client } from 'discord.js';
import axios from 'axios';

const API_BASE_URL = process.env.SERVER_API_URL || 'http://localhost:3001/api';

interface CachedAllowedGuilds {
  isWhitelistEnabled: boolean;
  allowedGuildIds: string[];
  allowedGuilds: Array<{ id: string; name: string; icon: string | null }>;
  contactUser: string;
  cachedAt: number;
}

let cache: CachedAllowedGuilds | null = null;

export async function syncAllowedGuildsFromBackend(): Promise<CachedAllowedGuilds> {
  const now = Date.now();
  if (cache && now - cache.cachedAt < 5000) {
    return cache;
  }

  try {
    const res = await axios.get(`${API_BASE_URL}/bot/allowed-guilds`, { timeout: 3000 });
    cache = {
      isWhitelistEnabled: res.data.isWhitelistEnabled !== false,
      allowedGuildIds: res.data.allowedGuildIds || ['1461119651021979710'],
      allowedGuilds: res.data.allowedGuilds || [],
      contactUser: res.data.contactUser || 'ezreal',
      cachedAt: now
    };
    return cache;
  } catch (err: any) {
    const envIds = (process.env.ALLOWED_GUILD_IDS || '1461119651021979710')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const fallback: CachedAllowedGuilds = {
      isWhitelistEnabled: true,
      allowedGuildIds: envIds,
      allowedGuilds: [
        {
          id: '1461119651021979710',
          name: 'Loup',
          icon: 'https://cdn.discordapp.com/icons/1461119651021979710/8f2d9c9c572cd209017602f221e40eb5.webp'
        }
      ],
      contactUser: process.env.BOT_CONTACT_USER || 'ezreal',
      cachedAt: now
    };
    cache = fallback;
    return fallback;
  }
}

export function getAllowedGuildIds(): string[] {
  if (cache) return cache.allowedGuildIds;
  return (process.env.ALLOWED_GUILD_IDS || '1461119651021979710')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getContactUser(): string {
  if (cache) return cache.contactUser;
  return process.env.BOT_CONTACT_USER || 'ezreal';
}

export function isGuildAllowed(guildId: string | null | undefined): boolean {
  if (!guildId) return true;
  // Trigger background refresh if stale
  syncAllowedGuildsFromBackend().catch(() => {});
  if (cache && cache.isWhitelistEnabled === false) {
    return true; // Whitelist mode disabled: public access
  }
  return getAllowedGuildIds().includes(guildId);
}

export function getResolvedAllowedGuilds(
  client?: Client
): Array<{ id: string; name: string; icon: string | null }> {
  if (cache && cache.allowedGuilds && cache.allowedGuilds.length > 0) {
    return cache.allowedGuilds.map((g) => {
      const live = client?.guilds.cache.get(g.id);
      return {
        id: g.id,
        name: live?.name || g.name,
        icon: live?.iconURL({ size: 256 }) || g.icon
      };
    });
  }

  const ids = getAllowedGuildIds();
  return ids.map((id, index) => {
    const guild = client?.guilds.cache.get(id);
    if (guild) {
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ size: 256 }) || null
      };
    }
    if (id === '1461119651021979710') {
      return {
        id,
        name: 'Loup',
        icon: 'https://cdn.discordapp.com/icons/1461119651021979710/8f2d9c9c572cd209017602f221e40eb5.webp'
      };
    }
    return {
      id,
      name: `Serveur Partenaire ${index + 1}`,
      icon: null
    };
  });
}
