import { Interaction } from 'discord.js';
import { buildCardEmbed, buildSecretRevealRow } from '../utils/embedBuilder';
import { MatchableCard } from '../services/CardMatcherService';

export async function handleInteraction(
  interaction: Interaction,
  getCardById: (cardId: string) => Promise<MatchableCard | null>,
  getAllCardsForGuild: (guildId: string | null) => Promise<MatchableCard[]>
): Promise<void> {
  // 1. Handle Button Click for Secret Card Reveal
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('reveal_card:')) {
      const cardId = interaction.customId.split(':')[1];
      const card = await getCardById(cardId);

      if (!card) {
        await interaction.reply({
          content: '❌ Impossible de trouver les détails de cette carte.',
          ephemeral: true
        });
        return;
      }

      const requester = {
        username: interaction.user.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL()
      };
      const { embed, files } = buildCardEmbed(card, true, requester);

      await interaction.reply({
        embeds: [embed],
        files,
        ephemeral: true
      });
      return;
    }
  }

  // 2. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'carte') {
      const roleName = interaction.options.getString('nom', true);
      const cards = await getAllCardsForGuild(interaction.guildId);
      const lower = roleName.toLowerCase();
      const card = cards.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          c.slug.toLowerCase() === lower
      );

      if (!card) {
        await interaction.reply({
          content: `❌ Rôle inconnu : "${roleName}". Utilise \`/cartes\` pour voir la liste complète.`,
          ephemeral: true
        });
        return;
      }

      const requester = {
        username: interaction.user.displayName || interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL()
      };
      const { embed, files } = buildCardEmbed(card, true, requester);

      await interaction.reply({
        embeds: [embed],
        files,
        ephemeral: true
      });
      return;
    }

    if (commandName === 'cartes') {
      const cards = await getAllCardsForGuild(interaction.guildId);
      const village = cards.filter((c) => c.camp === 'VILLAGEOIS').map((c) => `• **${c.name}**`).join('\n');
      const loups = cards.filter((c) => c.camp === 'LOUPS').map((c) => `• **${c.name}**`).join('\n');
      const autres = cards.filter((c) => c.camp !== 'VILLAGEOIS' && c.camp !== 'LOUPS').map((c) => `• **${c.name}**`).join('\n');

      await interaction.reply({
        content:
          `📜 **Cartes Loup-Garou configurées :**\n\n` +
          `**🛡️ Villageois :**\n${village || 'Aucun'}\n\n` +
          `**🐺 Meute des Loups :**\n${loups || 'Aucun'}\n\n` +
          `**⚖️ Neutres / Solitaires :**\n${autres || 'Aucun'}\n\n` +
          `💡 *Astuce : tape directement le nom d'un rôle dans le chat pour afficher sa carte !*`,
        ephemeral: true
      });
      return;
    }
    if (commandName === 'ping') {
      await interaction.reply({
        content: `🏓 Pong! Latence du bot : ${Date.now() - interaction.createdTimestamp}ms`,
        ephemeral: true
      });
      return;
    }
  }
}
