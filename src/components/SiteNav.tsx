import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Home, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { modulesInTrack, TRACKS, type TrackId } from "@/lib/curriculum";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./CommandPalette";

const GROUPS: { label: string; tracks: TrackId[] }[] = [
  { label: "Learn", tracks: ["foundations", "inside"] },
  { label: "Build", tracks: ["building"] },
  { label: "Labs", tracks: ["labs"] },
];

const LINKS = [
  { to: "/bio-ai", label: "Bio-AI" },
  { to: "/path", label: "Path" },
  { to: "/glossary", label: "Glossary" },
  { to: "/about", label: "About" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 group" aria-label="GiriBioAI home">
      <span className="relative h-8 w-8 rounded-lg grid place-items-center font-bold text-sm text-white shadow-[var(--shadow-glow)] overflow-hidden" style={{ background: "conic-gradient(from 210deg, #4285F4 0 25%, #34A853 0 50%, #FBBC05 0 75%, #4285F4 0)" }}>
        <span className="absolute inset-[3px] rounded-md bg-primary grid place-items-center text-primary-foreground">G</span>
      </span>
      <span className="font-semibold tracking-tight text-lg">
        Giri<span className="text-g-green">Bio</span><span className="text-primary">AI</span>
      </span>
    </Link>
  );
}

const navBtn = "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors";
const navActive = "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-accent-foreground bg-accent";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 backdrop-blur-xl bg-background/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo />
        <nav className="hidden lg:flex items-center gap-0.5 text-sm" aria-label="Main">
          <Link to="/" className={navBtn} activeProps={{ className: navActive }} activeOptions={{ exact: true }}>
            <Home className="h-3.5 w-3.5" /> Home
          </Link>
          {GROUPS.map((g) => (
            <DropdownMenu key={g.label}>
              <DropdownMenuTrigger className={`${navBtn} focus:outline-none data-[state=open]:bg-secondary data-[state=open]:text-foreground`}>
                {g.label} <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 p-2">
                {g.tracks.map((tid, ti) => {
                  const track = TRACKS.find((t) => t.id === tid)!;
                  return (
                    <div key={tid}>
                      {ti > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${track.dot}`} /> {track.title}
                      </DropdownMenuLabel>
                      {modulesInTrack(tid).map((m) => {
                        const Icon = m.icon;
                        return (
                          <DropdownMenuItem key={m.id} asChild className="cursor-pointer items-start gap-3 py-2">
                            <Link to={m.to}>
                              <Icon className={`h-4 w-4 mt-0.5 ${track.color}`} />
                              <span className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {m.title}
                                  {m.isNew && <span className="ml-2 text-[10px] font-mono uppercase rounded bg-success/15 text-success px-1.5 py-0.5">new</span>}
                                </span>
                                <span className="text-xs text-muted-foreground line-clamp-1">{m.desc}</span>
                              </span>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={navBtn} activeProps={{ className: navActive }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <CommandPalette />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="lg:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-secondary" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle><Logo /></SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            <Link to="/" onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary inline-flex items-center gap-1.5" activeOptions={{ exact: true }} activeProps={{ className: "rounded-lg border border-primary bg-accent text-accent-foreground px-3 py-2 text-sm inline-flex items-center gap-1.5" }}>
              <Home className="h-3.5 w-3.5" /> Home
            </Link>
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
                {l.label}
              </Link>
            ))}
          </div>
          {TRACKS.map((t) => (
            <div key={t.id}>
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                <span className={`h-2 w-2 rounded-full ${t.dot}`} /> {t.title}
              </div>
              <div className="space-y-1">
                {modulesInTrack(t.id).map((m) => {
                  const Icon = m.icon;
                  return (
                    <Link key={m.id} to={m.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-secondary" activeProps={{ className: "flex items-center gap-3 rounded-md px-2 py-2 text-sm bg-accent text-accent-foreground" }}>
                      <Icon className={`h-4 w-4 ${t.color}`} /> {m.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 mt-24 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6 py-10 grid gap-6 sm:grid-cols-[1fr_auto] text-sm text-muted-foreground">
        <div className="space-y-2">
          <Logo />
          <p>A hands-on lab for learning AI and large language models, with a Bio-AI track. Everything runs in your browser.</p>
          <p>
            Developed by <span className="text-foreground font-medium">Girinath G Pillai</span> with AI assistance ·{" "}
            <Link to="/about" className="text-primary hover:underline underline-offset-4">About</Link>
          </p>
        </div>
        <div className="flex sm:flex-col gap-x-4 gap-y-1 sm:text-right font-mono text-xs">
          <Link to="/path" className="hover:text-primary">Learning path</Link>
          <Link to="/glossary" className="hover:text-primary">Glossary</Link>
          <span>No GPU · No API keys</span>
        </div>
      </div>
      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #4285F4 0 40%, #34A853 40% 70%, #FBBC05 70% 92%, #EA4335 92%)" }} />
    </footer>
  );
}
