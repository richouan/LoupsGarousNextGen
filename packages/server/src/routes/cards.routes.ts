import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import { authenticate } from './guilds.routes';
import { requireSuperAdmin } from '../middleware/rbac';

const router = Router();

/**
 * Get all global official cards.
 * We can reuse this in the dashboard to fetch cards globally instead of per-guild.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const cards = await prisma.card.findMany({
    where: { guildId: null },
    orderBy: { name: 'asc' }
  });

  const parsed = cards.map((c) => ({
    ...c,
    isCustom: false
  }));

  return res.json(parsed);
});

/**
 * Super Admin: Create a new global card
 */
router.post('/', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { name, camp, description, shortDescription, imageUrl, isUnique, abilityType, difficulty, replyMode } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required' });
  }

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const newCard = await prisma.card.create({
    data: {
      guildId: null, // Always global
      name,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      camp: camp || 'VILLAGEOIS',
      description,
      shortDescription: shortDescription || null,
      imageUrl: imageUrl || null,
      isUnique: isUnique ?? true,
      abilityType: abilityType || 'NIGHT',
      difficulty: difficulty ? parseInt(difficulty) : 1,
      replyMode: replyMode || null,
      isEnabled: true
    }
  });

  return res.status(201).json({
    ...newCard,
    isCustom: false
  });
});

/**
 * Super Admin: Update a global card
 */
router.put('/:cardId', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { cardId } = req.params;
  const { name, camp, description, shortDescription, imageUrl, isUnique, abilityType, difficulty, replyMode, isEnabled } = req.body;

  const existing = await prisma.card.findUnique({
    where: { id: cardId }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const updated = await prisma.card.update({
    where: { id: cardId },
    data: {
      name: name ?? existing.name,
      camp: camp ?? existing.camp,
      description: description ?? existing.description,
      shortDescription: shortDescription !== undefined ? shortDescription : existing.shortDescription,
      imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
      isUnique: isUnique !== undefined ? isUnique : existing.isUnique,
      abilityType: abilityType ?? existing.abilityType,
      difficulty: difficulty !== undefined ? parseInt(difficulty) : existing.difficulty,
      replyMode: replyMode !== undefined ? replyMode : existing.replyMode,
      isEnabled: isEnabled !== undefined ? isEnabled : existing.isEnabled
    }
  });

  return res.json({
    ...updated,
    isCustom: false
  });
});

/**
 * Super Admin: Delete a global card
 */
router.delete('/:cardId', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { cardId } = req.params;

  const existing = await prisma.card.findUnique({
    where: { id: cardId }
  });

  if (!existing) {
    return res.status(404).json({ error: 'Card not found' });
  }

  await prisma.card.delete({
    where: { id: cardId }
  });

  return res.json({ success: true, message: 'Card deleted successfully' });
});

export default router;
