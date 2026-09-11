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
  VILLAGEOIS: '🛡️ قروي',
  LOUPS: '🐺 ذئب',
  SOLITAIRE: '🔮 منفرد',
  NEUTRE: '⚖️ محايد'
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
  requester?: EmbedRequester
): { embed: EmbedBuilder; files: AttachmentBuilder[]; imageUrlContent?: string } {
  const color = CAMP_COLORS[card.camp] || 0x3b82f6;
  const campLabel = CAMP_NAMES[card.camp] || card.camp;

  const stars = '★'.repeat(Math.min(5, Math.max(1, card.difficulty || 1)));
  const abilityLabel = card.abilityType === 'NIGHT'
    ? '🌙 ليلية'
    : card.abilityType === 'DAY'
    ? '☀️ نهارية'
    : card.abilityType === 'PASSIVE'
    ? '✨ دائمة'
    : '❌ بدون';

  let descriptionContent = '';

  if (card.shortDescription && card.shortDescription.trim()) {
    descriptionContent += `⚡ **شرح مختصر :**\n${toBoldLines(card.shortDescription)}\n\n`;
  }

  if (card.description && card.description.trim()) {
    descriptionContent += `📜 **شرح مفصل :**\n${toBoldLines(card.description)}\n\n`;
  }

  descriptionContent += `-# 💡 اكتب اسم أي دور في المحادثة لعرض تفاصيله فوراً`;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Loups-Garous NextGen • بطاقة دور',
      iconURL: 'https://loupgarou.online/logo.png'
    })
    .setTitle(`🃏 ${card.name}`)
    .setColor(color)
    .addFields(
      { name: '🛡️ المجموعة', value: `**${campLabel}**`, inline: true },
      { name: '⭐ الصعوبة', value: `**${stars}**`, inline: true },
      { name: '⏳ القدرة', value: `**${abilityLabel}**`, inline: true }
    )
    .setDescription(descriptionContent);

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

  if (card.imageUrl) {
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

