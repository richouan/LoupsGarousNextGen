export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class RateLimiterService {
  // Map of `guildId:userId` -> last execution timestamp
  private userCooldowns = new Map<string, number>();
  // Map of `channelId` -> last execution timestamp
  private channelCooldowns = new Map<string, number>();

  /**
   * Checks if a user is rate-limited in a guild/channel.
   */
  public checkRateLimit(
    guildId: string,
    channelId: string,
    userId: string,
    userCooldownSeconds = 3,
    channelCooldownSeconds = 1
  ): RateLimitResult {
    const now = Date.now();
    const userKey = `${guildId}:${userId}`;

    // Check user cooldown
    const lastUserTime = this.userCooldowns.get(userKey) || 0;
    const userRemaining = userCooldownSeconds * 1000 - (now - lastUserTime);

    if (userRemaining > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(userRemaining / 1000)
      };
    }

    // Check channel cooldown
    const lastChannelTime = this.channelCooldowns.get(channelId) || 0;
    const channelRemaining = channelCooldownSeconds * 1000 - (now - lastChannelTime);

    if (channelRemaining > 0) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(channelRemaining / 1000)
      };
    }

    // Register current hit
    this.userCooldowns.set(userKey, now);
    this.channelCooldowns.set(channelId, now);

    // Garbage collection if map grows large
    if (this.userCooldowns.size > 5000) {
      this.cleanup();
    }

    return {
      allowed: true,
      retryAfterSeconds: 0
    };
  }

  /**
   * Prune expired cooldowns to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.userCooldowns.entries()) {
      if (now - timestamp > 60000) {
        this.userCooldowns.delete(key);
      }
    }
    for (const [key, timestamp] of this.channelCooldowns.entries()) {
      if (now - timestamp > 60000) {
        this.channelCooldowns.delete(key);
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
