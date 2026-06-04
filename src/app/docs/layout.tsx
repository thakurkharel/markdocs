import Link from "next/link";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/mcp", label: "MCP Server" },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Mark<span className="text-primary">Docs</span>
          </Link>
          <nav className="flex items-center gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        {children}
      </main>
    </div>
  );
}
