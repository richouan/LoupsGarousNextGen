import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { isGuildAllowed, getAllowedGuildsDetails, getContactUser } from '../utils/allowedGuilds';

const router = Router();
const getClientId = () => process.env.DISCORD_CLIENT_ID || '';
const getClientSecret = () => process.env.DISCORD_CLIENT_SECRET || '';
const getRedirectUri = () =>
  process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const getJwtSecret = () => process.env.JWT_SECRET || 'loup-garou-secret-key-2026';

/**
 * Initiates the Discord OAuth2 authorization flow
 */
router.get('/discord', (_req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'identify email guilds'
  });
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  return res.redirect(discordAuthUrl);
});

/**
 * Handles the OAuth2 callback from Discord
 */
router.post('/callback', async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: getClientId(),
        client_secret: getClientSecret(),
        grant_type: 'authorization_code',
        code: code.toString(),
        redirect_uri: getRedirectUri()
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenResponse.data;

    // Fetch user profile from Discord API
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const superAdminList = (process.env.SUPER_ADMIN_IDS || '').split(',').map((id) => id.trim());
    const isSuperAdmin = superAdminList.includes(userResponse.data.id);

    const user = {
      id: userResponse.data.id,
      username: userResponse.data.username,
      avatar: userResponse.data.avatar
        ? `https://cdn.discordapp.com/avatars/${userResponse.data.id}/${userResponse.data.avatar}.png`
        : null,
      isSuperAdmin
    };

    // Fetch user guilds from Discord API
    const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const rawGuilds = guildsResponse.data;
    const ADMIN_BIT = BigInt(0x8); // 8 is Administrator in Discord bitwise permissions
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
      const isAllowed = isGuildAllowed(g.id);

      return {
        id: g.id,
        name: g.name,
        icon: iconUrl,
        hasBot,
        isAllowed,
        owner: true,
        isAdmin: true,
        inviteUrl: `https://discord.com/oauth2/authorize?client_id=${getClientId()}&permissions=8&scope=bot&guild_id=${g.id}&disable_guild_select=true`
      };
    });

    // Generate session JWT (stores minimal profile + id)
    const token = jwt.sign({ user, guilds }, getJwtSecret(), { expiresIn: '30d' });

    const allowedGuilds = await getAllowedGuildsDetails();
    const contactUser = getContactUser();

    return res.json({ token, user, guilds, allowedGuilds, contactUser });
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
        const isAllowed = isGuildAllowed(g.id);
        const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${getClientId()}&permissions=8&scope=bot&guild_id=${g.id}&disable_guild_select=true`;
        return {
          ...g,
          hasBot,
          isAllowed,
          inviteUrl
        };
      });

    const allowedGuilds = await getAllowedGuildsDetails();
    const contactUser = getContactUser();

    return res.json({ user: decoded.user, guilds: updatedGuilds, allowedGuilds, contactUser });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
