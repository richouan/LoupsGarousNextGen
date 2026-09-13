import axios from 'axios';

export type ParticipantRole = 'PLAYER' | 'NARRATOR' | 'SPECTATOR';
export type RenameStatus = 'IDLE' | 'PENDING' | 'SUCCESS' | 'SKIPPED_HIERARCHY' | 'ERROR';

export interface LiveParticipant {
  id: string; // Discord user ID
  username: string; // Global Discord username
  displayName: string; // Server display name / nick
  avatar: string | null;
  role: ParticipantRole;
  number: number | null; // e.g. 1, 2, 3... or 0 for narrator
  targetNick: string; // e.g. "01 (Ezreal)" or "0000 (Adil)"
  originalNick: string; // Original nickname before game
  isInVoice: boolean;
  isMute: boolean;
  isDeaf: boolean;
  isAfterJoiner: boolean; // Pre-added before joining voice
  renameStatus: RenameStatus;
  renameError?: string;
}

export interface LivePartieSession {
  guildId: string;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  participants: LiveParticipant[];
  lastUpdated: number;
  isRenamingInProgress: boolean;
  renameProgress?: { current: number; total: number };
}

/**
 * Strips previous game prefixes like "01 (Name)", "01 Name", "0000 (Name)", "[Spec] Name"
 */
export function cleanOldName(name: string): string {
  if (!name) return '';
  let cleaned = name.trim();
  // Strip leading numbers e.g. "0000 (Adil)" -> "Adil", "01 (Ezreal)" -> "Ezreal"
  cleaned = cleaned.replace(/^(\d{1,4}|\(\d{1,4}\))\s*[\(-]?\s*/, '');
  cleaned = cleaned.replace(/\s*\)$/, '');
  // Strip [Spec], [MJ], [Joueur]
  cleaned = cleaned.replace(/^\[(Spec|MJ|Narrateur|Joueur)\]\s*/i, '');
  return cleaned.trim() || name.trim();
}

/**
 * Computes target nickname respecting Discord's 32-character maximum
 */
export function computeTargetNickname(cleanName: string, role: ParticipantRole, num: number | null): string {
  if (role === 'NARRATOR') {
    const prefix = '0000 (';
    const suffix = ')';
    const maxNameLen = 32 - (prefix.length + suffix.length);
    const safeName = cleanName.length > maxNameLen ? cleanName.slice(0, maxNameLen) : cleanName;
    return `${prefix}${safeName}${suffix}`;
  }

  if (role === 'PLAYER' && num !== null && num > 0) {
    const padded = String(num).padStart(2, '0');
    const prefix = `${padded} (`;
    const suffix = ')';
    const maxNameLen = 32 - (prefix.length + suffix.length);
    const safeName = cleanName.length > maxNameLen ? cleanName.slice(0, maxNameLen) : cleanName;
    return `${prefix}${safeName}${suffix}`;
  }

  // Spectators keep clean name (max 32 chars)
  return cleanName.slice(0, 32);
}

class LivePartieManager {
  private sessions = new Map<string, LivePartieSession>();
  // Cached voice channel members: guildId -> channelId -> raw members
  private voiceMembersCache = new Map<string, Map<string, any[]>>();

  private getBotToken(): string {
    return process.env.DISCORD_BOT_TOKEN || '';
  }

  public getSession(guildId: string): LivePartieSession {
    let session = this.sessions.get(guildId);
    if (!session) {
      session = {
        guildId,
        voiceChannelId: null,
        voiceChannelName: null,
        participants: [],
        lastUpdated: Date.now(),
        isRenamingInProgress: false
      };
      this.sessions.set(guildId, session);
    }
    return session;
  }

  /**
   * Called when bot reports voice state changes
   */
  public updateVoiceChannelMembers(guildId: string, channelId: string, members: any[]): void {
    let guildVoice = this.voiceMembersCache.get(guildId);
    if (!guildVoice) {
      guildVoice = new Map();
      this.voiceMembersCache.set(guildId, guildVoice);
    }
    guildVoice.set(channelId, members);

    // If this channel is the active game room for this guild, synchronize participants!
    const session = this.sessions.get(guildId);
    if (session && session.voiceChannelId === channelId) {
      this.syncVoiceMembersIntoSession(session, members);
    }
  }

  /**
   * Bulk update of voice states from bot
   */
  public updateBulkVoiceStates(guildId: string, channelsData: { channelId: string; members: any[] }[]): void {
    let guildVoice = this.voiceMembersCache.get(guildId);
    if (!guildVoice) {
      guildVoice = new Map();
      this.voiceMembersCache.set(guildId, guildVoice);
    }

    for (const item of channelsData) {
      guildVoice.set(item.channelId, item.members);
      const session = this.sessions.get(guildId);
      if (session && session.voiceChannelId === item.channelId) {
        this.syncVoiceMembersIntoSession(session, item.members);
      }
    }
  }

