import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { GLOSSARY, slug } from "@/lib/glossary";
import { getModule, TRACKS } from "@/lib/curriculum";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "Glossary | GiriBioAI" },
      { name: "description", content: "Every AI, LLM and Bio-AI term taught in GiriBioAI, from tokens and attention to k-mers and SMILES, each linked to its interactive module." },
      { property: "og:title", content: "Glossary | GiriBioAI" },
    ],
  }),
  component: GlossaryPage,
});

function GlossaryPage() {
  const [q, setQ] = useState("");
  const sorted = useMemo(() => [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" })), []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sorted;
    return sorted.filter((t) => t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s));
  }, [q, sorted]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : "#";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs text-primary uppercase tracking-wider">/ glossary</p>
      <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">Glossary</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
        {GLOSSARY.length} terms from across the modules. Each one links to the lab where you can try it. Tip: press <kbd className="font-mono text-xs rounded border border-border px-1.5 py-0.5">Ctrl K</kbd> anywhere to search.
      </p>

      <div className="mt-8 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter terms, e.g. attention"
          aria-label="Filter glossary"
          className="w-full rounded-full border border-input bg-card pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-1 text-xs font-mono">
        {groups.map(([letter]) => (
          <a key={letter} href={`#letter-${letter}`} className="px-2 py-1 rounded border border-border hover:bg-secondary">{letter}</a>
        ))}
      </div>

      {filtered.length === 0 && <p className="mt-10 text-muted-foreground">No terms match "{q}".</p>}

      <div className="mt-8 space-y-10">
        {groups.map(([letter, terms]) => (
          <section key={letter} id={`letter-${letter}`} className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-primary mb-3">{letter}</h2>
            <dl className="grid sm:grid-cols-2 gap-3">
              {terms.map((t) => {
                const m = getModule(t.module);
                const track = TRACKS.find((x) => x.id === m.track)!;
                return (
                  <div key={t.term} id={slug(t.term)} className="scroll-mt-24 rounded-xl border border-border bg-card p-4 target:border-primary target:ring-2 target:ring-ring/30">
                    <dt className="font-mono text-sm text-primary">{t.term}</dt>
                    <dd className="text-sm text-muted-foreground mt-1">{t.def}</dd>
                    <Link to={m.to} className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary">
                      <span className={`h-1.5 w-1.5 rounded-full ${track.dot}`} /> {m.title}
                    </Link>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
