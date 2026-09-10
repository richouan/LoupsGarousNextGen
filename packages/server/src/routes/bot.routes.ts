import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';

const router = Router();

/**
 * Fast endpoint used by Discord Bot to retrieve cached settings & cards
 */
router.get('/guild-config/:guildId', async (req: Request, res: Response) => {
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
router.post('/sync-guilds', async (req: Request, res: Response) => {
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
router.get('/default-config', async (_req: Request, res: Response) => {
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
