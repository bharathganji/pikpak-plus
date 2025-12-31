import { NSFW_LIST } from "./nsfw-list";

export class NsfwFilter {
  private static instance: NsfwFilter;
  private regex: RegExp;

  private constructor() {
    this.regex = this.buildRegex();
  }

  public static getInstance(): NsfwFilter {
    if (!NsfwFilter.instance) {
      NsfwFilter.instance = new NsfwFilter();
    }
    return NsfwFilter.instance;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
  }

  private buildRegex(): RegExp {
    // Sort by length descending to match longer phrases first
    const sortedList = [...NSFW_LIST].sort((a, b) => b.length - a.length);

    const patterns = sortedList.map((word) => {
      // Handle wildcards
      if (word.includes("*")) {
        const escaped = this.escapeRegExp(word).replace(/\\\*/g, ""); // Remove escaped *

        if (word.startsWith("*") && word.endsWith("*")) {
          // *word* -> substring match
          return escaped;
        } else if (word.startsWith("*")) {
          // *word -> ends with
          return `${escaped}\\b`;
        } else if (word.endsWith("*")) {
          // word* -> starts with
          return `\\b${escaped}`;
        } else {
          // w*ord -> treat as substring for safety/simplicity or specific logic
          return escaped;
        }
      } else {
        // No wildcard -> exact word match
        return `\\b${this.escapeRegExp(word)}\\b`;
      }
    });

    return new RegExp(patterns.join("|"), "i");
  }

  public isProfane(text: string): boolean {
    return this.regex.test(text);
  }
}

// Export a convenience function
export const nsfwFilter = NsfwFilter.getInstance();

export function isProfane(text: string): boolean {
  if (!text) return false;
  return nsfwFilter.isProfane(text);
}
