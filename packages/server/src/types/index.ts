export type CampType = 'VILLAGEOIS' | 'LOUPS' | 'SOLITAIRE' | 'NEUTRE';
export type ReplyMode = 'TEXT_ONLY' | 'PHOTO_ONLY' | 'BOTH';
export type DeliveryMethod = 'PUBLIC' | 'EPHEMERAL_REVEAL' | 'DM';

export interface CardData {
  id?: string;
  guildId?: string | null;
  name: string;
  slug: string;
  camp: CampType;
  description: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  triggers: string[]; // parsed array
  replyMode?: ReplyMode | null;
  isEnabled: boolean;
}

export interface GuildSettingData {
  guildId: string;
  prefix: string;
  autoReplyEnabled: boolean;
  defaultReplyMode: ReplyMode;
  deliveryMethod: DeliveryMethod;
  allowedChannelIds: string[];
  allowedCategoryIds: string[];
  ignoredChannelIds: string[];
  userCooldownSeconds: number;
  channelCooldownSeconds: number;
  autoDeleteSeconds: number;
  allowDms: boolean;
}

export interface DiscordUserSession {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface DiscordGuildInfo {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  hasBot: boolean;
  isAdmin: boolean;
}
