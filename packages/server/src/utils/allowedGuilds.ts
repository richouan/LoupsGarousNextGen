import prisma from '../db/prisma';
import axios from 'axios';

export function getAllowedGuildIds(): string[] {
  const envVar = process.env.ALLOWED_GUILD_IDS || '1461119651021979710';
  return envVar
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getContactUser(): string {
  return process.env.BOT_CONTACT_USER || 'ezreal';
}

export function isGuildAllowed(guildId: string | null | undefined): boolean {
  if (!guildId || guildId === 'global') return true;
  const allowed = getAllowedGuildIds();
  return allowed.includes(guildId);
}

let cachedGuildsDetails: { data: Array<{ id: string; name: string; icon: string | null }>; cachedAt: number } | null = null;

export async function getAllowedGuildsDetails(): Promise<Array<{ id: string; name: string; icon: string | null }>> {
  const now = Date.now();
  if (cachedGuildsDetails && now - cachedGuildsDetails.cachedAt < 30000) {
    return cachedGuildsDetails.data;
  }

  const ids = getAllowedGuildIds();
  const dbGuilds = await prisma.guild.findMany({
    where: { id: { in: ids } }
  });

  const dbMap = new Map(dbGuilds.map((g) => [g.id, g]));
  const botToken = process.env.DISCORD_BOT_TOKEN;

  const result: Array<{ id: string; name: string; icon: string | null }> = [];

  for (const id of ids) {
    const existing = dbMap.get(id);
    if (existing && existing.name && existing.icon) {
      result.push({
        id: existing.id,
        name: existing.name,
        icon: existing.icon
      });
      continue;
    }

    // Try fetching from Discord API if missing or incomplete
    if (botToken) {
      try {
        const res = await axios.get(`https://discord.com/api/guilds/${id}`, {
          headers: { Authorization: `Bot ${botToken}` },
          timeout: 3000
        });
        const g = res.data;
        const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=256` : null;

        await prisma.guild.upsert({
          where: { id },
          update: { name: g.name, icon: iconUrl },
          create: { id, name: g.name, icon: iconUrl }
        });

        result.push({
          id,
          name: g.name,
          icon: iconUrl
        });
        continue;
      } catch {
        // Fallback below
      }
    }

    result.push({
      id,
      name: existing?.name || `Serveur Officiel (${id})`,
      icon: existing?.icon || null
    });
  }

  cachedGuildsDetails = { data: result, cachedAt: now };
  return result;
}
