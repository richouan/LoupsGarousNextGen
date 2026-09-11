import { Message } from 'discord.js';
import { MatchableCard } from './CardMatcherService';
import { rateLimiterService } from './RateLimiterService';
import { buildRolesListEmbeds, buildRestrictedServerEmbed } from '../utils/embedBuilder';
import { isGuildAllowed, getResolvedAllowedGuilds, getContactUser } from '../utils/allowedGuilds';

export interface GuildConfigWithCards {
  settings: {
    autoReplyEnabled: boolean;
    defaultReplyMode: 'TEXT_ONLY' | 'PHOTO_ONLY' | 'BOTH';
    deliveryMethod: 'PUBLIC' | 'DM' | 'EPHEMERAL_REVEAL';
    allowedChannelIds: string[];
    allowedCategoryIds: string[];
    ignoredChannelIds: string[];
    userCooldownSeconds: number;
    channelCooldownSeconds: number;
    autoDeleteSeconds: number;
    allowDms: boolean;
  };
  cards: MatchableCard[];
}

const ROLES_COMMAND_KEYWORDS = new Set([
  'roles',
  'role',
  'roles list',
  'role list',
  'roles lists',
  'all roles',
  'all role',
  'allroles',
  'roleslist',
  'list roles',
  'liste roles',
  'liste des roles',
  'tous les roles',
  'les roles'
]);

export class RolesListService {
  /**
   * Checks if message is a mention to the bot asking for the list of roles
   */
  public isRolesListRequest(message: Message): boolean {
    if (message.author.bot || message.system) {
      return false;
    }

    const botUser = message.client.user;
    if (!botUser) {
      return false;
    }

    const isDm = !message.guild;
    const isBotMentioned = message.mentions.users.has(botUser.id);

    // In a guild channel, the bot MUST be tagged. In DMs, tagging is optional.
    if (!isBotMentioned && !isDm) {
      return false;
    }

    // Strip bot mention <@botId> or <@!botId>
    const botMentionRegex = new RegExp(`<@!?${botUser.id}>`, 'g');
    const cleaned = message.content.replace(botMentionRegex, '');

    // Normalize: lowercase, strip accents, strip outer punctuation (including colons), collapse spaces
    const normalized = cleaned
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/^[:,\s!?.*/~`'-]+|[:,\s!?.*/~`'-]+$/g, '')
      .replace(/\s+/g, ' ');

    return ROLES_COMMAND_KEYWORDS.has(normalized);
  }

  /**
   * Handle incoming message for roles list request
   */
  public async handleMessage(
    message: Message,
    getConfig: (guildId: string | null) => Promise<GuildConfigWithCards>
  ): Promise<boolean> {
    if (!this.isRolesListRequest(message)) {
      return false;
    }

    const guildId = message.guild?.id || null;
    const channelId = message.channel.id;

    // 1. Server Whitelist Check
    if (guildId && !(await isGuildAllowed(guildId))) {
      const allowedGuilds = getResolvedAllowedGuilds(message.client);
      const { embed, files } = buildRestrictedServerEmbed(allowedGuilds, getContactUser());
      try {
        await message.reply({ embeds: [embed], files });
      } catch {}
      return true;
    }

    // 2. Fetch Guild Config and Cards
    const config = await getConfig(guildId);
    const settings = config?.settings || {
      userCooldownSeconds: 3,
      channelCooldownSeconds: 1,
      ignoredChannelIds: []
    };
    const cards = config?.cards || [];

    // 3. Ignored Channels Check
    if (settings.ignoredChannelIds && settings.ignoredChannelIds.includes(channelId)) {
      return false;
    }

    // 4. Anti-Spam Rate Limit Check
    const rateLimit = rateLimiterService.checkRateLimit(
      guildId || 'DM',
      channelId,
      message.author.id,
      settings.userCooldownSeconds || 3,
      settings.channelCooldownSeconds || 1
    );

    if (!rateLimit.allowed) {
      return true; // Cooldown active, suppress spam
    }

    // 5. Generate 3 embeds: Loups-Garous (Red), Villageois (White-Yellow), Solos (Violet)
    const embeds = buildRolesListEmbeds(cards);

    // 6. Send reply
    try {
      await message.reply({ embeds });
    } catch (err: any) {
      try {
        await (message.channel as any).send({ embeds });
      } catch (sendErr: any) {
        console.error('[RolesListService] Could not send roles list embeds:', sendErr.message);
      }
    }

    return true;
  }
}

export const rolesListService = new RolesListService();
