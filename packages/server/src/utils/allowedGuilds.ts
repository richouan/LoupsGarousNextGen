import prisma from '../db/prisma';
import axios from 'axios';

export interface AllowedGuildRecord {
  id: string;
  name: string;
  icon: string | null;
  addedBy?: string | null;
  createdAt?: Date;
}

export interface SuperAdminRecord {
  id: string;
  username: string;
  avatar: string | null;
  addedBy?: string | null;
  createdAt?: Date;
}

export function getDevUserIds(): string[] {
  const envVar = process.env.DEV_USER_IDS || process.env.SUPER_ADMIN_IDS || '548893712806182932';
  return envVar
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isDevUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return getDevUserIds().includes(userId);
}

export function getContactUser(): string {
  return process.env.BOT_CONTACT_USER || 'ezreal';
}

export async function isSuperAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  if (isDevUser(userId)) return true;

  const found = await prisma.superAdmin.findUnique({
    where: { id: userId }
  });
  return !!found;
}

let cachedWhitelistEnabled: { value: boolean; cachedAt: number } | null = null;

export async function isWhitelistEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedWhitelistEnabled && now - cachedWhitelistEnabled.cachedAt < 5000) {
    return cachedWhitelistEnabled.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'whitelist_enabled' }
    });
    // Default to true (whitelist active) if not explicitly set to false
    const enabled = setting ? setting.value === 'true' : true;
    cachedWhitelistEnabled = { value: enabled, cachedAt: now };
    return enabled;
  } catch {
    return true;
  }
}

export async function setWhitelistEnabled(enabled: boolean): Promise<boolean> {
  await prisma.systemSetting.upsert({
    where: { key: 'whitelist_enabled' },
    update: { value: enabled ? 'true' : 'false' },
    create: { key: 'whitelist_enabled', value: enabled ? 'true' : 'false' }
  });
  cachedWhitelistEnabled = { value: enabled, cachedAt: Date.now() };
  return enabled;
}

export async function getAllowedGuildIds(): Promise<string[]> {
  const list = await prisma.allowedGuild.findMany({
    select: { id: true }
  });

  if (list.length === 0) {
    // Default fallback to Loup official server
    return ['1461119651021979710'];
  }

  return list.map((g: { id: string }) => g.id);
}

export async function isGuildAllowed(guildId: string | null | undefined): Promise<boolean> {
  if (!guildId || guildId === 'global') return true;

  const whitelistOn = await isWhitelistEnabled();
  if (!whitelistOn) {
    // Whitelist is disabled: all servers are allowed (public mode)
    return true;
  }

  const count = await prisma.allowedGuild.count();
  if (count === 0) {
    // If no allowed guilds are registered yet in DB, default to Loup
    return guildId === '1461119651021979710';
  }

  const found = await prisma.allowedGuild.findUnique({
    where: { id: guildId }
  });
  return !!found;
}

let cachedGuildsDetails: { data: AllowedGuildRecord[]; cachedAt: number } | null = null;

export async function getAllowedGuildsDetails(): Promise<AllowedGuildRecord[]> {
  const now = Date.now();
  if (cachedGuildsDetails && now - cachedGuildsDetails.cachedAt < 5000) {
    return cachedGuildsDetails.data;
  }

  let dbGuilds: any[] = await prisma.allowedGuild.findMany({
    orderBy: { createdAt: 'asc' }
  });

  // Seed default if completely empty
  if (dbGuilds.length === 0) {
    const defaultId = '1461119651021979710';
    try {
      const seeded = await prisma.allowedGuild.upsert({
        where: { id: defaultId },
        update: {
          name: 'Loup',
          icon: 'https://cdn.discordapp.com/icons/1461119651021979710/8f2d9c9c572cd209017602f221e40eb5.webp'
        },
        create: {
          id: defaultId,
          name: 'Loup',
          icon: 'https://cdn.discordapp.com/icons/1461119651021979710/8f2d9c9c572cd209017602f221e40eb5.webp',
          addedBy: 'SYSTEM'
        }
      });
      dbGuilds = [seeded];
    } catch {
      dbGuilds = [{
        id: defaultId,
        name: 'Loup',
        icon: 'https://cdn.discordapp.com/icons/1461119651021979710/8f2d9c9c572cd209017602f221e40eb5.webp'
      }];
    }
  }

  const result: AllowedGuildRecord[] = [];
  for (const g of dbGuilds) {
    let name = String(g.name);
    let icon = g.icon ? String(g.icon) : null;

    // If name is a placeholder or icon is missing, try to resolve from prisma.guild or Discord API
    if (!icon || name.startsWith('Serveur ')) {
      try {
        const match = await prisma.guild.findUnique({ where: { id: String(g.id) } });
        if (match && match.name && !match.name.startsWith('Serveur ')) {
          name = match.name;
          icon = match.icon || icon;
          await prisma.allowedGuild.update({
            where: { id: String(g.id) },
            data: { name, icon }
          }).catch(() => {});
        } else {
          const fetched = await fetchDiscordGuildInfo(String(g.id));
          if (fetched && fetched.name && !fetched.name.startsWith('Serveur ')) {
            name = fetched.name;
            icon = fetched.icon || icon;
            await prisma.allowedGuild.update({
              where: { id: String(g.id) },
              data: { name, icon }
            }).catch(() => {});
          }
        }
      } catch {}
    }

    result.push({
      id: String(g.id),
      name,
      icon,
      addedBy: g.addedBy ? String(g.addedBy) : null,
      createdAt: g.createdAt
    });
  }

  cachedGuildsDetails = { data: result, cachedAt: now };
  return result;
}

export function invalidateAllowedGuildsCache(): void {
  cachedGuildsDetails = null;
}

export async function fetchDiscordGuildInfo(guildId: string): Promise<{ name: string; icon: string | null }> {
  // 1. Check if prisma.guild already has the details
  try {
    const dbGuild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (dbGuild && dbGuild.name && !dbGuild.name.startsWith('Serveur ')) {
      return { name: dbGuild.name, icon: dbGuild.icon };
    }
  } catch {}

  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { name: `Serveur ${guildId}`, icon: null };
  }

  // 2. Query Discord API v10
  try {
    const res = await axios.get(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      timeout: 4000
    });
    const g = res.data;
    const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : null;
    return { name: g.name, icon: iconUrl };
  } catch (err: any) {
    console.warn(`[fetchDiscordGuildInfo] Could not fetch guild ${guildId} from Discord API:`, err.message);
    return { name: `Serveur ${guildId}`, icon: null };
  }
}

export async function fetchDiscordUserInfo(userId: string): Promise<{ username: string; avatar: string | null }> {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    return { username: `User ${userId}`, avatar: null };
  }

  try {
    const res = await axios.get(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${botToken}` },
      timeout: 4000
    });
    const u = res.data;
    const avatarUrl = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : null;
    return {
      username: u.global_name || u.username || `User ${userId}`,
      avatar: avatarUrl
    };
  } catch (err: any) {
    console.warn(`[fetchDiscordUserInfo] Could not fetch user ${userId} directly:`, err.message);
    return { username: `User ${userId}`, avatar: null };
  }
}
