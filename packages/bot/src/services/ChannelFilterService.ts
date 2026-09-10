export interface ChannelFilterOptions {
  autoReplyEnabled: boolean;
  allowedChannelIds: string[];
  allowedCategoryIds: string[];
  ignoredChannelIds: string[];
  allowDms: boolean;
}

export class ChannelFilterService {
  /**
   * Checks if a channel / category is allowed according to guild settings
   */
  public isChannelAllowed(
    isDm: boolean,
    channelId: string,
    categoryId: string | null | undefined,
    options: ChannelFilterOptions
  ): boolean {
    if (!options.autoReplyEnabled) {
      return false;
    }

    if (isDm) {
      return options.allowDms;
    }

    // 1. Check if explicitly ignored
    if (options.ignoredChannelIds && options.ignoredChannelIds.includes(channelId)) {
      return false;
    }

    // 2. Check channel allowlist if specified
    const hasChannelAllowlist = options.allowedChannelIds && options.allowedChannelIds.length > 0;
    const hasCategoryAllowlist = options.allowedCategoryIds && options.allowedCategoryIds.length > 0;

    // If both allowlists are empty, all non-ignored channels are allowed
    if (!hasChannelAllowlist && !hasCategoryAllowlist) {
      return true;
    }

    // Match if channel is explicitly in allowed list
    if (hasChannelAllowlist && options.allowedChannelIds.includes(channelId)) {
      return true;
    }

    // Match if channel category is explicitly in allowed category list
    if (hasCategoryAllowlist && categoryId && options.allowedCategoryIds.includes(categoryId)) {
      return true;
    }

    // Otherwise not allowed
    return false;
  }
}

export const channelFilterService = new ChannelFilterService();
