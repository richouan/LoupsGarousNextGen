import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  AttachmentBuilder
} from 'discord.js';
import path from 'path';
import fs from 'fs';
import { MatchableCard } from '../services/CardMatcherService';

export const CAMP_COLORS: Record<string, ColorResolvable> = {
  VILLAGEOIS: 0x3b82f6, // Royal Village Blue
  LOUPS: 0xdc2626,      // Wolf Red
  SOLITAIRE: 0x8b5cf6,  // Solitaire Violet / Purple
};

export const CAMP_NAMES: Record<string, string> = {
  VILLAGEOIS: 'قروي',
  LOUPS: 'ذئب',
  SOLITAIRE: 'منفرد',
  NEUTRE: 'محايد'
};

export interface EmbedRequester {
  username: string;
  avatarURL?: string;
}

function toBoldLines(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return trimmed;
      return `**${trimmed}**`;
    })
    .join('\n');
}

export function buildCardEmbed(
  card: MatchableCard,
  isEphemeral = false,
  requester?: EmbedRequester,
  includeImage = true
): { embed: EmbedBuilder; files: AttachmentBuilder[]; imageUrlContent?: string } {
  const color = CAMP_COLORS[card.camp] || 0x3b82f6;
  const campLabel = CAMP_NAMES[card.camp] || card.camp;

  const diff = Math.min(5, Math.max(1, card.difficulty || 1));
  // RTL formatted stars: filled stars start from the right in Arabic text flow
  const stars = '\u200F' + '☆'.repeat(5 - diff) + '★'.repeat(diff);

  const abilityLabel = card.abilityType === 'NIGHT'
    ? 'ليلية'
    : card.abilityType === 'DAY'
    ? 'نهارية'
    : card.abilityType === 'PASSIVE'
    ? 'دائمة'
    : 'بدون';

  let descriptionContent = '';

  if (card.shortDescription && card.shortDescription.trim()) {
    descriptionContent += `⚡ **شرح مختصر :**\n${toBoldLines(card.shortDescription)}\n\n`;
  }

  if (card.description && card.description.trim()) {
    descriptionContent += `📜 **شرح مفصل :**\n${toBoldLines(card.description)}\n\n`;
  }

  // Free line between bio and the fields:
  if (descriptionContent.trim()) {
    descriptionContent = descriptionContent.trim() + '\n\u200B';
  }

  const embed = new EmbedBuilder()
    .setTitle(card.name)
    .setColor(color)
    .addFields(
      { name: '( المجموعة : )', value: `**${campLabel}**`, inline: true },
      { name: '( الصعوبة : )', value: `**${stars}**`, inline: true },
      { name: '( القدرة : )', value: `**${abilityLabel}**`, inline: true }
    );

  if (descriptionContent) {
    embed.setDescription(descriptionContent);
  }

  if (requester?.username) {
    embed.setFooter({
      text: `Requested by ${requester.username}${isEphemeral ? ' • 👁️ Secret' : ''}`,
      iconURL: requester.avatarURL
    });
  } else {
    embed.setFooter({
      text: isEphemeral ? '👁️ Révélation Secrète' : '🌙 Loup-Garou 2026'
    });
  }
  embed.setTimestamp();

  const files: AttachmentBuilder[] = [];

  if (includeImage && card.imageUrl) {
    const filename = card.imageUrl.split('/').pop()?.split('?')[0] || 'card.png';
    const attachment = new AttachmentBuilder(card.imageUrl, { name: filename });
    files.push(attachment);
    embed.setImage(`attachment://${filename}`);
  }

  return { embed, files };
}

export function buildCardActionRow(cardId: string, cardName: string): ActionRowBuilder<ButtonBuilder> {
  const revealBtn = new ButtonBuilder()
    .setCustomId(`reveal_card:${cardId}`)
    .setLabel(`👁️ كشف بالسر`)
    .setStyle(ButtonStyle.Secondary);

  const siteBtn = new ButtonBuilder()
    .setLabel(`🌐 لوحة التحكم`)
    .setStyle(ButtonStyle.Link)
    .setURL(`https://loupgarou.online`);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(revealBtn, siteBtn);
}

