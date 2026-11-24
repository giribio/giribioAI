import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Eye, RotateCcw } from "lucide-react";
import { SEQUENCE, TRACKS, modulesInTrack } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/path")({
  head: () => ({
    meta: [
      { title: "Learning path | GiriBioAI" },
      { name: "description", content: "The GiriBioAI curriculum as tracks: Foundations, Inside the model, Building with LLMs, Bio-AI and hands-on labs, with progress saved in your browser." },
      { property: "og:title", content: "Learning path | GiriBioAI" },
    ],
  }),
  component: PathPage,
});

function PathPage() {
  const { isComplete, isVisited, completed, reset } = useProgress();
  const total = SEQUENCE.length;
  const done = SEQUENCE.filter((id) => completed.includes(id)).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs text-primary uppercase tracking-wider">/ learning path</p>
      <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">Your route through GiriBioAI</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
        Five tracks, from how text becomes tokens to protein language models. Each module ends with a
        "Mark as complete" button. You have finished <span className="text-foreground font-medium">{done} of {total}</span> guided modules.
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${(done / total) * 100}%`, background: "var(--grad-brand)" }} />
        </div>
        <button
          type="button"
          onClick={() => { if (window.confirm("Clear all saved progress in this browser?")) reset(); }}
          className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary"
        >
          <RotateCcw className="h-3 w-3" /> Reset progress
        </button>
      </div>

      <div className="mt-12 space-y-12">
        {TRACKS.map((track) => {
          const mods = modulesInTrack(track.id);
          const tDone = mods.filter((m) => isComplete(m.id)).length;
          return (
            <section key={track.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <span className={`h-3 w-3 rounded-full ${track.dot}`} />
                  <h2 className="text-2xl font-semibold">{track.title}</h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{tDone} / {mods.length} complete</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">{track.blurb}</p>
              <ol className="relative border-l-2 border-border ml-1.5 space-y-4">
                {mods.map((m) => {
                  const Icon = m.icon;
                  const c = isComplete(m.id);
                  const v = isVisited(m.id);
                  const seq = SEQUENCE.indexOf(m.id);
                  return (
                    <li key={m.id} className="pl-6 relative">
                      <span className={`absolute -left-[9px] top-5 h-4 w-4 rounded-full border-2 ${c ? "bg-success border-success" : v ? "bg-background border-primary" : "bg-background border-border"}`} />
                      <Link to={m.to} className={`group flex items-center gap-4 rounded-xl border p-4 transition hover:shadow-[var(--shadow-glow)] ${c ? "border-success/40 bg-success/5" : "border-border bg-card hover:border-primary/50"}`}>
                        <Icon className={`h-6 w-6 shrink-0 ${track.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {seq >= 0 && <span className="font-mono text-xs text-muted-foreground">{String(seq + 1).padStart(2, "0")}</span>}
                            <span className="font-semibold">{m.title}</span>
                            {m.isNew && <span className="text-[10px] font-mono uppercase rounded bg-success/15 text-success px-1.5 py-0.5">new</span>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{m.desc}</p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-mono">
                          {c ? (
                            <><CheckCircle2 className="h-4 w-4 text-success" /> <span className="text-success hidden sm:inline">done</span></>
                          ) : v ? (
                            <><Eye className="h-4 w-4 text-primary" /> <span className="text-primary hidden sm:inline">visited</span></>
                          ) : (
                            <><Circle className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground hidden sm:inline">to do</span></>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
