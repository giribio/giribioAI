import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Dices } from "lucide-react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/sampling")({
  head: () => ({
    meta: [
      { title: "Sampling & Decoding | GiriBioAI" },
      { name: "description", content: "How an LLM picks the next token: temperature, top-k, top-p, repetition penalty, greedy and beam search, with a live probability chart." },
      { property: "og:title", content: "Sampling & Decoding | GiriBioAI" },
      { property: "og:description", content: "Turn the decoding knobs and watch next-token probabilities change." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Sampling & Decoding",
          description: "Temperature, top-k, top-p, repetition penalty, greedy decoding and beam search.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/sampling",
        }),
      },
    ],
  }),
  component: SamplingPage,
});

// Hand-built next-token logits for a few prompts. Values are illustrative.
const PROMPTS: { prompt: string; logits: Record<string, number>; already: string[] }[] = [
  {
    prompt: "The scientist looked into the microscope and saw a",
    logits: { cell: 4.2, bacterium: 3.6, virus: 3.1, sample: 2.9, pattern: 2.4, crystal: 2.0, cat: 0.6, dragon: -0.4, galaxy: 0.1, sandwich: -1.2 },
    already: ["scientist", "microscope"],
  },
  {
    prompt: "Once upon a time, in a land far away, there lived a",
    logits: { king: 3.8, princess: 3.5, dragon: 3.3, girl: 2.9, wizard: 2.8, farmer: 2.2, robot: 1.0, spreadsheet: -1.5, lawyer: 0.2, kingdom: 1.4 },
    already: ["time", "land"],
  },
  {
    prompt: "To fix the bug, first open the",
    logits: { file: 4.0, terminal: 3.4, debugger: 3.3, logs: 3.0, editor: 2.8, browser: 2.0, fridge: -1.0, door: 0.2, window: 1.2, bug: 2.1 },
    already: ["fix", "bug"],
  },
];

type Row = { tok: string; logit: number; p: number; kept: boolean };

