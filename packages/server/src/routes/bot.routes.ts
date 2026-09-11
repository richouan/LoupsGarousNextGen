import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';
import {
  getAllowedGuildIds,
  getAllowedGuildsDetails,
  getContactUser,
  fetchDiscordGuildInfo,
  fetchDiscordUserInfo,
  getDevUserIds,
  isWhitelistEnabled,
  setWhitelistEnabled
} from '../utils/allowedGuilds';
import { authenticate } from './guilds.routes';
import { requireDev } from '../middleware/rbac';

const router = Router();

/**
 * SEC-02 FIX: Require internal bot secret authentication.
 * Protects server-to-bot endpoints against unauthorized external requests.
 */
export function requireBotAuth(req: Request, res: Response, next: NextFunction) {
  const secretHeader = req.headers['x-bot-secret'] || req.headers['authorization'];
  const expectedSecret = process.env.INTERNAL_BOT_SECRET || process.env.DISCORD_BOT_TOKEN;

  if (!expectedSecret) {
    console.warn('[Security Warning] No INTERNAL_BOT_SECRET or DISCORD_BOT_TOKEN configured on server');
    return res.status(500).json({ error: 'Server misconfiguration: Bot authentication secret missing' });
  }

  const token = typeof secretHeader === 'string' && secretHeader.startsWith('Bearer ')
    ? secretHeader.slice(7).trim()
    : typeof secretHeader === 'string' && secretHeader.startsWith('Bot ')
    ? secretHeader.slice(4).trim()
    : secretHeader;

  if (!token || token !== expectedSecret) {
    return res.status(403).json({ error: 'Forbidden: Invalid or missing bot authentication secret' });
  }

  return next();
}

/**
 * Public endpoint to retrieve allowed servers and development contact info
 */
router.get('/allowed-guilds', async (_req: Request, res: Response) => {
  try {
    const whitelistActive = await isWhitelistEnabled();
    const allowedGuildIds = await getAllowedGuildIds();
    const allowedGuilds = await getAllowedGuildsDetails();
    const contactUser = getContactUser();

    return res.json({
      isWhitelistEnabled: whitelistActive,
      allowedGuildIds,
      allowedGuilds,
      contactUser,
      status: 'under_development'
    });
  } catch (err: any) {
    console.error('[bot.routes] Failed to get allowed guilds:', err);
    return res.status(500).json({ error: 'Failed to retrieve allowed guilds' });
  }
});

/**
 * Dev Only: Retrieve all allowed servers and super admins for the Bot Settings tab
 */