  /**
   * Selects a voice channel to listen to
   */
  public selectVoiceChannel(guildId: string, channelId: string | null, channelName: string | null): LivePartieSession {
    const session = this.getSession(guildId);
    session.voiceChannelId = channelId;
    session.voiceChannelName = channelName;
    session.lastUpdated = Date.now();

    if (!channelId) {
      // Clear voice state for all participants except after-joiners
      session.participants.forEach((p) => {
        p.isInVoice = false;
      });
      return session;
    }

    // Retrieve cached members for this voice channel
    const guildVoice = this.voiceMembersCache.get(guildId);
    const members = guildVoice?.get(channelId) || [];
    this.syncVoiceMembersIntoSession(session, members);

    return session;
  }

  /**
   * Synchronizes active voice channel members with current session participants
   */
  private syncVoiceMembersIntoSession(session: LivePartieSession, voiceMembers: any[]): void {
    const voiceMemberMap = new Map(voiceMembers.map((m) => [m.id, m]));

    // 1. Update existing participants
    for (const p of session.participants) {
      const vm = voiceMemberMap.get(p.id);
      if (vm) {
        p.isInVoice = true;
        p.isMute = vm.isMute;
        p.isDeaf = vm.isDeaf;
        p.displayName = vm.displayName;
        if (vm.avatar) p.avatar = vm.avatar;
        // If this participant was an after-joiner, they have now officially arrived!
        p.isAfterJoiner = false;
        voiceMemberMap.delete(p.id);
      } else {
        p.isInVoice = false;
      }
    }

    // 2. Add new voice members who joined the channel
    for (const vm of voiceMemberMap.values()) {
      const cleanName = cleanOldName(vm.displayName || vm.username);
      session.participants.push({
        id: vm.id,
        username: vm.username,
        displayName: vm.displayName || vm.username,
        avatar: vm.avatar || null,
        role: 'PLAYER',
        number: null,
        targetNick: `${cleanName}`,
        originalNick: vm.displayName || vm.username,
        isInVoice: true,
        isMute: vm.isMute,
        isDeaf: vm.isDeaf,
        isAfterJoiner: false,
        renameStatus: 'IDLE'
      });
    }

    session.lastUpdated = Date.now();
  }

  /**
   * Pre-add a participant by Discord User ID ("After-Joiner")
   */
  public async addAfterJoiner(guildId: string, userId: string, preferredRole: ParticipantRole = 'PLAYER'): Promise<LivePartieSession> {
    const session = this.getSession(guildId);
    const existing = session.participants.find((p) => p.id === userId);
    if (existing) {
      return session;
    }

    let username = `User-${userId.slice(-4)}`;
    let displayName = username;
    let avatar: string | null = null;

    // Fetch user details from Discord API
    const botToken = this.getBotToken();
    if (botToken) {
      try {
        const discordRes = await axios.get(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
          headers: { Authorization: `Bot ${botToken}` }
        });
        const m = discordRes.data;
        username = m.user?.username || username;
        displayName = m.nick || m.user?.global_name || m.user?.username || displayName;
        if (m.user?.avatar) {
          avatar = `https://cdn.discordapp.com/avatars/${userId}/${m.user.avatar}.png`;
        }
      } catch (err: any) {
        console.warn(`[LivePartie] Could not fetch member info for ${userId}:`, err.message);
      }
    }

    const cleanName = cleanOldName(displayName);
    const newParticipant: LiveParticipant = {
      id: userId,
      username,
      displayName,
      avatar,
      role: preferredRole,
      number: null,
      targetNick: cleanName,
      originalNick: displayName,
      isInVoice: false,
      isMute: false,
      isDeaf: false,
      isAfterJoiner: true,
      renameStatus: 'IDLE'
    };

