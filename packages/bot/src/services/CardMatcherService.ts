export interface MatchableCard {
  id: string;
  guildId?: string | null;
  name: string;
  slug: string;
  camp: string;
  description: string;
  shortDescription?: string | null;
  imageUrl?: string | null;
  isUnique: boolean;
  abilityType: string;
  difficulty: number;
  replyMode?: string | null;
  isEnabled: boolean;
}

export class CardMatcherService {
  /**
   * Normalizes a string for robust matching:
   * - Lowercases
   * - Strips accents / diacritics (sorcière -> sorciere)
   * - Strips leading & trailing punctuation (. , ! ? - _ * ` ~)
   * - Collapses internal whitespace
   */
  public normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accent marks
      .replace(/^[\s.,!?;:*_~`'"-]+|[\s.,!?;:*_~`'"-]+$/g, '') // strip outer punctuation
      .replace(/\s+/g, ' '); // collapse spaces
  }

  /**
   * Checks if the message content matches ONLY a role name or alias.
   * If matched, returns the card.
   */
  public findMatch(messageContent: string, cards: MatchableCard[]): MatchableCard | null {
    const normalizedInput = this.normalize(messageContent);
    if (!normalizedInput) return null;

    for (const card of cards) {
      if (!card.isEnabled) continue;

      // Check card name match
      if (this.normalize(card.name) === normalizedInput) {
        return card;
      }

      // Check slug match
      if (this.normalize(card.slug) === normalizedInput) {
        return card;
      }

      // No triggers to check anymore
    }

    return null;
  }
}

export const cardMatcherService = new CardMatcherService();
