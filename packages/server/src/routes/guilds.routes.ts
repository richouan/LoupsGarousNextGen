import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import prisma from '../db/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'loup-garou-secret-key-2026';
const getBotToken = () => process.env.DISCORD_BOT_TOKEN || '';

// Authentication Middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded.user;
    (req as any).guilds = decoded.guilds;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Get channels & categories for a guild directly from Discord API
 */
router.get('/:guildId/channels', authenticate, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const botToken = getBotToken();

  if (guildId === 'global') {
    return res.json([]);
  }

  if (!botToken) {
    console.warn('[Guilds] No DISCORD_BOT_TOKEN provided, returning empty channel list');
    return res.json([]);
  }

  try {
    const discordRes = await axios.get(`https://discord.com/api/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    const rawChannels: any[] = discordRes.data;
    console.log(`[Guilds] Fetched ${rawChannels.length} raw channels for guild ${guildId}`);

    // Filter to text channels (0), announcement channels (5), voice channels (2), and categories (4)
    // Map them cleanly for the narrator dashboard
    const formattedChannels = rawChannels
      .filter((c: any) => [0, 2, 4, 5].includes(c.type))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent_id || null,
        position: c.position
      }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    console.log(`[Guilds] Formatted ${formattedChannels.length} channels for dashboard.`);
    return res.json(formattedChannels);
  } catch (err: any) {
    console.error(`[Guilds] Error fetching live channels for guild ${guildId}:`, err.response?.status, err.response?.data || err.message);
    return res.json([]);
  }
});

/**
 * Get guild settings
 */
router.get('/:guildId/settings', authenticate, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  let setting = await prisma.guildSetting.findUnique({
    where: { guildId }
  });

  if (!setting) {
    // Ensure guild exists first
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        name: `Serveur ${guildId}`
      }
    });

    setting = await prisma.guildSetting.create({
      data: {
        guildId,
        prefix: '!',
        autoReplyEnabled: true,
        defaultReplyMode: 'BOTH',
        deliveryMethod: 'PUBLIC',
        allowedChannelIds: JSON.stringify(['chan-101', 'chan-202']),
        allowedCategoryIds: JSON.stringify(['cat-1']),
        ignoredChannelIds: JSON.stringify(['chan-203']),
        userCooldownSeconds: 3,
        channelCooldownSeconds: 1,
        autoDeleteSeconds: 0,
        allowDms: true
      }
    });
  }

  return res.json({
    ...setting,
    allowedChannelIds: JSON.parse(setting.allowedChannelIds || '[]'),
    allowedCategoryIds: JSON.parse(setting.allowedCategoryIds || '[]'),
    ignoredChannelIds: JSON.parse(setting.ignoredChannelIds || '[]')
  });
});

/**
 * Update guild settings
 */
router.put('/:guildId/settings', authenticate, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const {
    prefix,
    autoReplyEnabled,
    defaultReplyMode,
    deliveryMethod,
    allowedChannelIds,
    allowedCategoryIds,
    ignoredChannelIds,
    userCooldownSeconds,
    channelCooldownSeconds,
    autoDeleteSeconds,
    allowDms
  } = req.body;

  // Ensure parent guild exists first
  await prisma.guild.upsert({
    where: { id: guildId },
    update: {},
    create: {
      id: guildId,
      name: `Serveur ${guildId}`
    }
  });

  const updated = await prisma.guildSetting.upsert({
    where: { guildId },
    update: {
      prefix: prefix ?? '!',
      autoReplyEnabled: autoReplyEnabled ?? true,
      defaultReplyMode: defaultReplyMode ?? 'BOTH',
      deliveryMethod: deliveryMethod ?? 'PUBLIC',
      allowedChannelIds: JSON.stringify(allowedChannelIds ?? []),
      allowedCategoryIds: JSON.stringify(allowedCategoryIds ?? []),
      ignoredChannelIds: JSON.stringify(ignoredChannelIds ?? []),
      userCooldownSeconds: Number(userCooldownSeconds) || 3,
      channelCooldownSeconds: Number(channelCooldownSeconds) || 1,
      autoDeleteSeconds: Number(autoDeleteSeconds) || 0,
      allowDms: allowDms ?? true
    },
    create: {
      guildId,
      prefix: prefix ?? '!',
      autoReplyEnabled: autoReplyEnabled ?? true,
      defaultReplyMode: defaultReplyMode ?? 'BOTH',
      deliveryMethod: deliveryMethod ?? 'PUBLIC',
      allowedChannelIds: JSON.stringify(allowedChannelIds ?? []),
      allowedCategoryIds: JSON.stringify(allowedCategoryIds ?? []),
      ignoredChannelIds: JSON.stringify(ignoredChannelIds ?? []),
      userCooldownSeconds: Number(userCooldownSeconds) || 3,
      channelCooldownSeconds: Number(channelCooldownSeconds) || 1,
      autoDeleteSeconds: Number(autoDeleteSeconds) || 0,
      allowDms: allowDms ?? true
    }
  });

  return res.json({
    ...updated,
    allowedChannelIds: JSON.parse(updated.allowedChannelIds || '[]'),
    allowedCategoryIds: JSON.parse(updated.allowedCategoryIds || '[]'),
    ignoredChannelIds: JSON.parse(updated.ignoredChannelIds || '[]')
  });
});

/**
 * Get all cards for a guild (Official + Custom)
 */
router.get('/:guildId/cards', authenticate, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  const cards = await prisma.card.findMany({
    where: {
      OR: [{ guildId: null }, { guildId }]
    },
    orderBy: { name: 'asc' }
  });

  const parsed = cards.map((c) => ({
    ...c,
    isCustom: c.guildId !== null
  }));

  return res.json(parsed);
});



export default router;