export function buildSecretRevealRow(cardId: string, cardName: string): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(`reveal_card:${cardId}`)
    .setLabel(`👁️ كشف بالسر`)
    .setStyle(ButtonStyle.Secondary);

  const siteButton = new ButtonBuilder()
    .setLabel(`🌐 لوحة التحكم`)
    .setStyle(ButtonStyle.Link)
    .setURL(`https://loupgarou.online`);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button, siteButton);
}

export function buildRestrictedServerEmbed(
  allowedGuilds: Array<{ name: string; icon?: string | null }>,
  contactUser = 'ezreal'
): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const serverListText = allowedGuilds
    .map((g, idx) => `🏰 **Serveur ${idx + 1} :** \`${g.name}\``)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🔒 Loup-Garou 2026 • Bêta Privée (Serveur Non Autorisé)')
    .setColor(0xeab308)
    .setDescription(
      `⚠️ **Ce bot est actuellement en phase de développement fermé.**\n\n` +
      `Son utilisation et ses commandes sont temporairement réservées aux serveurs partenaires officiels :\n\n` +
      `${serverListText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📩 **Demande d'accès & Partenariats :**\n` +
      `Pour ajouter votre serveur ou pour toute information, veuillez contacter **${contactUser}** sur Discord.\n\n` +
      `*⚠️ هذا البوت قيد التطوير حالياً ومتاح حصرياً في السيرفرات الرسمية المحددة أعلاه. يرجى التواصل مع **${contactUser}** للمزيد من المعلومات.*`
    )
    .setFooter({
      text: `Loup-Garou 2026 • Contact: ${contactUser} • Under Development`
    })
    .setTimestamp();

  const files: AttachmentBuilder[] = [];

  // Use the first allowed server's icon as thumbnail
  const firstWithIcon = allowedGuilds.find((g) => g.icon);
  if (firstWithIcon && firstWithIcon.icon) {
    embed.setThumbnail(firstWithIcon.icon);
  }

  return { embed, files };
}

export function categorizeCards(cards: MatchableCard[]) {
  const loups: MatchableCard[] = [];
  const villageois: MatchableCard[] = [];
  const solos: MatchableCard[] = [];

  for (const card of cards) {
    if (card.isEnabled === false) continue;
    const camp = (card.camp || '').trim().toUpperCase();
    if (camp === 'LOUPS' || camp === 'LOUPS-GAROUS' || camp.includes('LOUP') || camp.includes('WOLF')) {
      loups.push(card);
    } else if (camp === 'VILLAGEOIS' || camp === 'VILLAGE' || camp.includes('VILLAG')) {
      villageois.push(card);
    } else {
      solos.push(card);
    }
  }

  const sortAlphabetical = (a: MatchableCard, b: MatchableCard) =>
    a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });

  return {
    loups: loups.sort(sortAlphabetical),
    villageois: villageois.sort(sortAlphabetical),
    solos: solos.sort(sortAlphabetical)
  };
}

export function buildRolesListEmbeds(cards: MatchableCard[]): EmbedBuilder[] {
  const { loups, villageois, solos } = categorizeCards(cards);

  const loupsDesc = loups.length > 0
    ? loups.map((c) => `• **${c.name}**`).join('\n')
    : '*Aucun rôle configuré*';

  const villageDesc = villageois.length > 0
    ? villageois.map((c) => `• **${c.name}**`).join('\n')
    : '*Aucun rôle configuré*';

  const soloDesc = solos.length > 0
    ? solos.map((c) => `• **${c.name}**`).join('\n')
    : '*Aucun rôle configuré*';

  // 1. Loups-Garous in Red (#ef4444)
  const embedLoups = new EmbedBuilder()
    .setTitle(`🐺 Loups-Garous (${loups.length})`)
    .setColor(0xef4444)
    .setDescription(loupsDesc);

  // 2. Villageois in White Yellow (#fef08a)
  const embedVillageois = new EmbedBuilder()
    .setTitle(`🛡️ Villageois (${villageois.length})`)
    .setColor(0xfef08a)
    .setDescription(villageDesc);

  // 3. Solos in Violet (#a855f7)
  const embedSolo = new EmbedBuilder()
    .setTitle(`🔮 Solos (${solos.length})`)
    .setColor(0xa855f7)
    .setDescription(soloDesc)
    .setFooter({
      text: "💡 Astuce : Écris le nom d'un rôle dans le salon pour afficher sa carte !"
    });

  return [embedLoups, embedVillageois, embedSolo];
}
