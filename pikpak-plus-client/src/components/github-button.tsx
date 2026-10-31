"use client";

import { useEffect, useState } from "react";
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
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

export function GitHubButton({
  repo,
  showCount = true,
}: Readonly<GitHubButtonProps>) {
  const cacheKey = `${CACHE_KEY_PREFIX}${repo}`;
  const [stars, setStars] = useState<number | null>(null);
  const [loading, setLoading] = useState(showCount);

  useEffect(() => {
    if (!showCount) {
      return;
    }

    let ignore = false;

    const loadStars = async () => {
      // Check cache first
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed: CachedStars = JSON.parse(stored);
          const now = Date.now();
          if (now - parsed.timestamp < CACHE_DURATION) {
            if (!ignore) {
              setStars(parsed.count);
              setLoading(false);
            }
            return;
          } else {
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (e) {
        console.error("Failed to parse cached GitHub stars:", e);
        localStorage.removeItem(cacheKey);
      }

      // Otherwise fetch from API
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`);
        if (response.ok) {
          const data = await response.json();
          const starCount = data.stargazers_count;
          if (!ignore) {
            setStars(starCount);
          }

          // Cache the result
          const cacheData = {
            count: starCount,
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch GitHub stars:", error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    Promise.resolve().then(loadStars);

    return () => {
      ignore = true;
    };
  }, [repo, showCount, cacheKey]);

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
