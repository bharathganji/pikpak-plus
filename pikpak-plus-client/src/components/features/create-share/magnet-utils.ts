// Magnet link validation
export const validateMagnetLink = (
  link: string,
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

// E2DK link validation
export const validateE2dkLink = (
  link: string,
): { valid: boolean; error?: string } => {
  const trimmedLink = link.trim();
  if (!trimmedLink) {
    return { valid: false, error: "Please enter an E2DK link" };
  }

  // E2DK format: ed2k://|file|filename|size|hash|/
  // Filename cannot contain pipes (|) as they are used as delimiters
  // Example: ed2k://|file|example.zip|123456|abcdef1234567890abcdef1234567890|/
  const e2dkRegex = /^ed2k:\/\/\|file\|[^|]+\|\d+\|[a-f0-9]{32}\|\/$/i;
  
  if (e2dkRegex.test(trimmedLink)) {
    return { valid: true };
  }
  return {
    valid: false,
    error:
      "Invalid E2DK link. Please provide a valid E2DK link in format: ed2k://|file|filename|size|hash|/",
  };
};

// Universal download link validation
export const validateDownloadLink = (
  link: string,
): { 
  valid: boolean; 
  error?: string;
  linkType?: "magnet" | "e2dk";
} => {
  const trimmedLink = link.trim();
  if (!trimmedLink) {
    return { valid: false, error: "Please enter a download link" };
  }

  // Check magnet link first
  if (trimmedLink.startsWith("magnet:")) {
    const result = validateMagnetLink(trimmedLink);
    return {
      valid: result.valid,
      error: result.error,
      linkType: "magnet",
    };
  }

  // Check E2DK link
  if (trimmedLink.startsWith("ed2k://")) {
    const result = validateE2dkLink(trimmedLink);
    return {
      valid: result.valid,
      error: result.error,
      linkType: "e2dk",
    };
  }

  return {
    valid: false,
    error:
      "Invalid link format. Please provide either a magnet link (magnet:?xt=urn:btih:...) or an E2DK link (ed2k://|file|...|/)",
    linkType: undefined,
  };
};