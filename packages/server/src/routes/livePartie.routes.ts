import { Router, Request, Response } from 'express';
import { authenticate, requireGuildAdmin } from './guilds.routes';
import { livePartieService, ParticipantRole } from '../services/LivePartieService';

const router = Router({ mergeParams: true });

/**
 * Get current live partie session for a guild
 */
router.get('/:guildId/live-partie/session', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const session = livePartieService.getSession(guildId);
  return res.json(session);
});

/**
 * Select a voice channel to monitor
 */
router.post('/:guildId/live-partie/select-channel', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { channelId, channelName } = req.body;
  const session = livePartieService.selectVoiceChannel(guildId, channelId || null, channelName || null);
  return res.json(session);
});

/**
 * Pre-add a participant by Discord User ID ("After-Joiner")
 */
router.post('/:guildId/live-partie/add-after-joiner', authenticate, requireGuildAdmin, async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { userId, role } = req.body;

  if (!userId || typeof userId !== 'string' || !/^\d{17,20}$/.test(userId.trim())) {
    return res.status(400).json({ error: "L'identifiant Discord doit être un nombre de 17 à 20 chiffres." });
  }

  try {
    const session = await livePartieService.addAfterJoiner(guildId, userId.trim(), (role as ParticipantRole) || 'PLAYER');
    return res.json(session);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Remove participant or after-joiner
 */
router.post('/:guildId/live-partie/remove-participant', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const session = livePartieService.removeParticipant(guildId, userId);
  return res.json(session);
});

/**
 * Update participant role or manual number
 */
router.post('/:guildId/live-partie/update-participant', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { userId, role, number } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const session = livePartieService.updateParticipant(guildId, userId, { role, number });
  return res.json(session);
});

/**
  * Save participant updates in bulk (roles, numbers)
  */
router.post('/:guildId/live-partie/save-participants', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { participants } = req.body;

  if (!Array.isArray(participants)) {
    return res.status(400).json({ error: 'participants array is required' });
  }

  const session = livePartieService.saveParticipants(guildId, participants);
  return res.json(session);
});

/**
 * Automatically assign numbers (01, 02...) and 0000 to narrator(s)
 */
router.post('/:guildId/live-partie/auto-number', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const session = livePartieService.autoNumber(guildId);
  return res.json(session);
});

/**
 * Shuffle player numbers
 */
router.post('/:guildId/live-partie/randomize-numbers', authenticate, requireGuildAdmin, (req: Request, res: Response) => {
  const { guildId } = req.params;
  const session = livePartieService.randomizeNumbers(guildId);
  return res.json(session);
});

/**
 * Execute batch renames on Discord
 */
router.post('/:guildId/live-partie/apply-renames', authenticate, requireGuildAdmin, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  try {
    const result = await livePartieService.applyRenames(guildId);
    return res.json(result);
  } catch (err: any) {
    console.error('[LivePartie] Renaming failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Reset/restore original nicknames on Discord
 */
router.post('/:guildId/live-partie/reset-renames', authenticate, requireGuildAdmin, async (req: Request, res: Response) => {
  const { guildId } = req.params;

  try {
    const result = await livePartieService.resetRenames(guildId);
    return res.json(result);
  } catch (err: any) {
    console.error('[LivePartie] Reset renames failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
