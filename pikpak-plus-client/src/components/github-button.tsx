"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "primereact/hooks";
import { Github, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitHubButtonProps {
  repo: string; // Format: "owner/repo"
  showCount?: boolean;
}

interface CachedStars {
  count: number;
  timestamp: number;
}

const CACHE_KEY_PREFIX = "github_stars_";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour in milliseconds

export function GitHubButton({
  repo,
  showCount = true,
}: Readonly<GitHubButtonProps>) {
  const cacheKey = `${CACHE_KEY_PREFIX}${repo}`;
  const [cachedData, setCachedData] = useLocalStorage<CachedStars | null>(
    null,
    cacheKey,
  );
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showCount) {
      setLoading(false);
      return;
    }

    // Check cache first
    const checkCache = () => {
      if (cachedData) {
        const { count, timestamp } = cachedData;
        const now = Date.now();

        // If cache is still valid, use it
        if (now - timestamp < CACHE_DURATION) {
          setStars(count);
          setLoading(false);
          return true;
        }
      }
      return false;
    };

    // If cache is valid, use it and skip fetch
    if (checkCache()) {
      return;
    }

    // Otherwise fetch from API
    const fetchStars = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (response.ok) {
          const data = await response.json();
          const starCount = data.stargazers_count;
          setStars(starCount);

          // Cache the result
          setCachedData({
            count: starCount,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Failed to fetch GitHub stars:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStars();
  }, [repo, showCount]);

  const formatStars = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <Button variant="outline" size="sm" asChild className="gap-2 h-9">
      <a
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View on GitHub"
      >
        <Github className="h-4 w-4" />
        {showCount && !loading && stars !== null && (
          <>
            <Star className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-medium">{formatStars(stars)}</span>
          </>
        )}
        {!showCount && <span className="text-xs font-medium">GitHub</span>}
      </a>
    </Button>
  );
}
