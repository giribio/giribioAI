import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Route as RouteIcon, CheckCircle2, Dna } from "lucide-react";
import { MODULES, SEQUENCE, TRACKS, getModule, modulesInTrack } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { totalMinutes } from "@/lib/guide";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GiriBioAI | Learn how AI and LLMs actually work" },
      { name: "description", content: "GiriBioAI is an interactive lab to learn tokens, embeddings, attention, sampling, pre-training, fine-tuning, RAG, agents, evals and Bio-AI with in-browser simulators." },
      { property: "og:title", content: "GiriBioAI | Learn how AI and LLMs actually work" },
      { property: "og:description", content: "Hands-on simulators for tokens, attention, RAG, agents and Bio-AI. No GPU required." },
    ],
  }),
  component: Index,
});

function Index() {
  const { completed, last } = useProgress();
  const doneInSeq = SEQUENCE.filter((id) => completed.includes(id)).length;
  const pct = Math.round((doneInSeq / SEQUENCE.length) * 100);
  const nextUp = SEQUENCE.find((id) => !completed.includes(id));
  const resume = last ? getModule(last) : nextUp ? getModule(nextUp) : undefined;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 surface-grid opacity-40 pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-mono text-muted-foreground mb-6 shadow-sm">
            <Sparkles className="h-3 w-3 text-g-yellow" />
            an open lab for AI, LLMs and Bio-AI
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
            Learn how <span className="text-gradient-brand">AI & LLMs</span> actually work, by playing with them.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
            {SEQUENCE.length} guided modules with browser-native simulators. Tokenize text, map embeddings, watch attention,
            tune sampling, train a tiny model, retrieve documents, wire agents and read DNA like a language. No GPU. No setup.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to={getModule(SEQUENCE[0]).to} className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-[var(--shadow-glow)] hover:bg-primary/90 transition">
              Start at module 01 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/path" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border bg-card hover:bg-secondary transition">
              <RouteIcon className="h-4 w-4 text-g-green" /> See the learning path
            </Link>
            <Link to="/bio-ai" className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border bg-card hover:bg-secondary transition">
              <Dna className="h-4 w-4 text-g-yellow" /> Bio-AI track
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border rounded-2xl overflow-hidden text-sm font-mono shadow-sm">
            {[
              [String(MODULES.length), "modules & labs", "text-g-blue"],
              ["100%", "in-browser", "text-g-green"],
              ["0", "API keys", "text-g-yellow"],
              ["∞", "experiments", "text-g-cyan"],
            ].map(([n, l, c]) => (
              <div key={l} className="bg-card px-5 py-4">
                <div className={`text-2xl font-semibold ${c}`}>{n}</div>
                <div className="text-muted-foreground text-xs uppercase tracking-wider mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Progress */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 grid md:grid-cols-[1fr_auto] gap-6 items-center shadow-sm">
          <div>
            <p className="font-mono text-xs text-primary uppercase tracking-wider">/ your progress</p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold">{pct}%</span>
              <span className="text-sm text-muted-foreground">{doneInSeq} of {SEQUENCE.length} guided modules complete</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--grad-brand)" }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Saved only in this browser. Mark modules complete at the bottom of each page.</p>
          </div>
          {resume && (
            <Link to={resume.to} className="group rounded-xl border border-border bg-secondary/50 hover:border-primary/60 p-4 flex items-center gap-4 min-w-[260px] transition">
              <resume.icon className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <div className="text-xs font-mono text-muted-foreground uppercase">{last ? "Continue" : "Up next"}</div>
                <div className="font-semibold">{resume.title}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition" />
            </Link>
          )}
        </div>
      </section>

      {/* How to learn here */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <p className="font-mono text-xs text-primary uppercase tracking-wider">/ new here? how to learn</p>
        <h2 className="text-2xl md:text-3xl font-bold mt-2">Four steps per module, about {Math.round(totalMinutes / 60)} hours in total</h2>
        <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["1", "Read the goals", "Each module opens with what you'll be able to do and a first thing to try.", "bg-g-blue"],
            ["2", "Read one idea", "Short concept notes. Unfamiliar word? Hover the ? icon or press Ctrl K to search the glossary.", "bg-g-green"],
            ["3", "Play in the live lab", "Change one setting at a time and watch what moves. Reset any time; nothing can break.", "bg-g-yellow"],
            ["4", "Check yourself", "Tick the self-check at the end, mark the module complete and follow Next.", "bg-g-cyan"],
          ].map(([n, title, body, dot]) => (
            <li key={n} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <span className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold text-white ${dot}`}>{n}</span>
              <h3 className="font-semibold mt-3">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">No maths or coding background needed. Start at module 01 and go in order, or jump to any card below.</p>
      </section>

      {/* Modules by track */}
      <section className="mx-auto max-w-7xl px-6 pb-24 space-y-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs text-primary uppercase tracking-wider">/ curriculum</p>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">The full stack of an LLM, plus biology</h2>
          </div>
          <p className="hidden md:block text-sm text-muted-foreground max-w-xs">
            Follow the tracks in order or jump to what you're curious about.
          </p>
        </div>
        {TRACKS.map((track) => (
          <div key={track.id}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`h-2.5 w-2.5 rounded-full ${track.dot}`} />
              <h3 className="text-lg font-semibold">{track.title}</h3>
              <span className="text-sm text-muted-foreground hidden sm:inline">{track.blurb}</span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modulesInTrack(track.id).map((m) => {
                const Icon = m.icon;
                const seq = SEQUENCE.indexOf(m.id);
                const done = completed.includes(m.id);
                return (
                  <Link key={m.id} to={m.to} className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition-all overflow-hidden">
                    <div aria-hidden className="absolute right-4 top-3 text-5xl font-bold font-mono leading-none text-border group-hover:text-primary/25 transition-colors select-none">
                      {seq >= 0 ? String(seq + 1).padStart(2, "0") : ""}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-3 relative">
                      {seq >= 0 ? `Module ${String(seq + 1).padStart(2, "0")} of ${SEQUENCE.length}` : "Open lab · any time"}
                    </div>
                    <div className="flex items-center gap-2 mb-4 relative">
                      <Icon className={`h-7 w-7 ${track.color}`} />
                      {m.isNew && <span className="text-[10px] font-mono uppercase rounded bg-success/15 text-success px-1.5 py-0.5">new</span>}
                      {done && <CheckCircle2 className="h-4 w-4 text-success" aria-label="completed" />}
                    </div>
                    <h4 className="text-lg font-semibold relative">{m.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1.5 relative">{m.desc}</p>
                    <div className="mt-5 text-xs font-mono text-primary inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      open module <ArrowRight className="h-3 w-3" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Concepts strip */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 shadow-sm">
          <p className="font-mono text-xs text-primary uppercase tracking-wider">/ key ideas</p>
          <h2 className="text-3xl font-bold mt-2 mb-8">A model in one paragraph</h2>
          <p className="text-lg leading-relaxed text-muted-foreground max-w-4xl">
            A language model takes <span className="text-foreground font-medium">text</span>, breaks it into{" "}
            <Link to="/tokens" className="text-primary underline-offset-4 hover:underline">tokens</Link> from a fixed{" "}
            <Link to="/vocabulary" className="text-primary underline-offset-4 hover:underline">vocabulary</Link>, turns each into an{" "}
            <Link to="/embeddings" className="text-primary underline-offset-4 hover:underline">embedding</Link> that mixes with its neighbours through attention, and predicts the next token, which is then{" "}
            <Link to="/sampling" className="text-primary underline-offset-4 hover:underline">sampled</Link>.
            It learns this skill during{" "}
            <Link to="/pretraining" className="text-primary underline-offset-4 hover:underline">pre-training</Link> on huge corpora, then is steered with{" "}
            <Link to="/finetuning" className="text-primary underline-offset-4 hover:underline">fine-tuning</Link> and good{" "}
            <Link to="/prompt-builder" className="text-primary underline-offset-4 hover:underline">prompts</Link>. To answer about things it never saw, we attach{" "}
            <Link to="/rag" className="text-primary underline-offset-4 hover:underline">retrieval</Link>. To make it act, we wrap it in{" "}
            <Link to="/orchestration" className="text-primary underline-offset-4 hover:underline">orchestration</Link>, and to trust it we run{" "}
            <Link to="/evals" className="text-primary underline-offset-4 hover:underline">evals</Link>. The same ideas work on the language of life:{" "}
            <Link to="/bio-ai" className="text-primary underline-offset-4 hover:underline">DNA, proteins and molecules</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
