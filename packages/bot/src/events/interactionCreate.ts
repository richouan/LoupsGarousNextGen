import { Interaction } from 'discord.js';
import { buildCardEmbed, buildSecretRevealRow } from '../utils/embedBuilder';
import { MatchableCard } from '../services/CardMatcherService';

export async function handleInteraction(
  interaction: Interaction,
  getCardById: (cardId: string) => Promise<MatchableCard | null>,
  getAllCardsForGuild: (guildId: string | null) => Promise<MatchableCard[]>
): Promise<void> {
  // 0. Handle Autocomplete for Slash Commands
  if (interaction.isAutocomplete()) {
    const { commandName } = interaction;
    if (commandName === 'carte') {
      const focused = interaction.options.getFocused(true);
      if (focused.name === 'nom') {
        const query = (focused.value || '').trim().toLowerCase();
        const cards = await getAllCardsForGuild(interaction.guildId);

        const filtered = cards
          .filter((c) => {
            if (!query) return true;
            return (
              c.name.toLowerCase().includes(query) ||
              (c.slug && c.slug.toLowerCase().includes(query)) ||
              (c.camp && c.camp.toLowerCase().includes(query))
            );
          })
          .slice(0, 25);

        await interaction.respond(
          filtered.map((c) => {
            const campEmoji =
              c.camp === 'LOUPS' ? '🐺' : c.camp === 'SOLITAIRE' ? '⚖️' : '🛡️';
            return {
              name: `${campEmoji} ${c.name}`,
              value: c.name
            };
          })
        );
        return;
      }
    }
  }

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

    if (commandName === 'sed' || commandName === 'hel') {
      if (!interaction.guild || !interaction.channel || !('permissionOverwrites' in interaction.channel)) {
        await interaction.reply({ content: '❌ Cette commande doit être utilisée dans un salon textuel.', ephemeral: true });
        return;
      }

      const isAdmin =
        interaction.memberPermissions?.has('ManageChannels') ||
        interaction.memberPermissions?.has('Administrator') ||
        interaction.guild.ownerId === interaction.user.id;

      if (!isAdmin) {
        await interaction.reply({ content: '❌ Seuls les administrateurs ou narrateurs peuvent gérer ce salon.', ephemeral: true });
        return;
      }

      const textChannel = interaction.channel as any;
      const everyoneRole = interaction.guild.roles.everyone;

      try {
        if (commandName === 'sed') {
          await textChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
          await interaction.reply({
            content: `🔒 **تم إغلاق المحادثة | Chat Verrouillé**\n🌙 *حلّ الليل في القرية... الصمت والهدوء يعم المكان!*`
          });
        } else {
          await textChannel.permissionOverwrites.edit(everyoneRole, { SendMessages: true });
          await interaction.reply({
            content: `🔓 **تم فتح المحادثة | Chat Déverrouillé**\n☀️ *أشرقت الشمس واستيقظت القرية... بدأت النقاشات والتحريات!*`
          });
        }
      } catch (err: any) {
        console.error('[Slash sed/hel] Permission error:', err);
        await interaction.reply({
          content: `⚠️ **خطأ في الصلاحيات**: يحتاج البوت إلى صلاحية **Manage Channels** (Gérer les salons).`,
          ephemeral: true
        });
      }
      return;
    }

    if (commandName === 'carte') {
      const roleName = interaction.options.getString('nom', true);
      const cards = await getAllCardsForGuild(interaction.guildId);
      const lower = roleName.trim().toLowerCase();
      const card =
        cards.find(
          (c) =>
            c.name.toLowerCase() === lower ||
            c.slug?.toLowerCase() === lower
        ) ||
        cards.find((c) => lower.includes(c.name.toLowerCase()));

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