function distribution(logits: Record<string, number>, temp: number, topK: number, topP: number, rep: number, already: string[]): Row[] {
  const entries = Object.entries(logits).map(([tok, l]) => ({ tok, logit: already.includes(tok) ? l / rep : l }));
  const t = Math.max(temp, 0.01);
  const max = Math.max(...entries.map((e) => e.logit));
  const exps = entries.map((e) => Math.exp((e.logit - max) / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  const rows = entries.map((e, i) => ({ tok: e.tok, logit: e.logit, p: exps[i] / sum, kept: true })).sort((a, b) => b.p - a.p);
  // top-k
  rows.forEach((r, i) => { if (i >= topK) r.kept = false; });
  // top-p over the remaining
  let cum = 0;
  for (const r of rows) {
    if (!r.kept) continue;
    if (cum >= topP) r.kept = false;
    cum += r.p;
  }
  if (!rows.some((r) => r.kept)) rows[0].kept = true;
  return rows;
}

function renorm(rows: Row[]) {
  const kept = rows.filter((r) => r.kept);
  const s = kept.reduce((a, r) => a + r.p, 0);
  return kept.map((r) => ({ ...r, q: r.p / s }));
}

function sampleOnce(rows: Row[], rnd: () => number) {
  const kept = renorm(rows);
  let x = rnd();
  for (const r of kept) { x -= r.q; if (x <= 0) return r.tok; }
  return kept[kept.length - 1].tok;
}

/** Small seeded PRNG so "sample 10" is reproducible per seed. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two-step toy for greedy vs beam search.
const STEP1: Record<string, number> = { "a": 0.5, "the": 0.4, "one": 0.1 };
const STEP2: Record<string, Record<string, number>> = {
  a: { "dog": 0.3, "cat": 0.3, "bird": 0.4 },
  the: { "dog": 0.9, "cat": 0.05, "bird": 0.05 },
  one: { "dog": 0.5, "cat": 0.5, "bird": 0.0 },
};

const DEFAULTS = { promptIdx: 0, temp: 1, topK: 10, topP: 1, rep: 1 };

function SamplingPage() {
  const [ss, setSS, resetSS] = useShareState("samp", DEFAULTS);
  const { promptIdx, temp, topK, topP, rep } = ss;
  const setPromptIdx = (v: number) => setSS({ promptIdx: Math.min(Math.max(0, v), PROMPTS.length - 1) });
  const setTemp = (v: number) => setSS({ temp: v });
  const setTopK = (v: number) => setSS({ topK: v });
  const setTopP = (v: number) => setSS({ topP: v });
  const setRep = (v: number) => setSS({ rep: v });
  const [seed, setSeed] = useState(1);
  const [samples, setSamples] = useState<string[]>([]);

  const P = PROMPTS[promptIdx] ?? PROMPTS[0];
  const rows = useMemo(() => distribution(P.logits, temp, topK, topP, rep, P.already), [P, temp, topK, topP, rep]);
  const kept = rows.filter((r) => r.kept);
  const entropy = -renorm(rows).reduce((a, r) => a + (r.q > 0 ? r.q * Math.log2(r.q) : 0), 0);

  const reset = () => {
    resetSS(); setSamples([]); setSeed(1);
  };

  function sample10() {
    const rnd = mulberry32(seed * 7919);
    setSamples(Array.from({ length: 10 }, () => sampleOnce(rows, rnd)));
    setSeed((s) => s + 1);
  }

  const preset = (t: number, k: number, p: number) => { setSS({ temp: t, topK: k, topP: p }); setSamples([]); };

  // greedy vs beam
  const greedy1 = Object.entries(STEP1).sort((a, b) => b[1] - a[1])[0];
  const greedy2 = Object.entries(STEP2[greedy1[0]]).sort((a, b) => b[1] - a[1])[0];
  const beams = Object.entries(STEP1).flatMap(([w1, p1]) => Object.entries(STEP2[w1]).map(([w2, p2]) => ({ seq: `${w1} ${w2}`, p: p1 * p2 }))).sort((a, b) => b.p - a.p);

  return (
    <ModulePage
      moduleId="sampling"
      title="Sampling & Decoding"
      intro="A model does not output a word. It outputs a score for every token in its vocabulary. Decoding is the step that turns those scores into one chosen token, and the knobs you set here decide whether answers feel precise, creative or unhinged."
    >
      <Section title="From logits to a token" kicker="concept">
        <p>The last layer produces <span className="font-mono text-foreground">logits</span>. A softmax turns them into probabilities. Before sampling, we can reshape that distribution: <span className="font-mono text-foreground">temperature</span> sharpens or flattens it, <span className="font-mono text-foreground">top-k</span> and <span className="font-mono text-foreground">top-p</span> cut off the unlikely tail, and a <span className="font-mono text-foreground">repetition penalty</span> discourages words already used.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("sampling").slice(0, 3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Next-token sampler">
        <ResetButton onClick={reset} share />
        <div className="flex flex-wrap gap-2 mb-4">
          {PROMPTS.map((p, i) => (
            <button key={i} onClick={() => { setPromptIdx(i); setSamples([]); }} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition text-left ${promptIdx === i ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {p.prompt.split(" ").slice(0, 4).join(" ")}…
            </button>
          ))}
        </div>
        <div className="rounded-md border border-border bg-background p-3 font-mono text-sm mb-5">
          {P.prompt} <span className="text-primary">▍</span>
        </div>

        <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 text-xs font-mono mb-3">
          <label className="block">
            <span className="inline-flex items-center">temperature: <span className="text-primary ml-1">{temp.toFixed(2)}</span>
              <Help label="Temperature">Logits are divided by T. T &lt; 1 makes the top choice dominate (focused). T &gt; 1 flattens the odds (creative, riskier). Near 0 it becomes greedy.</Help>
            </span>
            <input type="range" min={0.05} max={2.5} step={0.05} value={temp} onChange={(e) => setTemp(+e.target.value)} className="w-full accent-primary" />
          </label>
          <label className="block">
            <span className="inline-flex items-center">top-k: <span className="text-primary ml-1">{topK}</span>
              <Help label="Top-k">Only the k most likely tokens survive. k = 1 is greedy decoding.</Help>
            </span>
            <input type="range" min={1} max={10} step={1} value={topK} onChange={(e) => setTopK(+e.target.value)} className="w-full accent-primary" />
          </label>
          <label className="block">
            <span className="inline-flex items-center">top-p: <span className="text-primary ml-1">{topP.toFixed(2)}</span>
              <Help label="Top-p">Nucleus sampling. Keep adding tokens from most to least likely until their total probability reaches p. Adapts to how confident the model is.</Help>
            </span>
            <input type="range" min={0.1} max={1} step={0.05} value={topP} onChange={(e) => setTopP(+e.target.value)} className="w-full accent-primary" />
          </label>
          <label className="block">
            <span className="inline-flex items-center">repetition penalty: <span className="text-primary ml-1">{rep.toFixed(1)}</span>
              <Help label="Repetition penalty">Logits of tokens already in the text ({P.already.join(", ")}) are divided by this value, so loops become less likely.</Help>
            </span>
            <input type="range" min={1} max={3} step={0.1} value={rep} onChange={(e) => setRep(+e.target.value)} className="w-full accent-primary" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mb-5 text-xs font-mono">
          <span className="text-muted-foreground self-center">presets:</span>
          <button onClick={() => preset(0.05, 1, 1)} className="px-2 py-1 rounded border border-border hover:bg-secondary">greedy</button>
          <button onClick={() => preset(0.3, 10, 0.9)} className="px-2 py-1 rounded border border-border hover:bg-secondary">factual</button>
          <button onClick={() => preset(0.8, 10, 0.95)} className="px-2 py-1 rounded border border-border hover:bg-secondary">balanced</button>
          <button onClick={() => preset(1.6, 10, 1)} className="px-2 py-1 rounded border border-border hover:bg-secondary">wild</button>
        </div>

        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.tok} className="grid grid-cols-[110px_1fr_56px] items-center gap-3 font-mono text-xs">
              <span className={`truncate ${r.kept ? "text-foreground" : "text-muted-foreground line-through"}`}>{r.tok}{P.already.includes(r.tok) && <span className="text-warning"> ↺</span>}</span>
              <div className="h-5 rounded bg-secondary overflow-hidden">
                <div className="h-full rounded transition-all duration-300" style={{ width: `${Math.max(r.p * 100, 0.5)}%`, background: r.kept ? "var(--chart-1)" : "var(--border)" }} />
              </div>
              <span className={`text-right ${r.kept ? "text-primary" : "text-muted-foreground"}`}>{(r.p * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
          <span>candidates kept: <span className="text-primary">{kept.length}</span></span>
          <span className="inline-flex items-center">entropy: <span className="text-primary ml-1">{entropy.toFixed(2)} bits</span>
            <Help label="Entropy">How unpredictable the choice is. 0 bits = always the same token. Higher = more variety.</Help>
          </span>
        </div>

        <div className="mt-5 rounded-md border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono text-muted-foreground">Ten independent samples with these settings</span>
            <button onClick={sample10} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">
              <Dices className="h-3.5 w-3.5" /> Sample 10 times
            </button>
          </div>
          {samples.length === 0 ? (
            <p className="text-xs text-muted-foreground">Press the button. Greedy settings give the same word ten times; wild settings give a mix, including odd choices.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 font-mono text-sm">
              {samples.map((s, i) => <span key={i} className="px-2 py-0.5 rounded bg-accent text-accent-foreground">{s}</span>)}
              <span className="ml-2 text-xs text-muted-foreground self-center">{new Set(samples).size} unique</span>
            </div>
          )}
        </div>
      </Lab>

      <Section title="Greedy is not always best" kicker="search">
        <p>Greedy decoding grabs the single most likely token every step. <span className="font-mono text-foreground">Beam search</span> keeps several partial answers alive and picks the sequence with the best total probability. In this two-step example, greedy picks "a" first (50%) but then has no strong follow-up, while "the dog" wins overall.</p>
      </Section>

      <Lab title="Greedy vs beam search">
        <div className="grid md:grid-cols-2 gap-4 font-mono text-sm">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-xs text-muted-foreground mb-2">Greedy (beam width 1)</div>
            <div>step 1: <span className="text-primary">{greedy1[0]}</span> ({(greedy1[1] * 100).toFixed(0)}%)</div>
            <div>step 2: <span className="text-primary">{greedy2[0]}</span> ({(greedy2[1] * 100).toFixed(0)}%)</div>
            <div className="mt-2 pt-2 border-t border-border">"{greedy1[0]} {greedy2[0]}" = <span className="text-warning font-bold">{(greedy1[1] * greedy2[1] * 100).toFixed(0)}%</span></div>
          </div>
          <div className="rounded-md border border-success/40 bg-success/5 p-4">
            <div className="text-xs text-muted-foreground mb-2">Beam search (all paths scored)</div>
            {beams.slice(0, 4).map((b, i) => (
              <div key={b.seq} className="flex justify-between">
                <span className={i === 0 ? "text-success font-bold" : ""}>{b.seq}</span>
                <span className={i === 0 ? "text-success font-bold" : "text-muted-foreground"}>{(b.p * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Chat models usually sample (temperature + top-p) because beam search tends to sound bland and repetitive in open-ended text. Beam search remains common in translation and speech recognition.</p>
      </Lab>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("sampling").slice(3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
