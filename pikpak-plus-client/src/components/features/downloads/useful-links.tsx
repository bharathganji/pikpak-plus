import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Rocket, Link, ExternalLink } from "lucide-react";

interface UsefulLink {
  title: string;
  url: string;
  icon: React.ReactNode;
  description?: string;
}

const links: UsefulLink[] = [
  {
    title: "Torrent Search",
    url: "https://jackett.pikpak-plus.com/",
    icon: <Search className="h-4 w-4" />,
    description: "Search for torrents",
  },
  {
    title: "PikPak Invitation (Premium)",
    url: "https://mypikpak.com/drive/activity/invited?invitation-code=47295398",
    icon: <Rocket className="h-4 w-4" />,
    description: "Get premium access",
  },
  {
    title: "Navi Downloader Android",
    url: "https://github.com/TachibanaGeneralLaboratories/download-navi/releases/",
    icon: <Link className="h-4 w-4" />,
    description: "Android download manager",
  },
  {
    title: "CX File Explorer Android",
    url: "https://cxfileexplorer.com/",
    icon: <Link className="h-4 w-4" />,
    description: "Android file manager",
  },
  {
    title: "OwlFiles",
    url: "https://www.skyjos.com/owlfiles/",
    icon: <Link className="h-4 w-4" />,
    description: "Multi-platform file manager",
  },
  {
    title: "VLC Media Player",
    url: "https://www.videolan.org/vlc/",
    icon: <Link className="h-4 w-4" />,
    description: "Media player",
  },
  {
    title: "Just (Video) Player",
    url: "https://play.google.com/store/apps/details?id=com.brouken.player",
    icon: <Link className="h-4 w-4" />,
    description: "Android video player",
  },
  {
    title: "RaiDrive",
    url: "https://www.raidrive.com/download",
    icon: <Link className="h-4 w-4" />,
    description: "Mount cloud storage as drive",
  },
];

export function UsefulLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Useful Links</CardTitle>
        <CardDescription>
          Helpful resources and tools for downloading and managing content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map((link) => (
            <Button
              key={link.url}
              variant="outline"
              className="h-auto flex-col items-start p-4 text-left hover:bg-accent"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <div className="flex items-center gap-2 w-full mb-1">
                  {link.icon}
                  <span className="font-medium text-sm flex-1">
                    {link.title}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                {link.description && (
                  <span className="text-xs text-muted-foreground">
                    {link.description}
                  </span>
                )}
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
