"use client";

import { useQuery } from "@tanstack/react-query";
import { Github, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitHubButtonProps {
  repo: string; // Format: "owner/repo"
  showCount?: boolean;
}

export function GitHubButton({
  repo,
  showCount = true,
}: Readonly<GitHubButtonProps>) {
  const { data: stars = null, isLoading: loading } = useQuery({
    queryKey: ["github-stars", repo],
    queryFn: async () => {
      const response = await fetch(`https://api.github.com/repos/${repo}`);
      if (!response.ok) {
        throw new Error("Failed to fetch GitHub stars");
      }
      const data = await response.json();
      return (data.stargazers_count as number) ?? null;
    },
    enabled: showCount,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24,
  });

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