    session.participants.push(newParticipant);
    session.lastUpdated = Date.now();
    return session;
  }

  /**
   * Remove a participant from the live session
   */
  public removeParticipant(guildId: string, userId: string): LivePartieSession {
    const session = this.getSession(guildId);
    session.participants = session.participants.filter((p) => p.id !== userId);
    session.lastUpdated = Date.now();
    return session;
  }

  /**
   * Update participant role or manual number
   */
  public updateParticipant(
    guildId: string,
    userId: string,
    updates: { role?: ParticipantRole; number?: number | null }
  ): LivePartieSession {
    const session = this.getSession(guildId);
    const p = session.participants.find((item) => item.id === userId);
    if (!p) return session;

    if (updates.role !== undefined) {
      p.role = updates.role;
      if (p.role === 'NARRATOR') {
        p.number = 0;
      } else if (p.role === 'SPECTATOR') {
        p.number = null;
      }
    }

    if (updates.number !== undefined) {
      p.number = updates.number;
    }

    const cleanName = cleanOldName(p.originalNick || p.displayName);
    p.targetNick = computeTargetNickname(cleanName, p.role, p.number);
    session.lastUpdated = Date.now();
    return session;
  }

  /**
   * Automatically assign numbers to active players (01, 02, 03...) and 0000 to narrator(s)
   */
  public autoNumber(guildId: string): LivePartieSession {
    const session = this.getSession(guildId);

    let playerCounter = 1;
    for (const p of session.participants) {
      const cleanName = cleanOldName(p.originalNick || p.displayName);

      if (p.role === 'NARRATOR') {
        p.number = 0;
        p.targetNick = computeTargetNickname(cleanName, 'NARRATOR', 0);
      } else if (p.role === 'PLAYER') {
        p.number = playerCounter++;
        p.targetNick = computeTargetNickname(cleanName, 'PLAYER', p.number);
      } else {
        p.number = null;
        p.targetNick = computeTargetNickname(cleanName, 'SPECTATOR', null);
      }
    }

    session.lastUpdated = Date.now();
    return session;
  }

  /**
   * Shuffle player numbers randomly
   */
  public randomizeNumbers(guildId: string): LivePartieSession {
    const session = this.getSession(guildId);
    const players = session.participants.filter((p) => p.role === 'PLAYER');

    // Generate random numbers from 1 to players.length
    const numbers = Array.from({ length: players.length }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    players.forEach((p, idx) => {
      p.number = numbers[idx];
      const cleanName = cleanOldName(p.originalNick || p.displayName);
      p.targetNick = computeTargetNickname(cleanName, 'PLAYER', p.number);
    });

    session.lastUpdated = Date.now();
    return session;
  }

  /**
   * Batch rename participants on Discord
   */
  public async applyRenames(guildId: string): Promise<{ success: boolean; session: LivePartieSession }> {
    const session = this.getSession(guildId);
    const botToken = this.getBotToken();

    if (!botToken) {
      throw new Error('Bot token is not configured on server.');
    }

    session.isRenamingInProgress = true;
    const participantsToRename = session.participants.filter(
      (p) => p.role === 'PLAYER' || p.role === 'NARRATOR'
    );

    session.renameProgress = { current: 0, total: participantsToRename.length };

    for (let i = 0; i < participantsToRename.length; i++) {
      const p = participantsToRename[i];
      p.renameStatus = 'PENDING';
      p.renameError = undefined;

      try {
        await axios.patch(
          `https://discord.com/api/guilds/${guildId}/members/${p.id}`,
          { nick: p.targetNick },
          { headers: { Authorization: `Bot ${botToken}` } }
        );
        p.renameStatus = 'SUCCESS';
        p.displayName = p.targetNick;
      } catch (err: any) {
        const status = err.response?.status;
        const discordCode = err.response?.data?.code;

        if (status === 403 || discordCode === 50013) {
          p.renameStatus = 'SKIPPED_HIERARCHY';
          p.renameError = 'Rôle supérieur au bot ou Propriétaire du serveur';
        } else {
          p.renameStatus = 'ERROR';
          p.renameError = err.response?.data?.message || err.message;
        }
      }

      session.renameProgress.current = i + 1;
      // Stagger by 160ms to prevent Discord rate limits (max ~10-15 req/sec)
      await new Promise((resolve) => setTimeout(resolve, 160));
    }

    session.isRenamingInProgress = false;
    session.lastUpdated = Date.now();
    return { success: true, session };
  }

  /**
   * Reset/restore original nicknames on Discord
   */
  public async resetRenames(guildId: string): Promise<{ success: boolean; session: LivePartieSession }> {
    const session = this.getSession(guildId);
    const botToken = this.getBotToken();

    if (!botToken) {
      throw new Error('Bot token is not configured on server.');
    }

    session.isRenamingInProgress = true;
    const participantsToReset = session.participants;
    session.renameProgress = { current: 0, total: participantsToReset.length };

    for (let i = 0; i < participantsToReset.length; i++) {
      const p = participantsToReset[i];
      const cleanName = cleanOldName(p.originalNick || p.displayName);

      try {
        await axios.patch(
          `https://discord.com/api/guilds/${guildId}/members/${p.id}`,
          { nick: cleanName },
          { headers: { Authorization: `Bot ${botToken}` } }
        );
        p.renameStatus = 'SUCCESS';
        p.displayName = cleanName;
        p.targetNick = cleanName;
      } catch (err: any) {
        const status = err.response?.status;
        const discordCode = err.response?.data?.code;
        if (status === 403 || discordCode === 50013) {
          p.renameStatus = 'SKIPPED_HIERARCHY';
        } else {
          p.renameStatus = 'ERROR';
        }
      }

      session.renameProgress.current = i + 1;
      await new Promise((resolve) => setTimeout(resolve, 160));
    }

    session.isRenamingInProgress = false;
    session.lastUpdated = Date.now();
    return { success: true, session };
  }
}

export const livePartieService = new LivePartieManager();
