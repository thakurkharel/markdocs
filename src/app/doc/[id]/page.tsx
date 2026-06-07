"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EditorView, basicSetup } from "codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { yCollab } from "y-codemirror.next";
import { ViewPlugin } from "@codemirror/view";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/auth-provider";
import { UserMenu } from "@/components/user-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { Search, Check } from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Author {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface Comment {
  id: string;
  documentId: string;
  authorId: string;
  author: Author;
  content: string;
  fromPos: number;
  toPos: number;
  parentId: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

interface Suggestion {
  id: string;
  documentId: string;
  authorId: string;
  author: Author;
  originalText: string;
  suggestedText: string;
  fromPos: number;
  toPos: number;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  documentId: string;
  authorId: string;
  author: Author;
  action: string;
  diff: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AwarenessUser {
  name: string;
  color: string;
  colorLight: string;
  avatarUrl?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F0B27A", "#82E0AA",
];

function getRandomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
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

function getUserInitial(name: string | null): string {
  return (name || "?").charAt(0).toUpperCase();
}

function getDisplayName(author: Author): string {
  return author.name || "Anonymous";
}

function formatHistoryAction(entry: HistoryEntry): string {
  const meta = entry.metadata as Record<string, unknown> | null;
  switch (entry.action) {
    case "document.created":
      return `Created document "${meta?.title || ""}"`;
    case "document.title_changed":
      return `Renamed "${meta?.oldTitle}" → "${meta?.newTitle}"`;
    case "document.archived":
      return "Archived this document";
    case "comment.added":
      return `Commented: "${truncate(meta?.content as string, 60)}"`;
    case "comment.resolved":
      return "Resolved a comment";
    case "comment.deleted":
      return "Deleted a comment";
    case "suggestion.added":
      return `Suggested: "${truncate(meta?.suggestedText as string, 60)}"`;
    case "suggestion.accepted":
      return "Accepted a suggestion";
    case "suggestion.rejected":
      return "Rejected a suggestion";
    case "document.content_edited":
      return "Edited document content";
    default:
      return entry.action;
  }
}

function truncate(str: string | undefined | null, len: number): string {
  if (!str) return "";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

// ── Component ────────────────────────────────────────────────

export default function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // User state
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [userName, setUserName] = useState("Anonymous");
  const [userColor, setUserColor] = useState("#2383e2");

  // Editor state
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [sidebarTab, setSidebarTab] = useState("comments");
  const [docTitle, setDocTitle] = useState("Untitled");
  const [editorContent, setEditorContent] = useState("");

  // Collaboration state
  const [activeUsers, setActiveUsers] = useState<Map<number, AwarenessUser>>(new Map());
  const [ready, setReady] = useState(false);
  const [wsProvider, setWsProvider] = useState<WebsocketProvider | null>(null);

  // Sidebar data
  const [comments, setComments] = useState<Comment[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commentFilter, setCommentFilter] = useState<"active" | "resolved">("active");
  const [suggestionFilter, setSuggestionFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  // Comment form
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number; text: string } | null>(null);
  const [floatingToolbarPos, setFloatingToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [showSuggestionInput, setShowSuggestionInput] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");

  // Mobile sidebar
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);

  // Share dialog
  const [shareOpen, setShareOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; handle: string; name: string | null; avatarUrl: string | null }[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

  // ── User Setup ─────────────────────────────────────────────

  useEffect(() => {
    let name = user?.name || localStorage.getItem("markdocs-user") || "Anonymous";
    let color = localStorage.getItem("markdocs-color");

    setUserName(name);

    if (!color) {
      color = getRandomColor();
      localStorage.setItem("markdocs-color", color);
    }
    setUserColor(color);
  }, [user]);

  // ── Fetch Document Title ──────────────────────────────────

  useEffect(() => {
    async function fetchDoc() {
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (res.ok) {
          const doc = await res.json();
          setDocTitle(doc.title);
        }
      } catch {
        // Document might not exist yet in API
      }
    }
    fetchDoc();
  }, [id]);

  // ── Yjs + CodeMirror Setup ────────────────────────────────

  useEffect(() => {
    if (!editorRef.current) return;

    const ydoc = new Y.Doc();
    const wsUrl = `ws${window.location.protocol === "https:" ? "s" : ""}://${window.location.host}`;
    const provider = new WebsocketProvider(wsUrl, `ws/${id}`, ydoc, { connect: true });
    const ytext = ydoc.getText("content");

    ydocRef.current = ydoc;
    providerRef.current = provider;
    ytextRef.current = ytext;
    setWsProvider(provider);

    const currentName = user?.name || localStorage.getItem("markdocs-user") || "Anonymous";
    const currentColor = localStorage.getItem("markdocs-color") || getRandomColor();

    provider.awareness.setLocalStateField("user", {
      name: currentName,
      color: currentColor,
      colorLight: currentColor + "40",
      avatarUrl: user?.avatarUrl || null,
    });

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates() as Map<number, { user?: AwarenessUser }>;
      const users = new Map<number, AwarenessUser>();
      states.forEach((state, clientId) => {
        if (state.user && clientId !== provider.awareness.clientID) {
          users.set(clientId, state.user);
        }
      });
      setActiveUsers(new Map(users));
    };

    provider.awareness.on("change", onAwarenessChange);

    const editorTheme = EditorView.theme({
      "&": { height: "100%", background: "transparent" },
      ".cm-scroller": { overflow: "auto" },
    });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        setEditorContent(update.state.doc.toString());
      }
      if (update.selectionSet || update.docChanged) {
        const sel = update.state.selection.main;
        if (sel.from !== sel.to) {
          const text = update.state.doc.sliceString(sel.from, sel.to);
          // Get screen coordinates for the floating toolbar
          const coords = update.view.coordsAtPos(sel.to);
          setSelectionRange({ from: sel.from, to: sel.to, text });
          if (coords) {
            setFloatingToolbarPos({ x: coords.left, y: coords.bottom + 8 });
          }
        } else {
          setSelectionRange(null);
          setFloatingToolbarPos(null);
          setShowSuggestionInput(false);
          setSuggestionText("");
        }
      }
    });

    // Plugin to inject avatar initials into remote cursor labels
    const cursorAvatarPlugin = ViewPlugin.define((view) => {
      const patchCursors = () => {
        const carets = view.dom.querySelectorAll(".cm-ySelectionCaret");
        carets.forEach((caret) => {
          const info = caret.querySelector(".cm-ySelectionInfo") as HTMLElement | null;
          if (!info || info.querySelector(".cm-yAvatarBubble")) return;
          const name = info.textContent || "?";
          const color = (caret as HTMLElement).style.backgroundColor || "#888";
          const bubble = document.createElement("span");
          bubble.className = "cm-yAvatarBubble";
          bubble.textContent = name.charAt(0).toUpperCase();
          bubble.style.cssText = `
            display: inline-flex; align-items: center; justify-content: center;
            width: 14px; height: 14px; border-radius: 50%;
            background: ${color}; color: white; font-size: 8px; font-weight: 700;
            margin-right: 3px; flex-shrink: 0; font-family: system-ui, sans-serif;
          `;
          info.insertBefore(bubble, info.firstChild);
          // Style the info label to be a pill with avatar
          info.style.display = "flex";
          info.style.alignItems = "center";
          info.style.borderRadius = "8px";
          info.style.padding = "1px 6px 1px 2px";
          info.style.fontSize = "10px";
          info.style.fontFamily = "system-ui, sans-serif";
        });
      };
      const observer = new MutationObserver(patchCursors);
      observer.observe(view.dom, { childList: true, subtree: true });
      patchCursors();
      return {
        update: patchCursors,
        destroy: () => observer.disconnect(),
      };
    });

    const view = new EditorView({
      parent: editorRef.current,
      state: EditorState.create({
        doc: "",
        extensions: [
          basicSetup,
          keymap.of(defaultKeymap),
          markdown({ codeLanguages: languages }),
          ...(resolvedTheme === "dark" ? [oneDark] : []),
          editorTheme,
          updateListener,
          yCollab(ytext, provider.awareness),
          cursorAvatarPlugin,
        ],
      }),
    });

    editorViewRef.current = view;

    provider.on("sync", (synced: boolean) => {
      if (synced) {
        setReady(true);
        setEditorContent(ytext.toString());
      }
    });

    return () => {
      setWsProvider(null);
      view.destroy();
      provider.awareness.off("change", onAwarenessChange);
      provider.destroy();
      ydoc.destroy();
    };
  }, [id, resolvedTheme]);

  // ── Fetch Sidebar Data ────────────────────────────────────

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}/comments?threaded=true`);
      if (res.ok) setComments(await res.json());
    } catch { /* ignore */ }
  }, [id]);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}/suggestions`);
      if (res.ok) setSuggestions(await res.json());
    } catch { /* ignore */ }
  }, [id]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}/history`);
      if (res.ok) setHistory(await res.json());
    } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    fetchComments();
    fetchSuggestions();
    fetchHistory();
  }, [fetchComments, fetchSuggestions, fetchHistory]);

  // Auto-refresh history every 30s
  useEffect(() => {
    if (sidebarTab !== "history") return;
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [sidebarTab, fetchHistory]);

  // ── WS Realtime Notifications ──────────────────────────────
  useRealtimeTable(wsProvider, "comments", fetchComments);
  useRealtimeTable(wsProvider, "suggestions", fetchSuggestions);
  useRealtimeTable(wsProvider, "edit_history", fetchHistory);

  // ── Title Update ──────────────────────────────────────────

  const handleTitleBlur = async (newTitle: string) => {
    const title = newTitle.trim() || "Untitled";
    setDocTitle(title);
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch { /* ignore */ }
  };

  // ── Comment Actions ───────────────────────────────────────

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await fetch(`/api/documents/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          from_pos: selectionRange?.from ?? 0,
          to_pos: selectionRange?.to ?? 0,
        }),
      });
      setNewComment("");
      setSelectionRange(null);
      fetchComments();
    } catch { /* ignore */ }
  };

  const handleResolveComment = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}/resolve`, {
        method: "PATCH",
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      fetchComments();
    } catch { /* ignore */ }
  };

  const handleReplyComment = async (commentId: string) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`/api/comments/${commentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      setReplyText("");
      setReplyingTo(null);
      fetchComments();
    } catch { /* ignore */ }
  };

  const handleUnresolveComment = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}/unresolve`, {
        method: "PATCH",
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  // ── Suggestion Actions ────────────────────────────────────

  const handleAcceptSuggestion = async (suggestion: Suggestion) => {
    if (ytextRef.current) {
      const ytext = ytextRef.current;
      const currentText = ytext.toString();
      const original = suggestion.originalText;
      const idx = currentText.indexOf(original, Math.max(0, suggestion.fromPos - 50));
      if (idx !== -1) {
        ydocRef.current?.transact(() => {
          ytext.delete(idx, original.length);
          ytext.insert(idx, suggestion.suggestedText);
        });
      }
    }
    try {
      await fetch(`/api/suggestions/${suggestion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });
      fetchSuggestions();
    } catch { /* ignore */ }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await fetch(`/api/suggestions/${suggestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      fetchSuggestions();
    } catch { /* ignore */ }
  };

  // ── Create Suggestion ─────────────────────────────────────

  const handleCreateSuggestion = async () => {
    if (!selectionRange || !editorViewRef.current || !suggestionText.trim()) return;

    try {
      await fetch(`/api/documents/${id}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_text: selectionRange.text,
          suggested_text: suggestionText.trim(),
          from_pos: selectionRange.from,
          to_pos: selectionRange.to,
        }),
      });
      fetchSuggestions();
      setDesktopSidebarOpen(true);
      setSidebarTab("suggestions");
      setSuggestionText("");
      setShowSuggestionInput(false);
      setSelectionRange(null);
      setFloatingToolbarPos(null);
    } catch { /* ignore */ }
  };

  // ── Share / Collaborator Actions ─────────────────────────

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setAllUsers(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${id}/collaborators`);
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>((data.collaborators || []).map((c: any) => c.user.id));
        setSharedUserIds(ids);
        setIsOwner(data.owner?.id === user?.id);
      }
    } catch { /* ignore */ }
  }, [id, user?.id]);

  useEffect(() => {
    if (shareOpen) {
      fetchAllUsers();
      fetchCollaborators();
      setShareSearch("");
      setShareError("");
    }
  }, [shareOpen, fetchAllUsers, fetchCollaborators]);

  const toggleShareUser = async (targetUser: { id: string; handle: string }) => {
    setShareError("");
    setShareSaving(true);
    const isShared = sharedUserIds.has(targetUser.id);

    try {
      if (isShared) {
        const res = await fetch(`/api/documents/${id}/collaborators`);
        if (res.ok) {
          const data = await res.json();
          const collab = (data.collaborators || []).find((c: any) => c.user.id === targetUser.id);
          if (collab) {
            await fetch(`/api/documents/${id}/collaborators`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collaboratorId: collab.id }),
            });
          }
        }
        setSharedUserIds((prev) => { const next = new Set(prev); next.delete(targetUser.id); return next; });
      } else {
        const res = await fetch(`/api/documents/${id}/collaborators`, {
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

  // ── Filtered Data ─────────────────────────────────────────

  const filteredComments = comments.filter((c) =>
    commentFilter === "active" ? !c.resolved : c.resolved
  );

  const filteredSuggestions = suggestionFilter === "all"
    ? suggestions
    : suggestions.filter((s) => s.status === suggestionFilter);

  const activeCommentCount = comments.filter((c) => !c.resolved).length;
  const pendingSuggestionCount = suggestions.filter((s) => s.status === "pending").length;

  // ── Sidebar Panel Content ─────────────────────────────────

  const sidebarContent = (
    <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex h-full flex-col">
      <TabsList className="mx-3 mt-3 grid w-auto grid-cols-3">
        <TabsTrigger value="comments" className="text-xs">
          Comments
          {activeCommentCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
              {activeCommentCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="suggestions" className="text-xs">
          Suggestions
          {pendingSuggestionCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
              {pendingSuggestionCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="text-xs">
          History
        </TabsTrigger>
      </TabsList>

      {/* ── Comments Tab ──────────────────────────── */}
      <TabsContent value="comments" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-4">
            {/* Add Comment Form */}
            <div className="space-y-2">
              {selectionRange && (
                <div className="rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground italic truncate">
                  &ldquo;{selectionRange.text.length > 60 ? selectionRange.text.slice(0, 60) + "..." : selectionRange.text}&rdquo;
                </div>
              )}
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="w-full"
              >
                Comment
              </Button>
            </div>

            <Separator />

            {/* Filter */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Filter</span>
              <div className="flex gap-1">
                <Button
                  variant={commentFilter === "active" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setCommentFilter("active")}
                >
                  Active
                  {activeCommentCount > 0 && (
                    <Badge variant="outline" className="ml-1 h-4 min-w-4 px-1 text-[10px]">{activeCommentCount}</Badge>
                  )}
                </Button>
                <Button
                  variant={commentFilter === "resolved" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setCommentFilter("resolved")}
                >
                  Resolved
                </Button>
              </div>
            </div>

            {/* Comment List */}
            {filteredComments.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {commentFilter === "active" ? "No active comments" : "No resolved comments"}
              </p>
            ) : (
              filteredComments.map((thread) => (
                <Card key={thread.id} className={`p-3 ${thread.resolved ? "opacity-50" : ""}`}>
                  {/* Root comment */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar className="h-5 w-5">
                      {thread.author.avatarUrl && (
                        <AvatarImage src={thread.author.avatarUrl} alt={getDisplayName(thread.author)} />
                      )}
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                        {getUserInitial(thread.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold">{getDisplayName(thread.author)}</span>
                    {thread.resolved && (
                      <Badge variant="outline" className="h-4 px-1 text-[10px] text-green-600">resolved</Badge>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {formatRelativeTime(thread.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed mb-2">{thread.content}</p>

                  {/* Replies */}
                  {thread.replies && thread.replies.length > 0 && (
                    <div className="ml-4 border-l-2 border-muted pl-3 space-y-2 mb-2">
                      {thread.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Avatar className="h-4 w-4">
                              {reply.author.avatarUrl && (
                                <AvatarImage src={reply.author.avatarUrl} alt={getDisplayName(reply.author)} />
                              )}
                              <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">
                                {getUserInitial(reply.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[11px] font-medium">{getDisplayName(reply.author)}</span>
                            <span className="text-[10px] text-muted-foreground">{formatRelativeTime(reply.createdAt)}</span>
                          </div>
                          <p className="text-xs leading-relaxed text-muted-foreground">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  {replyingTo === thread.id && (
                    <div className="flex gap-1.5 mb-2">
                      <Input
                        placeholder="Reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReplyComment(thread.id); }}}
                        className="h-7 text-xs"
                        autoFocus
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleReplyComment(thread.id)} disabled={!replyText.trim()}>
                        Send
                      </Button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 justify-end">
                    <Tooltip>
                      <TooltipTrigger
                        render={<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)} />}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent>Reply</TooltipContent>
                    </Tooltip>
                    {!thread.resolved ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleResolveComment(thread.id)} />}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </TooltipTrigger>
                        <TooltipContent>Resolve</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger
                          render={<Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleUnresolveComment(thread.id)} />}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                          </svg>
                        </TooltipTrigger>
                        <TooltipContent>Unresolve</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger
                        render={<Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteComment(thread.id)} />}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ── Suggestions Tab ───────────────────────── */}
      <TabsContent value="suggestions" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 p-4">
            {/* Filter */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Filter</span>
              <div className="flex gap-1">
                {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={suggestionFilter === f ? "secondary" : "ghost"}
                    size="sm"
                    className="h-6 px-2 text-xs capitalize"
                    onClick={() => setSuggestionFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Suggestion List */}
            {filteredSuggestions.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No {suggestionFilter === "all" ? "" : suggestionFilter + " "}suggestions
              </p>
            ) : (
              filteredSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className={`p-3 ${suggestion.status !== "pending" ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-5 w-5">
                      {suggestion.author.avatarUrl && (
                        <AvatarImage src={suggestion.author.avatarUrl} alt={getDisplayName(suggestion.author)} />
                      )}
                      <AvatarFallback className="text-[10px] bg-amber-600 text-white">
                        {getUserInitial(suggestion.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-semibold">{getDisplayName(suggestion.author)}</span>
                    <Badge
                      variant={
                        suggestion.status === "pending" ? "outline"
                          : suggestion.status === "accepted" ? "default"
                          : "destructive"
                      }
                      className="ml-auto text-[10px] h-4"
                    >
                      {suggestion.status}
                    </Badge>
                  </div>
                  <div className="rounded-md bg-muted p-2 font-mono text-xs leading-relaxed">
                    <span className="text-destructive line-through">{suggestion.originalText}</span>
                    <span className="mx-1 text-muted-foreground">{"->"}</span>
                    <span className="text-emerald-400">{suggestion.suggestedText}</span>
                  </div>
                  <div className="mt-1 text-right text-[10px] text-muted-foreground">
                    {formatRelativeTime(suggestion.createdAt)}
                  </div>
                  {suggestion.status === "pending" && (
                    <div className="mt-2 flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRejectSuggestion(suggestion.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </TabsContent>

      {/* ── History Tab ───────────────────────────── */}
      <TabsContent value="history" className="mt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">Timeline</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={fetchHistory}>
                Refresh
              </Button>
            </div>

            {history.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                No history entries yet
              </p>
            ) : (
              <div className="relative ml-2 border-l border-border pl-4">
                {history.map((entry) => (
                  <div key={entry.id} className="relative pb-4 last:pb-0">
                    {/* Timeline dot */}
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="flex items-center gap-2 mb-0.5">
                      <Avatar className="h-4 w-4">
                        {entry.author.avatarUrl && (
                          <AvatarImage src={entry.author.avatarUrl} alt={getDisplayName(entry.author)} />
                        )}
                        <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                          {getUserInitial(entry.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold">{getDisplayName(entry.author)}</span>
                      {entry.source && entry.source !== "web" && (
                        <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono">
                          {entry.source}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatHistoryAction(entry)}</p>
                    {entry.diff && (
                      <div className="mt-1 rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground truncate">
                        {entry.diff}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/dashboard")} />}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>Back to dashboard</TooltipContent>
          </Tooltip>
          <Input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            onBlur={(e) => handleTitleBlur(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="h-8 w-40 border-transparent bg-transparent text-sm font-semibold hover:bg-muted focus:bg-muted md:w-56"
          />
        </div>

        {/* Center: Mode Toggle */}
        <div className="ml-auto flex items-center gap-2 md:ml-0 md:flex-1 md:justify-center">
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            {(["edit", "preview"] as const).map((m) => (
              <Button
                key={m}
                variant={mode === m ? "secondary" : "ghost"}
                size="sm"
                className={`h-7 rounded-md px-3 text-xs font-medium capitalize ${
                  mode === m ? "shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setMode(m)}
              >
                {m === "edit" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                )}
                {m === "preview" && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
                {m}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: Users + Sidebar Toggle */}
        <div className="flex items-center gap-1">
          {/* Active collaborators */}
          {activeUsers.size > 0 && (
            <div className="flex -space-x-1.5 mr-1">
              {Array.from(activeUsers.entries()).map(([clientId, u]) => (
                <Tooltip key={clientId}>
                  <TooltipTrigger render={<span />}>
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarFallback
                        className="text-[10px] font-bold text-white"
                        style={{ background: u.color }}
                      >
                        {getUserInitial(u.name)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{u.name}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Share button */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={() => setShareOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Share
          </Button>

          {/* Current user */}
          <UserMenu />

          {/* Desktop sidebar toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant={desktopSidebarOpen ? "secondary" : "ghost"}
                  size="icon"
                  className="hidden h-8 w-8 md:inline-flex"
                  onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
                />
              }
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </TooltipTrigger>
            <TooltipContent>Toggle sidebar</TooltipContent>
          </Tooltip>

          {/* Mobile sidebar (Sheet) */}
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" />}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="15" y1="3" x2="15" y2="21" />
              </svg>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Document Panel</SheetTitle>
                <SheetDescription>Comments, suggestions, and history</SheetDescription>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor or Preview */}
        <div className="flex-1 overflow-auto">
          {/* Preview layer */}
          <div className={mode === "preview" ? "block" : "hidden"}>
            <div className="mx-auto max-w-3xl px-8 py-8">
              {editorContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {editorContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Nothing to preview yet. Switch to Edit mode and start writing.
                </p>
              )}
            </div>
          </div>
          {/* Editor layer — always mounted to preserve CodeMirror instance */}
          <div className={mode !== "preview" ? "h-full relative" : "hidden"}>
            <div className="h-full px-4 py-2 md:px-12">
              {!ready && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
                  <p className="mt-3 text-xs text-muted-foreground">Connecting to document...</p>
                </div>
              )}
              <div
                ref={editorRef}
                className="mx-auto max-w-3xl h-full"
                style={{ display: ready ? "block" : "none" }}
              />
            </div>

            {/* Floating selection toolbar */}
            {selectionRange && floatingToolbarPos && mode === "edit" && (
              <div
                className="fixed z-50 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg"
                style={{ left: floatingToolbarPos.x, top: floatingToolbarPos.y }}
              >
                {!showSuggestionInput ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => {
                        setDesktopSidebarOpen(true);
                        setSidebarTab("comments");
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Comment
                    </Button>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 px-2.5 text-xs"
                      onClick={() => setShowSuggestionInput(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        <path d="M15 5l4 4" />
                      </svg>
                      Suggest
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col gap-1">
                      <span className="px-1 text-[10px] text-muted-foreground truncate max-w-[200px]">
                        Replace: &ldquo;{selectionRange.text.length > 30 ? selectionRange.text.slice(0, 30) + "..." : selectionRange.text}&rdquo;
                      </span>
                      <Input
                        placeholder="Suggested replacement..."
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateSuggestion();
                          if (e.key === "Escape") { setShowSuggestionInput(false); setSuggestionText(""); }
                        }}
                        className="h-7 w-56 text-xs"
                        autoFocus
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={handleCreateSuggestion}
                      disabled={!suggestionText.trim()}
                    >
                      Submit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-xs text-muted-foreground"
                      onClick={() => { setShowSuggestionInput(false); setSuggestionText(""); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar */}
        {desktopSidebarOpen && (
          <div className="hidden md:flex w-[360px] shrink-0 flex-col border-l border-border bg-card">
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
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
                      disabled={shareSaving || !isOwner}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors disabled:opacity-50 border-b border-border/40 last:border-b-0"
                      onClick={() => toggleShareUser(u)}
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