router.get('/admin-settings', authenticate, requireDev, async (_req: Request, res: Response) => {
  try {
    const whitelistActive = await isWhitelistEnabled();
    const allowedGuilds = await getAllowedGuildsDetails();
    const superAdmins = await prisma.superAdmin.findMany({ orderBy: { createdAt: 'asc' } });
    const devIds = getDevUserIds();

    return res.json({
      isWhitelistEnabled: whitelistActive,
      allowedGuilds,
      superAdmins,
      devIds
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Dev Only: Toggle Whitelist Mode (Trusted Servers vs Public)
 */
router.post('/whitelist-toggle', authenticate, requireDev, async (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'enabled boolean field is required' });
  }

  try {
    const updated = await setWhitelistEnabled(enabled);
    return res.json({ success: true, isWhitelistEnabled: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Dev Only: Add an allowed server by Discord Guild ID
 */
router.post('/allowed-guilds', authenticate, requireDev, async (req: Request, res: Response) => {
  const { guildId } = req.body;
  if (!guildId || typeof guildId !== 'string') {
    return res.status(400).json({ error: 'guildId is required' });
  }

  const cleanId = guildId.trim();
  const user = (req as any).user;

  try {
    // Fetch Discord info (name and photo)
    const { name, icon } = await fetchDiscordGuildInfo(cleanId);

    const guild = await prisma.allowedGuild.upsert({
      where: { id: cleanId },
      update: { name, icon },
      create: {
        id: cleanId,
        name,
        icon,
        addedBy: user?.username || 'DEV'
      }
    });

    return res.json({ success: true, guild });
  } catch (err: any) {
    console.error('Failed to add allowed guild:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Dev Only: Delete an allowed server by Discord Guild ID
 */
router.delete('/allowed-guilds/:guildId', authenticate, requireDev, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  try {
    await prisma.allowedGuild.delete({
      where: { id: guildId }
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Dev Only: Add a Super Admin by Discord User ID
 */
router.post('/super-admins', authenticate, requireDev, async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  const cleanId = userId.trim();
  const devUser = (req as any).user;

  try {
    // Fetch Discord user info (username and avatar photo)
    const { username, avatar } = await fetchDiscordUserInfo(cleanId);

    const superAdmin = await prisma.superAdmin.upsert({
      where: { id: cleanId },
      update: { username, avatar },
      create: {
        id: cleanId,
        username,
        avatar,
        addedBy: devUser?.username || 'DEV'
      }
    });

    return res.json({ success: true, superAdmin });
  } catch (err: any) {
    console.error('Failed to add super admin:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Dev Only: Delete a Super Admin by Discord User ID
 */
router.delete('/super-admins/:userId', authenticate, requireDev, async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    await prisma.superAdmin.delete({
      where: { id: userId }
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Fast endpoint used by Discord Bot to retrieve cached settings & cards
 */
router.get('/guild-config/:guildId', requireBotAuth, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  try {
    const setting = await prisma.guildSetting.findUnique({
      where: { guildId }
    });

    const cards = await prisma.card.findMany({
      where: {
        OR: [{ guildId: null }, { guildId }],
        isEnabled: true
      }
    });

    const parsedCards = cards;

    const parsedSettings = setting
      ? {
          ...setting,
          allowedChannelIds: JSON.parse(setting.allowedChannelIds || '[]'),
          allowedCategoryIds: JSON.parse(setting.allowedCategoryIds || '[]'),
          ignoredChannelIds: JSON.parse(setting.ignoredChannelIds || '[]')
        }
      : {
          guildId,
          prefix: '!',
          autoReplyEnabled: true,
          defaultReplyMode: 'BOTH',
          deliveryMethod: 'PUBLIC',
          allowedChannelIds: [],
          allowedCategoryIds: [],
          ignoredChannelIds: [],
          userCooldownSeconds: 3,
          channelCooldownSeconds: 1,
          autoDeleteSeconds: 0,
          allowDms: true
        };

    return res.json({
      settings: parsedSettings,
      cards: parsedCards
    });
  } catch (err: any) {
    console.error(`[bot-routes] Failed to get config for guild ${guildId}:`, err);
    return res.status(500).json({ error: 'Failed to retrieve config' });
  }
});

/**
 * Sync active guilds from bot to backend database
 */
router.post('/sync-guilds', requireBotAuth, async (req: Request, res: Response) => {
  const { guilds } = req.body;
  if (!Array.isArray(guilds)) {
    return res.status(400).json({ error: 'guilds must be an array' });
  }

  try {
    for (const g of guilds) {
      await prisma.guild.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          icon: g.icon
        },
        create: {
          id: g.id,
          name: g.name,
          icon: g.icon
        }
      });
    }
    return res.json({ success: true, count: guilds.length });
  } catch (err: any) {
    console.error('Failed to sync bot guilds:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Default configuration for direct messages (DMs)
 */
router.get('/default-config', requireBotAuth, async (_req: Request, res: Response) => {
  try {
    const cards = await prisma.card.findMany({
      where: { guildId: null, isEnabled: true }
    });

    return res.json({
      settings: {
        autoReplyEnabled: true,
        defaultReplyMode: 'BOTH',
        deliveryMethod: 'DM',
        allowedChannelIds: [],
        allowedCategoryIds: [],
        ignoredChannelIds: [],
        userCooldownSeconds: 3,
        channelCooldownSeconds: 1,
        autoDeleteSeconds: 0,
        allowDms: true
      },
      cards: cards
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Get card by ID
 */
router.get('/card/:cardId', async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const card = await prisma.card.findUnique({
    where: { id: cardId }
  });

  if (!card) return res.status(404).json({ error: 'Card not found' });
  return res.json(card);
});

/**
 * Live Simulator Endpoint for Dashboard
 * Simulates how the bot would handle a chat message
 */
router.post('/simulate-reply', async (req: Request, res: Response) => {
  const { guildId, channelId, categoryId, messageContent, userId } = req.body;

  if (!messageContent) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  // 1. Fetch settings and cards
  let setting = await prisma.guildSetting.findUnique({ where: { guildId } });
  const cards = await prisma.card.findMany({
    where: {
      OR: [{ guildId: null }, { guildId }],
      isEnabled: true
    }
  });

  const parsedSetting = setting
    ? {
        ...setting,
        allowedChannelIds: JSON.parse(setting.allowedChannelIds || '[]'),
        allowedCategoryIds: JSON.parse(setting.allowedCategoryIds || '[]'),
        ignoredChannelIds: JSON.parse(setting.ignoredChannelIds || '[]')
      }
    : {
        autoReplyEnabled: true,
        defaultReplyMode: 'BOTH',
        deliveryMethod: 'PUBLIC',
        allowedChannelIds: [],
        allowedCategoryIds: [],
        ignoredChannelIds: [],
        userCooldownSeconds: 3,
        channelCooldownSeconds: 1,
        autoDeleteSeconds: 0,
        allowDms: true
      };

  // 2. Channel & Category Check
  const ignored = parsedSetting.ignoredChannelIds.includes(channelId);
  const hasChanAllow = parsedSetting.allowedChannelIds.length > 0;
  const hasCatAllow = parsedSetting.allowedCategoryIds.length > 0;

  let channelAllowed = !ignored;
  if (channelAllowed && (hasChanAllow || hasCatAllow)) {
    channelAllowed =
      (hasChanAllow && parsedSetting.allowedChannelIds.includes(channelId)) ||
      (hasCatAllow && categoryId && parsedSetting.allowedCategoryIds.includes(categoryId));
  }

  if (!parsedSetting.autoReplyEnabled) {
    return res.json({
      matched: false,
      reason: 'Auto-reply is globally disabled for this server.',
      status: 'DISABLED'
    });
  }

  if (!channelAllowed) {
    return res.json({
      matched: false,
      reason: `Channel #${channelId} is filtered out by server channel rules.`,
      status: 'FILTERED_OUT'
    });
  }

  // 3. Normalize & match
  const normalize = (t: string) =>
    t
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^[\s.,!?;:*_~`'"-]+|[\s.,!?;:*_~`'"-]+$/g, '')
      .replace(/\s+/g, ' ');

  const inputNormalized = normalize(messageContent);
  let matchedCard: any = null;

  for (const card of cards) {
    if (
      normalize(card.name) === inputNormalized ||
      normalize(card.slug) === inputNormalized
    ) {
      matchedCard = { ...card };
      break;
    }
  }

  if (!matchedCard) {
    return res.json({
      matched: false,
      reason: `Message "${messageContent}" does not match any role card or alias. (Bot only auto-replies when the message is solely a role name).`,
      status: 'NO_MATCH'
    });
  }

  // 4. Return successful simulation details
  const mode = matchedCard.replyMode || parsedSetting.defaultReplyMode || 'BOTH';
  const delivery = parsedSetting.deliveryMethod || 'PUBLIC';

  return res.json({
    matched: true,
    status: 'TRIGGERED',
    matchedCard,
    mode,
    delivery,
    autoDeleteSeconds: parsedSetting.autoDeleteSeconds,
    reason: `Bot successfully triggered card "${matchedCard.name}"!`
  });
});

export default router;
