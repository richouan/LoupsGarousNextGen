import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

export const commands = [
  new SlashCommandBuilder()
    .setName('carte')
    .setDescription('Affiche la fiche complète et les règles d’un rôle')
    .addStringOption((option) =>
      option
        .setName('nom')
        .setDescription('Nom du rôle (ex: Chasseur, Voyante, Sorcière)')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('secret')
        .setDescription('Afficher en secret uniquement pour toi (éphémère)')
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('cartes')
    .setDescription('Affiche la liste de tous les rôles et cartes disponibles'),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie le temps de réponse du bot')
];

export async function deployCommands(token: string, clientId: string, guildId?: string) {
  const rest = new REST({ version: '10' }).setToken(token);

  console.log(`[Deploy] Registering ${commands.length} application commands...`);

  if (guildId) {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands.map((c) => c.toJSON()) }
    );
    console.log(`[Deploy] Commands registered to guild ${guildId}!`);
  } else {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map((c) => c.toJSON()) }
    );
    console.log('[Deploy] Global commands registered!');
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
