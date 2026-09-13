import { Message, PermissionsBitField, TextChannel, NewsChannel, ThreadChannel } from 'discord.js';
import { isGuildAllowed, getContactUser } from '../utils/allowedGuilds';

const CLOSE_TRIGGERS = new Set(['sed', '!sed', '/sed', 'سد', 'sedd', 'lock', '!lock']);
const OPEN_TRIGGERS = new Set(['7el', '!7el', '/7el', 'hel', '!hel', '7al', '!7al', 'حل', 'unlock', '!unlock']);

export class ChatControlService {
  /**
   * Listens for admin and narrator triggers 'sed' (close chat) and '7el' / 'hel' (open chat)
   * Returns true if a command was executed
   */
  public async handleMessage(
    message: Message,
    fetchGuildConfig?: (guildId: string | null) => Promise<any>
  ): Promise<boolean> {
    if (!message.guild || message.author.bot) {
      return false;
    }

    const cleanContent = message.content.trim().toLowerCase();
    const isClose = CLOSE_TRIGGERS.has(cleanContent);
    const isOpen = OPEN_TRIGGERS.has(cleanContent);

    if (!isClose && !isOpen) {
      return false;
    }

    // Permission check: admins, channel managers, or server narrators can close/open chat
    const member = message.member;
    if (!member) {
      return false;
    }

    const isAdmin =
      member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
      member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
      message.guild.ownerId === message.author.id;

    let isNarrator = false;
    if (fetchGuildConfig && message.guild) {
      try {
        const config = await fetchGuildConfig(message.guild.id);
        const narratorRoleIds: string[] = config.settings?.narratorRoleIds || [];
        const narratorUserIds: string[] = config.settings?.narratorUserIds || [];

        const hasNarratorRole = member.roles.cache.some((r) => narratorRoleIds.includes(r.id));
        const hasNarratorUser = narratorUserIds.includes(message.author.id);
        isNarrator = hasNarratorRole || hasNarratorUser;
      } catch (err) {
        console.error('[ChatControlService] Error checking narrator config:', err);
      }
    }

    if (!isAdmin && !isNarrator) {
      return false; // Silently ignore non-authorized users so regular chat isn't disrupted
    }

    // Whitelist check: If the server is not authorized, notify the admin
    if (!(await isGuildAllowed(message.guild.id))) {
      try {
        await message.reply({
          content: `🔒 **Bot Loup-Garou 2026 • Bêta Privée**\nCette commande est restreinte aux serveurs partenaires officiels. Pour plus d'informations ou pour autoriser ce serveur, contactez **${getContactUser()}**.`
        });
      } catch {}
      return true;
    }

    const channel = message.channel;
    if (!('permissionOverwrites' in channel) || typeof (channel as TextChannel).permissionOverwrites?.edit !== 'function') {
      return false;
    }

    const textChannel = channel as TextChannel | NewsChannel;
    const everyoneRole = message.guild.roles.everyone;

    try {
      if (isClose) {
        // Lock channel for @everyone
        await textChannel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false
        });

        try {
          await message.react('🔒');
          await message.react('🌙');
        } catch {}

        await textChannel.send({
          content: `🔒 **تم إغلاق المحادثة | Chat Verrouillé**\n🌙 *حلّ الليل في القرية... الصمت والهدوء يعم المكان!*`
        });
        return true;
      }

      if (isOpen) {
        // Unlock channel for @everyone
        await textChannel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: true
        });

        try {
          await message.react('🔓');
          await message.react('☀️');
        } catch {}

        await textChannel.send({
          content: `🔓 **تم فتح المحادثة | Chat Déverrouillé**\n☀️ *أشرقت الشمس واستيقظت القرية... بدأت النقاشات والتحريات!*`
        });
        return true;
      }
    } catch (err: any) {
      console.error('[ChatControlService] Failed to modify channel permissions:', err);
      try {
        await message.reply({
          content: `⚠️ **خطأ في الصلاحيات**: يحتاج البوت إلى صلاحية **Manage Channels** (Gérer les salons) لإغلاق أو فتح المحادثة.`
        });
      } catch {}
      return true;
    }

    return false;
  }
}

export const chatControlService = new ChatControlService();
