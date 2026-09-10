import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../db/prisma';

const router = Router();
const getClientId = () => process.env.DISCORD_CLIENT_ID || '';
const getClientSecret = () => process.env.DISCORD_CLIENT_SECRET || '';
const getRedirectUri = () => process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const getJwtSecret = () => process.env.JWT_SECRET || 'loup-garou-secret-key-v2';
const getSuperAdminIds = () => (process.env.SUPER_ADMIN_IDS || '').split(',').map((id) => id.trim());

/**
 * Initiates Discord OAuth2 Login
 */
router.get('/discord', (req: Request, res: Response) => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret) {
    return res.status(500).send('Discord OAuth credentials (CLIENT_ID / CLIENT_SECRET) are missing from backend .env configuration.');
  }

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20guilds`;

  return res.redirect(discordAuthUrl);
});

/**
 * Handles OAuth2 callback from Discord
 */
router.post('/callback', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code authorization required' });
  }

  try {
    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: getRedirectUri()
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenResponse.data;

    // Fetch user details
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    // Fetch user guilds
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    let rawUser = userRes.data;
    const rawGuilds: any[] = guildsRes.data || [];

    // Format user avatar
    const userAvatarUrl = rawUser.avatar
      ? `https://cdn.discordapp.com/avatars/${rawUser.id}/${rawUser.avatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${(BigInt(rawUser.id) >> 22n) % 6n}.png`;

    const user = {
      id: rawUser.id,
      username: rawUser.global_name || rawUser.username,
      discriminator: rawUser.discriminator,
      avatar: userAvatarUrl,
      isSuperAdmin: getSuperAdminIds().includes(rawUser.id)
    };

    // Filter guilds: owner OR has Administrator permission (bit 0x8)
    const ADMIN_BIT = BigInt(0x8);
    const filteredGuilds = rawGuilds.filter((g: any) => {
      if (g.owner === true) return true;
      try { return (BigInt(g.permissions || 0) & ADMIN_BIT) === ADMIN_BIT; } catch { return false; }
    });

    console.log(`[OAuth] Total servers: ${rawGuilds.length} | Owner+Admin servers: ${filteredGuilds.length}`);

    // Check which guilds have the bot installed (from DB Guild records)
    const existingDbGuilds = await prisma.guild.findMany({
      select: { id: true }
    });
    const botGuildIds = new Set(existingDbGuilds.map((g: any) => g.id));

    const guilds = filteredGuilds.map((g: any) => {
      const iconUrl = g.icon
        ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`
        : null;

      const hasBot = botGuildIds.has(g.id);

      return {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        hasBot,
        owner: true,
        isAdmin: true,
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${getClientId()}&permissions=8&scope=bot&guild_id=${g.id}&disable_guild_select=true`
      };
    });

    // Generate session JWT (stores minimal profile + id)
    const token = jwt.sign({ user, guilds }, getJwtSecret(), { expiresIn: '7d' });

    return res.json({ token, user, guilds });
  } catch (err: any) {
    console.error('OAuth Callback Error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to authenticate with Discord' });
  }
});

/**
 * Current user profile & guilds check
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    
    // Check which guilds currently have the bot installed in SQLite DB
    const existingDbGuilds = await prisma.guild.findMany({
      select: { id: true }
    });
    const botGuildIds = new Set(existingDbGuilds.map((g: any) => g.id));

    // Filter guilds: owner OR has Administrator permission
    const ADMIN_BIT2 = BigInt(0x8);
    const rawGuilds = decoded.guilds || [];
    const updatedGuilds = rawGuilds
      .filter((g: any) => {
        if (g.owner === true) return true;
        try { return (BigInt(g.permissions || 0) & ADMIN_BIT2) === ADMIN_BIT2; } catch { return false; }
      })
      .map((g: any) => {
        const hasBot = botGuildIds.has(g.id);
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${getClientId()}&permissions=8&scope=bot&guild_id=${g.id}&disable_guild_select=true`;
        return {
          ...g,
          hasBot,
          inviteUrl
        };
      });

    return res.json({ user: decoded.user, guilds: updatedGuilds });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
