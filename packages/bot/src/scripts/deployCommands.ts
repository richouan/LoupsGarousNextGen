import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export const commands = [
  new SlashCommandBuilder()
    .setName('carte')
    .setDescription('Affiche la fiche complète et les règles d’un rôle en secret')
    .addStringOption((option) =>
      option
        .setName('nom')
        .setDescription('Nom du rôle (ex: Chasseur, Voyante, Sorcière)')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  new SlashCommandBuilder()
    .setName('sed')
    .setDescription('Ferme la discussion du salon (Nuit tombée)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder()
    .setName('hel')
    .setDescription('Ouvre la discussion du salon (Journée & Débats)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder()
    .setName('cartes')
    .setDescription('Affiche la liste de tous les rôles et cartes disponibles'),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Affiche la liste de tous les rôles (Loups, Villageois, Solos)'),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie le temps de réponse du bot')
];

export async function deployCommands(token: string, clientId: string, guildIds?: string | string[]) {
  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`[Deploy] Registering ${commands.length} application commands...`);

  // 1. Global registration
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map((c) => c.toJSON()) }
    );
    console.log('[Deploy] Global slash commands registered successfully!');
  } catch (err: any) {
    console.warn('[Deploy] Global commands registration note:', err.message);
  }

  // 2. Guild-level registration for instantaneous availability
  if (guildIds) {
    const list = Array.isArray(guildIds) ? guildIds : [guildIds];
    for (const gid of list) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, gid),
          { body: commands.map((c) => c.toJSON()) }
        );
        console.log(`[Deploy] Commands registered to guild ${gid}!`);
      } catch (err: any) {
        console.warn(`[Deploy] Could not register to guild ${gid}:`, err.message);
      }
    }
  }
}

// Direct execution when run via CLI
if (require.main === module) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;

  if (!token || !clientId) {
    console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID in .env');
    process.exit(1);
  }

  deployCommands(token, clientId, guildId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
