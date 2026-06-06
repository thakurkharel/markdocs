"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { UserMenu } from "@/components/user-menu";

interface ApiKeyInfo {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface InviteInfo {
  id: string;
  code: string;
  claimedBy: string | null;
  claimedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [inviteCopied, setInviteCopied] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) setInvites(await res.json());
    } catch {}
  }, []);

  const createInvite = async () => {
    const res = await fetch("/api/invites", { method: "POST" });
    if (res.ok) fetchInvites();
  };

  const copyInviteLink = async (code: string) => {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setInviteCopied(code);
    setTimeout(() => setInviteCopied(null), 2000);
  };

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) setKeys(await res.json());
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); fetchInvites(); }, [fetchKeys, fetchInvites]);

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() || "Default" }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setKeyName("");
        setCreateOpen(false);
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to create key:", err);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        setRevokeId(null);
      }
    } catch (err) {
      console.error("Failed to revoke key:", err);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your API keys for CLI and MCP access.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>Dashboard</Button>
            <UserMenu />
          </div>
        </header>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription className="mt-1">
                  Keys are used to authenticate the CLI and MCP server.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Key
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              </div>
            )}

            {!loading && keys.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No API keys yet. Create one to get started with the CLI or MCP.</p>
              </div>
            )}

            {!loading && keys.length > 0 && (
              <div className="space-y-3">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{k.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <code className="rounded bg-muted px-1.5 py-0.5">{k.prefix}...{" "}</code>
                        {k.lastUsedAt
                          ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                          : "Never used"
                        }
                        {" · "}Created {new Date(k.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRevokeId(k.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invite Links</CardTitle>
                <CardDescription className="mt-1">
                  Generate a link to invite someone to claim a handle on this instance.
                </CardDescription>
              </div>
              <Button size="sm" onClick={createInvite}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invites.length === 0 && (
              <div className="py-4 text-center">
                <p className="text-sm text-muted-foreground">No invites yet. Create one to share with a teammate.</p>
              </div>
            )}
            {invites.length > 0 && (
              <div className="space-y-3">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {inv.claimedBy ? (
                          <span className="text-muted-foreground">Claimed</span>
                        ) : inv.expiresAt && new Date(inv.expiresAt) < new Date() ? (
                          <span className="text-destructive">Expired</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                        )}
                        {" · "}Created {new Date(inv.createdAt).toLocaleDateString()}
                        {inv.expiresAt && !inv.claimedBy && (
                          <> · Expires {new Date(inv.expiresAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    {!inv.claimedBy && inv.expiresAt && new Date(inv.expiresAt) > new Date() && (
                      <Button size="sm" variant="outline" onClick={() => copyInviteLink(inv.code)}>
                        {inviteCopied === inv.code ? "Copied!" : "Copy link"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Quick Setup</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            After creating an API key, configure your environment:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
{`export MARKDOCS_API_KEY=mdk_your_key_here
export MARKDOCS_URL=https://markdocs.sh`}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            See the <a href="https://markdocs.sh/docs/cli" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">CLI docs</a> and{" "}
            <a href="https://markdocs.sh/docs/mcp" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">MCP docs</a> for full setup guides.
          </p>
        </div>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Give your key a name to help you identify it later.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Key name (e.g. CLI, MCP Server)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Reveal Dialog */}
      <Dialog open={!!newKey} onOpenChange={(open) => { if (!open) setNewKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">{newKey}</code>
            <Button size="sm" variant="outline" onClick={() => handleCopy(newKey!)}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <Dialog open={!!revokeId} onOpenChange={(open) => { if (!open) setRevokeId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This key will immediately stop working. Any CLI or MCP connections using it will fail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => revokeId && handleRevoke(revokeId)}>Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
