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
    <Card className="border-border/60 bg-card/60 backdrop-blur-xs shadow-xs transition-smooth hover:border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold tracking-tight">Useful Links</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Helpful resources and tools for downloading and managing content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {links.map((link) => (
            <Button
              key={link.url}
              variant="outline"
              className="group h-auto flex-col items-start p-3.5 text-left transition-smooth hover-lift border-border/60 hover:border-primary/40 hover:bg-accent/40"
              asChild
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="w-full">
                <div className="flex items-start gap-2.5 w-full">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground shrink-0 mt-0.5">
                    {link.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-medium text-sm truncate text-foreground group-hover:text-primary transition-colors">
                        {link.title}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    {link.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1 block">
                        {link.description}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
