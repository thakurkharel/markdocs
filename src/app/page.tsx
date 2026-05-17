"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">MarkDocs</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/docs")}>Docs</Button>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="ghost" size="sm">Sign in</Button>
              </SignInButton>
              <SignUpButton>
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button size="sm" onClick={() => router.push("/dashboard")}>Dashboard</Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Grid background */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,hsl(var(--background))_70%)]" />

        {/* Glow */}
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            Now in Beta
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Google Docs, but for{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Markdown
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Real-time collaborative editing with multiplayer cursors, inline comments,
            suggestion mode, and full version history. Built for teams that think in markdown.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Show when="signed-out">
              <SignUpButton>
                <Button size="lg" className="px-8 text-base">
                  Start Writing Free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button size="lg" className="px-8 text-base" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Button>
            </Show>
            <Button variant="outline" size="lg" className="px-8 text-base">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              View on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Editor Preview */}
      <section className="relative mx-auto max-w-5xl px-6 pb-20">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-primary/5">
          {/* Fake title bar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="ml-4 text-xs text-muted-foreground">project-readme.md</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex -space-x-1.5">
                <div className="h-5 w-5 rounded-full bg-blue-500 ring-2 ring-card flex items-center justify-center text-[9px] font-bold text-white">T</div>
                <div className="h-5 w-5 rounded-full bg-purple-500 ring-2 ring-card flex items-center justify-center text-[9px] font-bold text-white">S</div>
                <div className="h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-card flex items-center justify-center text-[9px] font-bold text-white">A</div>
              </div>
              <Badge variant="outline" className="text-[10px] h-5">3 editing</Badge>
            </div>
          </div>
          {/* Fake editor content */}
          <div className="p-6 font-mono text-sm leading-relaxed">
            <p className="text-muted-foreground">
              <span className="text-primary/80"># </span>
              <span className="text-foreground font-semibold">Project Architecture</span>
            </p>
            <p className="mt-3 text-muted-foreground">
              <span className="text-primary/80">## </span>
              <span className="text-foreground/90">Overview</span>
            </p>
            <p className="mt-2 text-foreground/70">
              The system uses a <span className="rounded bg-muted px-1.5 py-0.5 text-primary/80">microservices</span> architecture
              with event-driven communication between services.
            </p>
            <div className="mt-3 flex items-start gap-2">
              <span className="text-foreground/70">Each service maintains its own database and communicates</span>
              <span className="relative">
                <span className="text-foreground/70">via</span>
                <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-purple-500/90 px-1.5 py-0.5 text-[10px] text-white">Sarah K</span>
                <span className="border-l-2 border-purple-500 pl-0.5" />
              </span>
            </div>
            <p className="mt-3 text-foreground/70">
              <span className="text-primary/80">- </span>API Gateway handles routing and auth
            </p>
            <p className="text-foreground/70">
              <span className="text-primary/80">- </span>
              <span className="bg-yellow-500/10 border-l-2 border-yellow-500 pl-1">Message queue for async processing</span>
              <span className="ml-2 rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] text-yellow-500">1 comment</span>
            </p>
            <p className="text-foreground/70">
              <span className="text-primary/80">- </span>Shared event schema across all services
            </p>
            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">Suggestion from Alex M</p>
              <p className="text-foreground/50 line-through text-xs">We should use REST for internal communication</p>
              <p className="text-emerald-400/80 text-xs mt-0.5">Consider using gRPC for internal service-to-service calls for better performance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              All the collaboration tools of Google Docs, designed for developers.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "Multiplayer Cursors",
                desc: "See everyone editing in real-time. Each collaborator gets a named cursor with their color.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
                title: "Inline Comments",
                desc: "Comment on any selection. Discuss, resolve, and track feedback without leaving the editor.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ),
                title: "Suggestion Mode",
                desc: "Propose changes without editing directly. Authors accept or reject with one click.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
                title: "Version History",
                desc: "Full edit timeline with diffs. See who changed what and when. Never lose work.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                ),
                title: "CLI + MCP Access",
                desc: "Full CLI for power users. MCP server lets AI agents read, comment, and suggest on your docs.",
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                ),
                title: "Multi-Tenant",
                desc: "Workspaces, teams, and granular permissions. Each organization gets isolated data.",
              },
            ].map((feature) => (
              <Card key={feature.title} className="border-border/50 bg-card/50 transition-colors hover:border-primary/20">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get started in seconds
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "1", title: "Create a doc", desc: "Start a new markdown document from the dashboard or CLI." },
              { step: "2", title: "Share the link", desc: "Invite teammates. Everyone gets real-time cursors instantly." },
              { step: "3", title: "Collaborate", desc: "Comment, suggest, review, and merge — all in the same place." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary/30 text-xl font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source / Support */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card text-3xl">
            ☕
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free and open source
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-lg leading-relaxed">
            MarkDocs is free for everyone — no paywalls, no feature gates, no catch.
            If it saves your team time, consider supporting the project.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button variant="outline" size="lg" className="px-8 text-base">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-yellow-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              Buy us a coffee
            </Button>
            <Button variant="ghost" size="lg" className="px-8 text-base">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Star on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to write together?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            No signup required to try. Just create and start writing.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Show when="signed-out">
              <SignUpButton>
                <Button size="lg" className="px-8 text-base">
                  Get Started Free
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button size="lg" className="px-8 text-base" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </Show>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <span className="text-sm font-semibold">MarkDocs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Built with Next.js, Yjs, Supabase, and too much coffee.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="transition-colors hover:text-foreground">Docs</a>
              <a href="#" className="transition-colors hover:text-foreground">GitHub</a>
              <a href="#" className="transition-colors hover:text-foreground">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
