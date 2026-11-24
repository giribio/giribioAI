import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, HelpCircle, CheckCircle2, Circle, Check, Link2, Target, Clock } from "lucide-react";
import { GUIDE, type ModuleGuide } from "@/lib/guide";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getModule, sequenceNeighbours, TRACKS, type ModuleId } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";

export function ModulePage({
  moduleId,
  tag,
  title,
  intro,
  prev,
  next,
  children,
}: {
  /** When set, tag and prev/next come from the curriculum sequence and a completion toggle is shown. */
  moduleId?: ModuleId;
  tag?: string;
  title: string;
  intro: string;
  prev?: { to: string; label: string };
  next?: { to: string; label: string };
  children: ReactNode;
}) {
  let resolvedTag = tag ?? "";
  let resolvedPrev = prev;
  let resolvedNext = next;
  let trackLabel: string | undefined;
  if (moduleId) {
    const nb = sequenceNeighbours(moduleId);
    const track = TRACKS.find((t) => t.id === getModule(moduleId).track);
    trackLabel = track?.title;
    if (nb.index >= 0) {
      resolvedTag = `/ module ${String(nb.index + 1).padStart(2, "0")}`;
      resolvedPrev = nb.prev ? { to: nb.prev.to, label: `Back · ${nb.prev.short}` } : undefined;
      resolvedNext = nb.next ? { to: nb.next.to, label: `Next · ${nb.next.short}` } : { to: "/path", label: "Finish · Learning path" };
    }
  }

  const guide = moduleId ? GUIDE[moduleId] : undefined;

  return (
    <article className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs text-primary uppercase tracking-wider">
        {resolvedTag}
        {trackLabel && <span className="text-muted-foreground"> · {trackLabel}</span>}
      </p>
      <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">{title}</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-3xl">{intro}</p>
      {guide && <GoalsCard guide={guide} />}
      <div className="mt-10 space-y-10">{children}</div>
      {guide && moduleId && <SelfCheck key={moduleId} goals={guide.goals} />}
      {moduleId && <CompleteToggle moduleId={moduleId} className="mt-6" />}
      <nav className="mt-8 pt-8 border-t border-border flex justify-between gap-4 text-sm">
        {resolvedPrev ? (
          <Link to={resolvedPrev.to} className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> {resolvedPrev.label}
          </Link>
        ) : <span />}
        {resolvedNext ? (
          <Link to={resolvedNext.to} className="inline-flex items-center gap-2 text-primary font-medium">
            {resolvedNext.label} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : <span />}
      </nav>
    </article>
  );
}

/** Top-of-module signposting: time, goals and a first thing to try. */
function GoalsCard({ guide }: { guide: ModuleGuide }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5 grid md:grid-cols-[1fr_auto] gap-4 shadow-sm">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-primary">
          <Target className="h-3.5 w-3.5" /> By the end you can
        </div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {guide.goals.map((g) => (
            <li key={g} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-g-green shrink-0" />{g}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Try this first:</span> {guide.tryFirst}</p>
      </div>
      <div className="flex md:flex-col gap-3 md:items-end text-xs font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><Clock className="h-3.5 w-3.5" /> about {guide.minutes} min</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"><HelpCircle className="h-3.5 w-3.5" /> hover ? for help</span>
      </div>
    </div>
  );
}

/** End-of-module self-check. Ticks are not saved; they only nudge reflection. */
function SelfCheck({ goals }: { goals: string[] }) {
  const [ticked, setTicked] = useState<boolean[]>(() => goals.map(() => false));
  const all = ticked.every(Boolean);
  return (
    <section className={`mt-14 rounded-xl border p-5 ${all ? "border-success/40 bg-success/5" : "border-border bg-secondary/30"}`}>
      <h2 className="text-lg font-semibold">Check yourself</h2>
      <p className="text-sm text-muted-foreground mt-1">Tick each one you could explain to a friend. If you can't yet, scroll back up and replay the lab.</p>
      <ul className="mt-3 space-y-2">
        {goals.map((g, i) => (
          <li key={g}>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={ticked[i]} onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))} className="mt-0.5 accent-primary h-4 w-4" />
              <span className={ticked[i] ? "text-foreground" : "text-muted-foreground"}>I can {g.charAt(0).toLowerCase() + g.slice(1)}</span>
            </label>
          </li>
        ))}
      </ul>
      {all && <p className="mt-3 text-sm text-success font-medium">Nice work. Mark the module complete below and move on.</p>}
    </section>
  );
}

/** "Mark as complete" card. Progress is stored only in this browser. */
export function CompleteToggle({ moduleId, className = "" }: { moduleId: ModuleId; className?: string }) {
  const { isComplete, toggleComplete } = useProgress();
  const done = isComplete(moduleId);
  return (
    <div className={`rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${done ? "border-success/40 bg-success/5" : "border-border bg-card"} ${className}`}>
      <div className="flex items-center gap-3">
        {done ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
        <div>
          <div className="text-sm font-medium">{done ? "Module complete" : "Finished exploring?"}</div>
          <div className="text-xs text-muted-foreground">Progress is saved only in this browser.</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => toggleComplete(moduleId)}
        className={`text-sm px-3 py-1.5 rounded-md border transition ${done ? "border-border hover:bg-secondary" : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"}`}
      >
        {done ? "Mark as not done" : "Mark as complete"}
      </button>
    </div>
  );
}

export function Section({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section>
      {kicker && <p className="font-mono text-xs text-success uppercase tracking-wider mb-1">{kicker}</p>}
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function Lab({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border bg-secondary/60 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live lab · {title}</span>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

export function KeyTerm({ term, def }: { term: string; def: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4">
      <div className="font-mono text-sm text-primary">{term}</div>
      <div className="text-sm text-muted-foreground mt-1">{def}</div>
    </div>
  );
}

/** Small reset button used at the top of every lab. Pass `share` to also show a copy-link button. */
export function ResetButton({ onClick, share }: { onClick: () => void; share?: boolean }) {
  return (
    <div className="flex justify-end gap-2 mb-2">
      {share && <ShareButton />}
      <button onClick={onClick} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
    </div>
  );
}

/** Copies the current URL (which carries the lab settings) to the clipboard. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    // let the debounced URL writer catch up with the latest change first
    await new Promise((r) => setTimeout(r, 300));
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link to share your experiment:", window.location.href);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy a link that reopens this lab with your exact settings"
      className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition ${copied ? "border-success/50 text-success bg-success/10" : "border-border hover:bg-secondary"}`}
    >
      {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
      {copied ? "Link copied" : "Share setup"}
    </button>
  );
}

/** Mono label with optional help tooltip, used for lab controls. */
export function FieldLabel({ children, help, htmlFor }: { children: ReactNode; help?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
      {children}
      {help && <Help label={typeof children === "string" ? children : undefined}>{help}</Help>}
    </label>
  );
}

/**
 * Tiny "?" icon that reveals help text on hover/focus.
 * Use inline next to any parameter label or option name.
 */
export function Help({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label ? `Help: ${label}` : "Help"}
            className="inline-flex items-center justify-center align-middle ml-1 h-4 w-4 rounded-full text-muted-foreground hover:text-primary focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
