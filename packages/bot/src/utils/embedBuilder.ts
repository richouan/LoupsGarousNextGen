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
  VILLAGEOIS: 0x3b82f6, // Blue
  LOUPS: 0xdc2626,      // Red
  SOLITAIRE: 0x8b5cf6,  // Purple
};

export const CAMP_NAMES: Record<string, string> = {
  VILLAGEOIS: '🛡️ Camp du Village (Innocents)',
  LOUPS: '🐺 Meute des Loups-Garous',
  SOLITAIRE: '🔮 Joueur Solitaire',
};

export function buildCardEmbed(card: MatchableCard, isEphemeral = false): { embed: EmbedBuilder; files: AttachmentBuilder[]; imageUrlContent?: string } {
  const color = CAMP_COLORS[card.camp] || 0x4f46e5;
  const campLabel = CAMP_NAMES[card.camp] || card.camp;

  const difficultyStars = '★'.repeat(card.difficulty || 1);
  const abilityLabel = card.abilityType === 'NIGHT' ? '🌙 Pouvoir de Nuit' : card.abilityType === 'DAY' ? '☀️ Pouvoir de Jour' : '❌ Aucun pouvoir';
  const quantityLabel = card.isUnique ? '👑 Carte Unique' : '🔄 Rôle Multiple';

  const embed = new EmbedBuilder()
    .setTitle(`🃏 Carte : ${card.name}`)
    .setColor(color)
    .setDescription(
      `**Allégeance :** ${campLabel}\n` +
      `**Propriétés :** ${difficultyStars} | ${quantityLabel} | ${abilityLabel}\n\n` +
      `**📜 Description & Pouvoir :**\n${card.description}`
    )
    .setFooter({
      text: isEphemeral
        ? '👁️ Révélation Secrète • Visible uniquement par toi'
        : '🌙 Loup-Garou 2026'
    })
    .setTimestamp();

  if (card.shortDescription) {
    embed.addFields({
      name: '⚡ Résumé rapide',
      value: card.shortDescription,
      inline: false
    });
  }

  const files: AttachmentBuilder[] = [];

  if (card.imageUrl) {
    // All URLs (Cloudinary, Discord CDN, etc) are streamed directly as native attachments
    // to bypass the Discord link-preview max-width limit and render them as massive file uploads.
    const filename = card.imageUrl.split('/').pop()?.split('?')[0] || 'card.png';
    const attachment = new AttachmentBuilder(card.imageUrl, { name: filename });
    files.push(attachment);
  }

  return { embed, files };
}

export function buildSecretRevealRow(cardId: string, cardName: string): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(`reveal_card:${cardId}`)
    .setLabel(`👁️ Révéler "${cardName}" en secret`)
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}
