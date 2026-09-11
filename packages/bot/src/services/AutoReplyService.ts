import { Message, TextChannel } from 'discord.js';
import { cardMatcherService, MatchableCard } from './CardMatcherService';
import { channelFilterService, ChannelFilterOptions } from './ChannelFilterService';
import { rateLimiterService } from './RateLimiterService';
import { buildCardEmbed, buildCardActionRow, buildSecretRevealRow, buildRestrictedServerEmbed } from '../utils/embedBuilder';
import { isGuildAllowed, getResolvedAllowedGuilds, getContactUser } from '../utils/allowedGuilds';

export interface GuildConfigWithCards {
  settings: {
    autoReplyEnabled: boolean;
    defaultReplyMode: 'TEXT_ONLY' | 'PHOTO_ONLY' | 'BOTH';
    deliveryMethod: 'PUBLIC' | 'EPHEMERAL_REVEAL' | 'DM';
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

export class AutoReplyService {
  /**
   * Main entry point to handle incoming message listening
   */
  public async handleMessage(
    message: Message,
    getConfig: (guildId: string | null) => Promise<GuildConfigWithCards>
  ): Promise<boolean> {
    // 1. Ignore bots & system messages
    if (message.author.bot || message.system) {
      return false;
    }

    const isDm = !message.guild;
    const guildId = message.guild?.id || null;

    // 2. Fetch guild configuration and active card list
    const config = await getConfig(guildId);
    if (!config || !config.settings) {
      return false;
    }

    const { settings, cards } = config;

    // 3. Channel & Category Filter Check
    const channelId = message.channel.id;
    const categoryId = (message.channel as TextChannel).parentId || null;

    const filterOptions: ChannelFilterOptions = {
      autoReplyEnabled: settings.autoReplyEnabled,
      allowedChannelIds: settings.allowedChannelIds || [],
      allowedCategoryIds: settings.allowedCategoryIds || [],
      ignoredChannelIds: settings.ignoredChannelIds || [],
      allowDms: settings.allowDms ?? true
    };

    if (!channelFilterService.isChannelAllowed(isDm, channelId, categoryId, filterOptions)) {
      return false;
    }

    // 4. Exact Role Name Match Check
    const matchedCard = cardMatcherService.findMatch(message.content, cards);
    if (!matchedCard) {
      return false; // Not a role inquiry, normal chat message
    }

    // 4.5. Server Whitelist Check: If server is not authorized, notify about private beta
    if (guildId && !(await isGuildAllowed(guildId))) {
      const rateLimit = rateLimiterService.checkRateLimit(
        guildId,
        channelId,
        message.author.id,
        settings.userCooldownSeconds || 5,
        settings.channelCooldownSeconds || 2
      );
      if (!rateLimit.allowed) {
        return false;
      }

      const allowedGuilds = getResolvedAllowedGuilds(message.client);
      const { embed, files } = buildRestrictedServerEmbed(allowedGuilds, getContactUser());
      try {
        await message.reply({ embeds: [embed], files });
      } catch {}
      return true;
    }

    // 5. Anti-Spam Rate Limit Check
    const rateLimit = rateLimiterService.checkRateLimit(
      guildId || 'DM',
      channelId,
      message.author.id,
      settings.userCooldownSeconds || 3,
      settings.channelCooldownSeconds || 1
    );

    if (!rateLimit.allowed) {
      try {
        await message.react('⏳');
      } catch {
        // Missing reaction permission or blocked
      }
      return false;
    }

    // 6. Determine Reply Mode (Card override or Guild default)
    const replyMode = matchedCard.replyMode || settings.defaultReplyMode || 'BOTH';
    const deliveryMethod = isDm ? 'DM' : (settings.deliveryMethod || 'PUBLIC');

    // 7. Dispatch Delivery
    try {
      if (deliveryMethod === 'DM') {
        // Send via Direct Message
        await this.deliverDm(message, matchedCard, replyMode);
      } else if (deliveryMethod === 'EPHEMERAL_REVEAL') {
        // Reply with secret button
        await this.deliverEphemeralReveal(message, matchedCard, settings.autoDeleteSeconds);
      } else {
        // Default: Public Reply
        await this.deliverPublic(message, matchedCard, replyMode, settings.autoDeleteSeconds);
      }
      return true;
    } catch (err) {
      console.error(`[AutoReplyService] Error responding to message ${message.id}:`, err);
      return false;
    }
  }

  /**
   * Delivers public response in channel
   */
  private async deliverPublic(
    message: Message,
    card: MatchableCard,
    replyMode: string,
    autoDeleteSeconds: number
  ): Promise<void> {
    let replyPromise;

    if (replyMode === 'PHOTO_ONLY' && card.imageUrl) {
      // 1. Artwork Only (image only, NO card name text)
      replyPromise = message.channel.isTextBased()
        ? (message.channel as any).send({ files: [card.imageUrl] })
        : message.reply({ files: [card.imageUrl] });
    } else if (replyMode === 'TEXT_ONLY' || replyMode === 'EMBED_TEXT') {
      // 2. Embed Mode (Text Only - no photo)
      const requester = {
        username: message.author.displayName || message.author.username,
        avatarURL: message.author.displayAvatarURL()
      };
      const { embed } = buildCardEmbed(card, false, requester, false);
      replyPromise = message.channel.isTextBased()
        ? (message.channel as any).send({ embeds: [embed] })
        : message.reply({ embeds: [embed] });
    } else if (replyMode === 'PLAIN_TEXT') {
      // 3. Plain Text (No embed)
      replyPromise = message.reply({
        content: `**📜 ${card.name} (${card.camp})**\n${card.description}`
      });
    } else {
      // 4. BOTH (Embed Mode: Text + Photo)
      const requester = {
        username: message.author.displayName || message.author.username,
        avatarURL: message.author.displayAvatarURL()
      };
      const { embed, files } = buildCardEmbed(card, false, requester, true);
      replyPromise = message.channel.isTextBased()
        ? (message.channel as any).send({
            embeds: [embed],
            files
          })
        : message.reply({
            embeds: [embed],
            files
          });
    }

    const sentMessage = await replyPromise;

    // Handle auto-cleanup if configured
    if (autoDeleteSeconds > 0 && sentMessage && sentMessage.deletable) {
      setTimeout(async () => {
        try {
          await sentMessage.delete();
        } catch {
          // Already deleted
        }
      }, autoDeleteSeconds * 1000);
    }
  }

  /**
   * Whispers the card to user's private DM
   */
  private async deliverDm(
    message: Message,
    card: MatchableCard,
    replyMode: string
  ): Promise<void> {
    if (replyMode === 'PHOTO_ONLY' && card.imageUrl) {
      await message.author.send({ files: [card.imageUrl] });
    } else if (replyMode === 'TEXT_ONLY' || replyMode === 'EMBED_TEXT') {
      const requester = {
        username: message.author.displayName || message.author.username,
        avatarURL: message.author.displayAvatarURL()
      };
      const { embed } = buildCardEmbed(card, true, requester, false);
      await message.author.send({ embeds: [embed] });
    } else if (replyMode === 'PLAIN_TEXT') {
      await message.author.send({
        content: `**🔒 Révélation Secrète - ${card.name} (${card.camp})**\n${card.description}`
      });
    } else {
      // BOTH (Embed Mode: Text + Photo)
      const requester = {
        username: message.author.displayName || message.author.username,
        avatarURL: message.author.displayAvatarURL()
      };
      const { embed, files } = buildCardEmbed(card, true, requester, true);
      await message.author.send({
        embeds: [embed],
        files
      });
    }

    // Add confirmation emoji if not already in DM
    if (message.guild) {
      try {
        await message.react('📩');
      } catch {
        // Emoji failed, ignore
      }
    }
  }

  private async deliverEphemeralReveal(
    message: Message,
    card: MatchableCard,
    autoDeleteSeconds: number
  ): Promise<void> {
    // Option B Implementation: Tell user to use slash command
    const sentMessage = await message.reply({
      content: `⚠️ Pour afficher la carte **${card.name}** en secret, veuillez utiliser la commande : \`/carte nom:${card.name}\``
    });

    // We can also try to delete their original plain text message so it's not spamming the chat
    try {
      if (message.deletable) {
        await message.delete();
      }
    } catch {
      // ignore
    }

    // Auto delete our warning after 10 seconds
    setTimeout(async () => {
      try {
        await sentMessage.delete();
      } catch {
        // ignore
      }
    }, 10000);
  }
}

export const autoReplyService = new AutoReplyService();
