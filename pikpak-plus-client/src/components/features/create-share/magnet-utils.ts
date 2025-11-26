// Magnet link validation
export const validateMagnetLink = (
  link: string
): { valid: boolean; error?: string } => {
  const trimmedLink = link.trim();
  if (!trimmedLink) {
    return { valid: false, error: "Please enter a magnet link" };
  }
  const magnetRegex = /^magnet:\?xt=urn:btih:(?:[a-f0-9]{40}|[a-z2-7]{32})/i;
  if (magnetRegex.test(trimmedLink)) {
    return { valid: true };
  }
  return {
    valid: false,
    error:
      "Invalid magnet link. Please provide a valid magnet link starting with 'magnet:?xt=urn:btih:'",
  };
};

export interface LocalTask {
  id: string;
  url: string;
  status: string;
  timestamp: number;
  name?: string;
  file_size?: string;
  file_type?: string;
}

export const STORAGE_KEY = "pikpak_user_tasks";