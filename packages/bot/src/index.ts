import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';
import path from 'path';
import dotenv from 'dotenv';
import axios from 'axios';
import { autoReplyService } from './services/AutoReplyService';
import { chatControlService } from './services/ChatControlService';
import { handleInteraction } from './events/interactionCreate';
import { MatchableCard } from './services/CardMatcherService';
import { deployCommands } from './scripts/deployCommands';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const API_BASE_URL = process.env.SERVER_API_URL || 'http://localhost:3001/api';

// In-memory cache for ultra-low latency bot replies (3-second TTL for near instant dashboard sync)
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}
const configCache = new Map<string, CacheEntry<any>>();

async function fetchGuildConfig(guildId: string | null) {
  const cacheKey = guildId || 'DM';
  const cached = configCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.cachedAt < 3000) {
    return cached.data;
  }

  try {
    const url = guildId
      ? `${API_BASE_URL}/bot/guild-config/${guildId}`
      : `${API_BASE_URL}/bot/default-config`;

    const res = await axios.get(url, { timeout: 3000 });
    const data = res.data;
    configCache.set(cacheKey, { data, cachedAt: now });
    return data;
  } catch (err: any) {
    // Fallback to minimal default if server is starting or offline
    console.warn(`[Bot] Could not reach backend API (${err.message}), using fallback defaults.`);
    return {
      settings: {
        autoReplyEnabled: true,
        defaultReplyMode: 'BOTH',
        deliveryMethod: 'PUBLIC',
        allowedChannelIds: [],
        allowedCategoryIds: [],
        ignoredChannelIds: [],
        userCooldownSeconds: 3,
        channelCooldownSeconds: 1,
        autoDeleteSeconds: 0,
        allowDms: true
      },
      cards: []
    };
  }
}

async function getCardById(cardId: string): Promise<MatchableCard | null> {
  try {
    const res = await axios.get(`${API_BASE_URL}/cards/${cardId}`, { timeout: 3000 });
    return res.data;
  } catch {
    return null;
  }
}

async function getAllCardsForGuild(guildId: string | null): Promise<MatchableCard[]> {
  const config = await fetchGuildConfig(guildId);
  return config.cards || [];
}

export function createBotClient() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  client.once(Events.ClientReady, async (c) => {
    console.log(`🐺 [Loup-Garou Bot] Connecté en tant que ${c.user.tag}!`);
    console.log(`📡 Prêt à écouter les noms de rôles dans les serveurs et messages privés.`);

    // Sync all joined guilds to database
    try {
      const guildsToSync = c.guilds.cache.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.iconURL()
      }));
      await axios.post(`${API_BASE_URL}/bot/sync-guilds`, { guilds: guildsToSync }, { timeout: 3000 });
      console.log(`✨ Synced ${guildsToSync.length} guilds to backend database.`);
    } catch (err: any) {
      console.warn(`[Bot] Could not sync guilds to server:`, err.message);
    }

    // Automatically deploy slash commands globally and to all active guilds
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID || c.user.id;
    if (botToken && clientId) {
      const activeGuildIds = c.guilds.cache.map((g) => g.id);
      deployCommands(botToken, clientId, activeGuildIds)
        .catch((err) => console.warn('[Bot] Failed to deploy slash commands on startup:', err.message));
    }
  });

  // When bot joins a new server
  client.on(Events.GuildCreate, async (guild) => {
    try {
      await axios.post(
        `${API_BASE_URL}/bot/sync-guilds`,
        { guilds: [{ id: guild.id, name: guild.name, icon: guild.iconURL() }] },
        { timeout: 3000 }
      );
      console.log(`🐺 Bot added to new server: ${guild.name} (${guild.id})`);

      const botToken = process.env.DISCORD_BOT_TOKEN;
      const clientId = process.env.DISCORD_CLIENT_ID;
      if (botToken && clientId) {
        deployCommands(botToken, clientId, [guild.id]).catch(() => {});
      }
    } catch {}
  });

  // Message listening for exact role names and admin channel lock/unlock (sed / 7el)
  client.on(Events.MessageCreate, async (message) => {
    // 1. Check for 'sed' (close chat) and '7el' (open chat) from admins
    const handled = await chatControlService.handleMessage(message);
    if (handled) {
      return;
    }

    // 2. Process role card automatic responses
    await autoReplyService.handleMessage(message, fetchGuildConfig);
  });

  // Interaction handler for buttons and slash commands
  client.on(Events.InteractionCreate, async (interaction) => {
    await handleInteraction(interaction, getCardById, getAllCardsForGuild);
  });

  return client;
}

// Start bot if token is provided
if (process.env.DISCORD_BOT_TOKEN) {
  const client = createBotClient();
  client.login(process.env.DISCORD_BOT_TOKEN).catch((err) => {
    console.error('❌ Failed to login to Discord:', err);
  });
} else {
  console.log('ℹ️ DISCORD_BOT_TOKEN not provided in .env yet. Bot service ready to start once credentials are set.');
}
