import { Client } from 'discord.js';

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
  if (!guildId) return true; // DMs are handled separately if needed
  const allowed = getAllowedGuildIds();
  return allowed.includes(guildId);
}

export function getResolvedAllowedGuilds(
  client?: Client
): Array<{ id: string; name: string; icon: string | null }> {
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
    // Fallback: Loup default or numbered server
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
