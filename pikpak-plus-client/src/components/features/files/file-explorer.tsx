"use client";

import { CreateFolderDialog } from "./create-folder-dialog";
import { CreateShareDialog } from "./create-share-dialog";
import { ManageSharesDialog } from "./manage-shares-dialog";

import { useState, useEffect, useCallback } from "react";
import {
  Folder,
  File,
  Video,
  Music,
  Archive,
  Image as ImageIcon,
  FileText,
  Download,
  Share2,
  Trash2,
  FolderPlus,
  RefreshCw,
  Search,
  ChevronRight,
  Home,
  Copy,
  Check,
  Lock,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualList } from "@/components/ui/virtual-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fileService } from "@/services/file-service";
import { shareService, RemoteShareItem } from "@/services/share-service";
import { FileItem, ShareData } from "@/types/api";
import copy from "copy-to-clipboard";

interface BreadcrumbItem {
  id: string;
  name: string;
}

export function FileExplorer() {
  const [currentFolderId, setCurrentFolderId] = useState<string>("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: "", name: "Home" },
  ]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Direct download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<
    string | null
  >(null);

  // New folder dialog
  const [newFolderOpen, setNewFolderOpen] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [creatingFolder, setCreatingFolder] = useState<boolean>(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [selectedFileForShare, setSelectedFileForShare] =
    useState<FileItem | null>(null);
  const [shareNeedPassword, setShareNeedPassword] = useState<boolean>(false);
  const [shareExpirationDays, setShareExpirationDays] = useState<number>(-1);
  const [creatingShare, setCreatingShare] = useState<boolean>(false);
  const [generatedShare, setGeneratedShare] = useState<ShareData | null>(null);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // Manage Remote Shares dialog
  const [manageSharesOpen, setManageSharesOpen] = useState<boolean>(false);
  const [remoteShares, setRemoteShares] = useState<RemoteShareItem[]>([]);
  const [loadingShares, setLoadingShares] = useState<boolean>(false);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);

  // Load files for current folder
  const loadFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fileService.listFiles(folderId || undefined);
      setFiles(response.files || []);
    } catch (err: any) {
      setError(err.message || "Failed to load directory contents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles(currentFolderId);
  }, [currentFolderId, loadFiles]);

  // Navigate into folder
  const navigateToFolder = (folder: FileItem) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  // Navigate to breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  // Direct file download
  const handleDownload = async (file: FileItem) => {
    setDownloadingId(file.id);
    setDownloadSuccessMessage(null);
    try {
      await fileService.downloadFile(file.id, file.name);
      setDownloadSuccessMessage(`Starting download for "${file.name}"`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Download initiation failed");
    } finally {
      setDownloadingId(null);
    }
  };

  // Create folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      await fileService.createFolder(
        newFolderName.trim(),
        currentFolderId || undefined,
      );
      setNewFolderName("");
      setNewFolderOpen(false);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete file / folder
  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return;

    try {
      await fileService.deleteFile(file.id);
      loadFiles(currentFolderId);
    } catch (err: any) {
      setError(err.message || "Failed to delete item");
    }
  };

  // Open share modal
  const openShareModal = (file: FileItem) => {
    setSelectedFileForShare(file);
    setShareNeedPassword(false);
    setShareExpirationDays(-1);
    setGeneratedShare(null);
    setShareCopied(false);
    setShareDialogOpen(true);
  };

  // Create share
  const handleCreateShare = async () => {
    if (!selectedFileForShare) return;

    setCreatingShare(true);
    try {
      const result = await shareService.createShare(
        selectedFileForShare.id,
        shareNeedPassword,
        shareExpirationDays,
      );
      setGeneratedShare(result);
    } catch (err: any) {
      setError(err.message || "Failed to create share link");
    } finally {
      setCreatingShare(false);
    }
  };

  // Load remote shares
  const loadRemoteShares = async () => {
    setLoadingShares(true);
    try {
      const shares = await shareService.getShares();
      setRemoteShares(shares);
    } catch (err) {
      setRemoteShares([]);
    } finally {
      setLoadingShares(false);
    }
  };

  const openManageSharesModal = () => {
    setManageSharesOpen(true);
    loadRemoteShares();
  };

  // Revoke share
  const handleRevokeShare = async (shareId: string) => {
    setRevokingShareId(shareId);
    try {
      await shareService.revokeShare(shareId);
      setRemoteShares((prev) =>
        prev.filter((s) => (s.share_id || s.id) !== shareId),
      );
    } catch (err: any) {
      setError(err.message || "Failed to revoke share");
    } finally {
      setRevokingShareId(null);
    }
  };

  // Format file size
  const formatSize = (bytesStr?: string): string => {
    if (!bytesStr) return "-";
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return "-";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (err) {
      return dateStr;
    }
  };

  // Determine file icon
  const getFileIcon = (file: FileItem) => {
    const isFolder =
      file.kind === "drive#folder" ||
      file.mime_type === "application/vnd.google-apps.folder" ||
      file.folder_type === "normal" ||
      file.file_category === "folder";

    if (isFolder) {
      return <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />;
    }

    const ext = (file.file_extension || "").toLowerCase();
    const mime = (file.mime_type || "").toLowerCase();

    if (
      ["mp4", "mkv", "avi", "mov", "webm"].includes(ext) ||
      mime.startsWith("video/")
    ) {
      return <Video className="h-5 w-5 text-purple-500" />;
    }
    if (
      ["mp3", "flac", "wav", "aac", "ogg"].includes(ext) ||
      mime.startsWith("audio/")
    ) {
      return <Music className="h-5 w-5 text-emerald-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
      return <Archive className="h-5 w-5 text-orange-500" />;
    }
    if (
      ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ||
      mime.startsWith("image/")
    ) {
      return <ImageIcon className="h-5 w-5 text-pink-500" />;
    }
    if (["pdf", "txt", "doc", "docx", "md"].includes(ext)) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const isFolderItem = (file: FileItem) =>
    file.kind === "drive#folder" ||
    file.mime_type === "application/vnd.google-apps.folder" ||
    file.folder_type === "normal" ||
    file.file_category === "folder";

  // Filter files by search
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderFileRow = (file: FileItem) => {
    const isFolder = isFolderItem(file);
    const isDownloading = downloadingId === file.id;

    return (
      <div
        key={file.id}
        className="flex items-center justify-between p-2.5 hover:bg-accent/40 transition-colors group text-sm"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0">{getFileIcon(file)}</div>

          {isFolder ? (
            <button
              type="button"
              onClick={() => navigateToFolder(file)}
              className="font-medium hover:underline text-left truncate hover:text-primary transition-colors cursor-pointer"
              title={file.name}
            >
              {file.name}
            </button>
          ) : (
            <span className="truncate text-foreground/90" title={file.name}>
              {file.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0 pl-2">
          <span className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap">
            {isFolder ? "Folder" : formatSize(file.size)}
          </span>

          <span className="text-xs text-muted-foreground hidden md:inline whitespace-nowrap">
            {formatDate(file.modified_time || file.created_time)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {!isFolder && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file)}
                  disabled={isDownloading}
                  title="Direct Download"
                  className="h-8 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Download
                    className={`h-3.5 w-3.5 ${isDownloading ? "animate-bounce" : ""}`}
                  />
                  <span className="hidden sm:inline">Download</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openShareModal(file)}
                  title="Create Share Link"
                  className="h-8 px-2 text-xs gap-1 hover:bg-accent"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(file)}
              title="Delete"
              className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 w-full">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Folder className="h-5 w-5 text-primary" />
              File Explorer
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse cloud drive, navigate folders, and initiate direct
              downloads
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={openManageSharesModal}
              className="text-xs gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              Manage Shares
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewFolderOpen(true)}
              className="text-xs gap-1.5"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              New Folder
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadFiles(currentFolderId)}
              disabled={loading}
              title="Refresh files"
              className="h-8 w-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Directory Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 overflow-x-auto py-1 scrollbar-none">
          {breadcrumbs.map((crumb, idx) => (
            <div
              key={crumb.id || "root"}
              className="flex items-center gap-1 shrink-0"
            >
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
              <button
                type="button"
                onClick={() => navigateToBreadcrumb(idx)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? "font-semibold text-foreground pointer-events-none"
                    : "hover:underline cursor-pointer"
                }`}
              >
                {idx === 0 && <Home className="h-3.5 w-3.5" />}
                <span>{crumb.name}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter files in current folder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {downloadSuccessMessage && (
          <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {downloadSuccessMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4 text-xs">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFiles(currentFolderId)}
                className="h-6 text-[11px] ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* File Table / List */}
        {loading ? (
          <div className="space-y-2">
            {[
              { w1: "w-52", w2: "w-16", w3: "w-24" },
              { w1: "w-64", w2: "w-20", w3: "w-20" },
              { w1: "w-40", w2: "w-14", w3: "w-28" },
              { w1: "w-72", w2: "w-24", w3: "w-20" },
              { w1: "w-48", w2: "w-16", w3: "w-24" },
              { w1: "w-60", w2: "w-20", w3: "w-20" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded border border-border/40 bg-card/40"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-5 w-5 rounded shrink-0" />
                  <Skeleton className={`h-4 ${s.w1}`} />
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Skeleton className={`h-4 ${s.w2} hidden sm:block`} />
                  <Skeleton className={`h-4 ${s.w3} hidden md:block`} />
                  <Skeleton className="h-7 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed rounded-lg border-border/60">
            <Folder className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchQuery ? "No matching files found" : "This folder is empty"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Add magnet links or upload items to populate your PikPak storage
            </p>
          </div>
        ) : (
          <div className="rounded-md border border-border/40 overflow-hidden">
            {filteredFiles.length > 25 ? (
              <VirtualList
                items={filteredFiles}
                itemHeight={48}
                height={520}
                keyExtractor={(file) => file.id}
                innerClassName="divide-y divide-border/40"
                renderItem={(file) => renderFileRow(file)}
              />
            ) : (
              <div className="divide-y divide-border/40">
                {filteredFiles.map((file) => renderFileRow(file))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CreateFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        creatingFolder={creatingFolder}
        onCreateFolder={handleCreateFolder}
        parentFolderName={breadcrumbs[breadcrumbs.length - 1].name}
      />

      <CreateShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        fileName={selectedFileForShare?.name}
        generatedShare={generatedShare}
        shareCopied={shareCopied}
        onCopyShare={(url: string) => {
          copy(url);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        }}
        shareNeedPassword={shareNeedPassword}
        setShareNeedPassword={setShareNeedPassword}
        shareExpirationDays={shareExpirationDays}
        setShareExpirationDays={setShareExpirationDays}
        creatingShare={creatingShare}
        onCreateShare={handleCreateShare}
      />

      <ManageSharesDialog
        open={manageSharesOpen}
        onOpenChange={setManageSharesOpen}
        loadingShares={loadingShares}
        remoteShares={remoteShares}
        revokingShareId={revokingShareId}
        onRevokeShare={handleRevokeShare}
        onCopyShare={copy}
      />
    </Card>
  );
}

export default FileExplorer;
