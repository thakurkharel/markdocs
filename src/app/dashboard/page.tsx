"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus, FileText, Trash2, MoreHorizontal, Users, Share2, Check, Search,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { UserMenu } from "@/components/user-menu";
import { useAuth } from "@/components/auth-provider";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Author {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Document {
  id: string;
  title: string;
  creatorId: string;
  creator: Author;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DocumentTable({
  documents,
  onRowClick,
  onDelete,
  onShare,
  showOwner,
}: {
  documents: Document[];
  onRowClick: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  showOwner?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[50%]">Title</TableHead>
            {showOwner && <TableHead>Owner</TableHead>}
            <TableHead>Updated</TableHead>
            {(onDelete || onShare) && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer group"
              onClick={() => onRowClick(doc.id)}
            >
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-sm truncate">{doc.title}</span>
                </div>
              </TableCell>
              {showOwner && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      {doc.creator.avatarUrl && (
                        <AvatarImage src={doc.creator.avatarUrl} alt={doc.creator.name || "Creator"} />
                      )}
                      <AvatarFallback className="text-[9px]">
                        {(doc.creator.name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground truncate">
                      {doc.creator.name || "Unknown"}
                    </span>
                  </div>
                </TableCell>
              )}
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(doc.updatedAt)}
                </span>
              </TableCell>
              {(onDelete || onShare) && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground opacity-0 group-hover:opacity-100 data-[popup-open]:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      {onShare && (
                        <DropdownMenuItem onClick={() => onShare(doc.id)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(doc.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Share dialog state
  const [shareDocId, setShareDocId] = useState<string | null>(null);
  const [shareSearch, setShareSearch] = useState("");
  const [shareError, setShareError] = useState("");
  const [allUsers, setAllUsers] = useState<{ id: string; handle: string; name: string | null; avatarUrl: string | null }[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<Set<string>>(new Set());
  const [shareSaving, setShareSaving] = useState(false);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setAllUsers(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchCollaborators = useCallback(async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.collaborators || []).map((c: any) => c.user.id));
        setSharedUserIds(ids);
      }
    } catch { /* ignore */ }
  }, []);

  const toggleUser = async (targetUser: { id: string; handle: string }) => {
    if (!shareDocId) return;
    setShareError("");
    setShareSaving(true);

    const isShared = sharedUserIds.has(targetUser.id);

    try {
      if (isShared) {
        // Need collaborator record ID to remove — fetch then delete
        const res = await fetch(`/api/documents/${shareDocId}/collaborators`);
        if (res.ok) {
          const data = await res.json();
          const collab = (data.collaborators || []).find((c: any) => c.user.id === targetUser.id);
          if (collab) {
            await fetch(`/api/documents/${shareDocId}/collaborators`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collaboratorId: collab.id }),
            });
          }
        }
        setSharedUserIds((prev) => { const next = new Set(prev); next.delete(targetUser.id); return next; });
      } else {
        const res = await fetch(`/api/documents/${shareDocId}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handle: targetUser.handle }),
        });
        if (res.ok) {
          setSharedUserIds((prev) => new Set(prev).add(targetUser.id));
        } else {
          const err = await res.json();
          setShareError(err.error || "Failed to share");
        }
      }
    } catch {
      setShareError("Failed to update sharing");
    } finally {
      setShareSaving(false);
    }
  };

  const openShareDialog = (docId: string) => {
    setShareDocId(docId);
    setShareSearch("");
    setShareError("");
    setSharedUserIds(new Set());
    fetchAllUsers();
    fetchCollaborators(docId);
  };

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async () => {
    const title = newTitle.trim() || "Untitled";
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const doc = await res.json();
        router.push(`/doc/${doc.id}`);
      }
    } catch (err) {
      console.error("Failed to create document:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const myDocs = documents.filter((d) => d.creatorId === user?.id);
  const sharedDocs = documents.filter((d) => d.creatorId !== user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
                <FileText className="h-3.5 w-3.5 text-background" />
              </div>
              <span className="text-base font-semibold tracking-tight">MarkDocs</span>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-10">
        {/* Your Documents */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Documents</h2>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Document
            </Button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
            </div>
          )}

          {!loading && myDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No documents yet</h3>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Create your first document to get started.
              </p>
              <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New Document
              </Button>
            </div>
          )}

          {!loading && myDocs.length > 0 && (
            <DocumentTable
              documents={myDocs}
              onRowClick={(id) => router.push(`/doc/${id}`)}
              onShare={(id) => openShareDialog(id)}
              onDelete={(id) => setDeleteConfirm(id)}
            />
          )}
        </section>

        {/* Shared with You */}
        {!loading && sharedDocs.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Shared with You</h2>
              <span className="text-sm text-muted-foreground">({sharedDocs.length})</span>
            </div>
            <DocumentTable
              documents={sharedDocs}
              onRowClick={(id) => router.push(`/doc/${id}`)}
              showOwner
            />
          </section>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Give your document a name to get started.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Document title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" size="lg" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="lg" onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="lg" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" size="lg" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={!!shareDocId} onOpenChange={(open) => !open && setShareDocId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Select teammates to share with.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search handles..."
                value={shareSearch}
                onChange={(e) => setShareSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {shareError && (
              <p className="text-sm text-destructive">{shareError}</p>
            )}

            {/* User list */}
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {allUsers
                .filter((u) => u.id !== user?.id)
                .filter((u) => {
                  if (!shareSearch.trim()) return true;
                  const q = shareSearch.toLowerCase().replace(/^@/, "");
                  return u.handle.toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
                })
                .map((u) => {
                  const isShared = sharedUserIds.has(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={shareSaving}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors disabled:opacity-50 border-b border-border/40 last:border-b-0"
                      onClick={() => toggleUser(u)}
                    >
                      <Checkbox checked={isShared} className="pointer-events-none" />
                      <Avatar className="h-7 w-7">
                        {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                        <AvatarFallback className="text-[10px]">
                          {(u.name || u.handle || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{u.name || u.handle}</p>
                        <p className="text-xs text-muted-foreground">@{u.handle}</p>
                      </div>
                      {isShared && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              {allUsers.filter((u) => u.id !== user?.id).length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No other users yet
                </p>
              )}
            </div>

            {sharedUserIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                Shared with {sharedUserIds.size} {sharedUserIds.size === 1 ? "person" : "people"}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
