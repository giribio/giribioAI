import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/context")({
  head: () => ({
    meta: [
      { title: "Context, KV Cache & MoE | GiriBioAI" },
      { name: "description", content: "How chats fit in a context window, why the KV cache makes generation fast and memory hungry, and how Mixture-of-Experts models route tokens to experts." },
      { property: "og:title", content: "Context, KV Cache & MoE | GiriBioAI" },
      { property: "og:description", content: "Context window, KV cache memory calculator and an MoE router simulator." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Context, KV Cache & Mixture of Experts",
          description: "Context windows, truncation and summarization, KV cache memory, grouped-query attention and MoE routing.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/context",
        }),
      },
    ],
  }),
  component: ContextPage,
});

// ------------------------------------------------------ Lab A: context --
type Msg = { role: "system" | "user" | "assistant"; text: string; tokens: number; fact?: boolean };
const CHAT: Msg[] = [
  { role: "system", text: "You are a helpful lab assistant.", tokens: 150 },
  { role: "user", text: "Hi! I'm planning a CRISPR knockout experiment.", tokens: 60 },
  { role: "assistant", text: "Great, which gene and cell line?", tokens: 220 },
  { role: "user", text: "Gene TP53 in HEK293. Our project code is BLUE-42.", tokens: 80, fact: true },
  { role: "assistant", text: "Here is a guide RNA design checklist…", tokens: 640 },
  { role: "user", text: "How many guides should I test?", tokens: 40 },
  { role: "assistant", text: "Usually 3 to 4 per gene, because…", tokens: 520 },
  { role: "user", text: "Can you draft the transfection protocol?", tokens: 50 },
  { role: "assistant", text: "Day 1: seed cells… Day 2: transfect…", tokens: 900 },
  { role: "user", text: "And the validation by sequencing?", tokens: 45 },
  { role: "assistant", text: "Use Sanger + TIDE analysis, steps…", tokens: 700 },
  { role: "user", text: "What was our project code again?", tokens: 30 },
];
const RESERVE = 500; // tokens kept free for the answer

type Strategy = "truncate" | "summarize";

function fitContext(window: number, strategy: Strategy) {
  const budget = window - RESERVE;
  const state: ("in" | "out" | "summary")[] = CHAT.map(() => "in");
  const sys = CHAT[0].tokens;
  let used = sys;
  // newest first, system always pinned
  let full = false;
  for (let i = CHAT.length - 1; i >= 1; i--) {
    if (!full && used + CHAT[i].tokens <= budget) used += CHAT[i].tokens;
    else { full = true; state[i] = "out"; } // everything older than the first overflow is dropped
  }
  let summaryTokens = 0;
  if (strategy === "summarize") {
    const dropped = CHAT.filter((_, i) => state[i] === "out").reduce((s, m) => s + m.tokens, 0);
    summaryTokens = dropped ? Math.max(60, Math.round(dropped * 0.12)) : 0;
    // make room for the summary by dropping more old turns if needed
    let j = 1;
    while (summaryTokens && used + summaryTokens > budget && j < CHAT.length - 1) {
      if (state[j] === "in") { state[j] = "out"; used -= CHAT[j].tokens; summaryTokens += Math.round(CHAT[j].tokens * 0.12); }
      j++;
    }
    CHAT.forEach((_, i) => { if (state[i] === "out") state[i] = "summary"; });
    used += summaryTokens;
  }
  return { state, used, summaryTokens, budget };
}

// ------------------------------------------------------- Lab B: KV cache --
const MODELS = {
  "GPT-2 small": { layers: 12, qHeads: 12, kvHeads: 12, headDim: 64 },
  "Mistral 7B": { layers: 32, qHeads: 32, kvHeads: 8, headDim: 128 },
  "Llama 3 8B": { layers: 32, qHeads: 32, kvHeads: 8, headDim: 128 },
  "Llama 3 70B": { layers: 80, qHeads: 64, kvHeads: 8, headDim: 128 },
} as const;
type ModelName = keyof typeof MODELS;
const SEQS = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

// ------------------------------------------------------------ Lab C: MoE --
const EXPERTS = ["numbers", "code", "biology", "grammar", "names", "punctuation", "verbs", "general"];
const BIO = new Set("dna rna gene genes protein proteins cell cells enzyme crispr cas9 tp53 mutation".split(" "));
const CODE = new Set("def return function const let import print python json api npm =>".split(" "));
const GRAMMAR = new Set("the a an of to in on and or but is are was were with by for".split(" "));
const VERBS = new Set("run runs ran edit edits cut cuts binds bind read reads write writes call calls test tests fix fixes".split(" "));

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

function gateScores(tok: string): number[] {
  const t = tok.toLowerCase();
  const s = EXPERTS.map((_, e) => hash(t + e) * 1.2); // learned-looking noise
  if (/^\d+([.,]\d+)?$/.test(t)) s[0] += 4;
  if (CODE.has(t) || /[(){}[\]_]/.test(t)) s[1] += 4;
  if (BIO.has(t)) s[2] += 4;
  if (GRAMMAR.has(t)) s[3] += 3.5;
  if (/^[A-Z][a-z]+/.test(tok) && !GRAMMAR.has(t)) s[4] += 3;
  if (/^[^\w\s]+$/.test(t)) s[5] += 4;
  if (VERBS.has(t) || /(ed|ing)$/.test(t)) s[6] += 3;
  s[7] += 1.5;
  const mx = Math.max(...s);
  const ex = s.map((x) => Math.exp(x - mx));
  const sum = ex.reduce((a, b) => a + b, 0);
  return ex.map((x) => x / sum);
}

const DEFAULTS = { window: 2048, strategy: "truncate" as Strategy, model: "Llama 3 8B" as ModelName, seqIdx: 3, batch: 1, gqa: true, fp8: false, moeText: "Alice edits the TP53 gene with CRISPR , then runs print ( 42 ) in Python .", topK: 2, capacity: 1.25 };

function fmtBytes(b: number) {
  if (b >= 1e9) return `${(b / 1e9).toFixed(b >= 1e10 ? 0 : 1)} GB`;
  return `${(b / 1e6).toFixed(0)} MB`;
}

function ContextPage() {
  const [s, setS, reset] = useShareState("ctx", DEFAULTS);

  // A
  const fit = useMemo(() => fitContext(s.window, s.strategy as Strategy), [s.window, s.strategy]);
  const factIdx = CHAT.findIndex((m) => m.fact);
  const factState = fit.state[factIdx];
  const total = CHAT.reduce((a, m) => a + m.tokens, 0);

  // B
  const m = MODELS[s.model as ModelName] ?? MODELS["Llama 3 8B"];
  const seq = SEQS[s.seqIdx] ?? 8192;
  const kvHeads = s.gqa ? m.kvHeads : m.qHeads;
  const bytesPer = s.fp8 ? 1 : 2;
  const kvBytes = 2 * m.layers * kvHeads * m.headDim * seq * s.batch * bytesPer;
  const perToken = 2 * m.layers * kvHeads * m.headDim * bytesPer;
  const N = 16;
  const noCache = Array.from({ length: N }, (_, i) => 8 + i); // prompt of 8 + generated so far
  const withCache = Array.from({ length: N }, (_, i) => (i === 0 ? 8 : 1));
  const sumNo = noCache.reduce((a, b) => a + b, 0), sumYes = withCache.reduce((a, b) => a + b, 0);

  // C
  const toks = useMemo(() => s.moeText.split(/\s+/).filter(Boolean).slice(0, 24), [s.moeText]);
  const routing = useMemo(() => {
    const k = s.topK;
    const cap = Math.max(1, Math.ceil((s.capacity * toks.length * k) / EXPERTS.length));
    const load = EXPERTS.map(() => 0);
    const rows = toks.map((t) => {
      const g = gateScores(t);
      const chosen = g.map((p, e) => ({ p, e })).sort((a, b) => b.p - a.p).slice(0, k);
      const routed = chosen.map((c) => {
        const ok = load[c.e] < cap;
        if (ok) load[c.e]++;
        return { ...c, ok };
      });
      return { t, g, routed };
    });
    const dropped = rows.reduce((n, r) => n + r.routed.filter((x) => !x.ok).length, 0);
    return { rows, load, cap, dropped };
  }, [toks, s.topK, s.capacity]);

  return (
    <ModulePage
      moduleId="context"
      title="Context, KV Cache & MoE"
      intro="Three engineering ideas decide how much a model can read, how fast it answers and how big it can grow: the context window, the KV cache and Mixture of Experts. Each lab below shows the trade-off with numbers."
    >
      <Section title="The model only sees what fits" kicker="context window">
        <p>The <span className="font-mono text-foreground">context window</span> is the maximum number of tokens per request: system prompt, the whole chat so far, retrieved documents and room for the reply. Chat apps silently drop or summarize old turns when a conversation outgrows it, which is why a model "forgets" what you said earlier.</p>
      </Section>

      <Lab title="Fit a conversation into the window">
        <ResetButton onClick={reset} share />
        <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono mb-4">
          <label className="block">
            <span className="inline-flex items-center">context window: <span className="text-primary ml-1">{s.window.toLocaleString()} tokens</span>
              <Help label="Context window">{RESERVE} tokens are reserved for the answer. The full chat is {total.toLocaleString()} tokens.</Help>
            </span>
            <input type="range" min={1024} max={4096} step={128} value={s.window} onChange={(e) => setS({ window: +e.target.value })} className="w-full accent-primary" />
          </label>
          <div>
            <span className="inline-flex items-center">when it overflows
              <Help label="Strategy">Truncate drops the oldest turns (system prompt is pinned). Summarize replaces them with a short summary, which costs tokens and may lose details.</Help>:
            </span>
            <div className="flex gap-1.5 mt-1">
              {(["truncate", "summarize"] as Strategy[]).map((st) => (
                <button key={st} onClick={() => setS({ strategy: st })} className={`px-2.5 py-1 rounded-md border ${s.strategy === st ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{st} oldest</button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-4 rounded-full bg-secondary overflow-hidden flex mb-1" aria-label="Context usage">
          <div className="h-full bg-chart-1" style={{ width: `${(fit.used / s.window) * 100}%` }} />
          <div className="h-full bg-g-green/40" style={{ width: `${(RESERVE / s.window) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-muted-foreground mb-4">
          <span>used {fit.used.toLocaleString()} {fit.summaryTokens > 0 && `(incl. ${fit.summaryTokens} summary)`}</span>
          <span>answer reserve {RESERVE}</span>
        </div>
        <div className="grid md:grid-cols-[1fr_260px] gap-5">
          <ol className="space-y-1.5 text-sm">
            {CHAT.map((msg, i) => {
              const st = fit.state[i];
              return (
                <li key={i} className={`rounded-md border px-3 py-2 flex items-start gap-3 ${st === "in" ? "border-border bg-background" : st === "summary" ? "border-warning/40 bg-warning/5" : "border-dashed border-border opacity-45"} ${msg.fact ? "ring-1 ring-g-green/60" : ""}`}>
                  <span className={`font-mono text-[10px] uppercase w-16 shrink-0 pt-0.5 ${msg.role === "user" ? "text-primary" : msg.role === "system" ? "text-g-green" : "text-muted-foreground"}`}>{msg.role}</span>
                  <span className={`flex-1 ${st === "out" ? "line-through" : ""}`}>{msg.text}</span>
                  <span className="font-mono text-[11px] text-muted-foreground shrink-0">{st === "summary" ? "summarized" : st === "out" ? "dropped" : `${msg.tokens} tok`}</span>
                </li>
              );
            })}
          </ol>
          <div className={`rounded-md border p-3 text-sm self-start ${factState === "in" ? "border-success/40 bg-success/5" : factState === "summary" ? "border-warning/50 bg-warning/10" : "border-border bg-secondary/40"}`}>
            <div className="font-mono text-xs text-muted-foreground mb-1">model's answer to the last question</div>
            {factState === "in" && <p>"Your project code is <b>BLUE-42</b>."</p>}
            {factState === "summary" && <p>"Your project code was <b>BLUE-42</b>, I think." <span className="text-xs text-muted-foreground block mt-1">Works only if the summary kept that detail. Summaries often drop exact codes and numbers.</span></p>}
            {factState === "out" && <p>"I'm sorry, I don't see a project code in our conversation." <span className="text-xs text-muted-foreground block mt-1">The message with the code fell out of the window.</span></p>}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Even inside the window, recall is uneven: studies on long contexts found facts in the middle of a long prompt are recalled worse than those at the start or end ("lost in the middle"). Put key instructions first and repeat critical facts near the question.</p>
      </Lab>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("context").slice(0, 2).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Section title="The KV cache: remember, don't recompute" kicker="inference">
        <p>A model writes one token at a time. Without a cache, every new token would recompute keys and values for the whole text again. The <span className="font-mono text-foreground">KV cache</span> stores them, so each step only processes the newest token. The price is memory, which grows with layers, heads, context length and batch size, and is often what limits long contexts on a GPU.</p>
      </Section>

      <Lab title="KV cache calculator">
        <div className="grid md:grid-cols-2 gap-5 text-xs font-mono mb-5">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MODELS) as ModelName[]).map((k) => (
                <button key={k} onClick={() => setS({ model: k })} className={`px-2.5 py-1 rounded-md border ${s.model === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{k}</button>
              ))}
            </div>
            <label className="block">context length: <span className="text-primary">{seq.toLocaleString()} tokens</span>
              <input type="range" min={0} max={SEQS.length - 1} value={s.seqIdx} onChange={(e) => setS({ seqIdx: +e.target.value })} className="w-full accent-primary" />
            </label>
            <label className="block">concurrent users (batch): <span className="text-primary">{s.batch}</span>
              <input type="range" min={1} max={32} value={s.batch} onChange={(e) => setS({ batch: +e.target.value })} className="w-full accent-primary" />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={s.gqa} onChange={(e) => setS({ gqa: e.target.checked })} className="accent-primary" /> grouped-query attention
                <Help label="GQA">Many query heads share a few key/value heads. Llama 3 8B has 32 query heads but only 8 KV heads, cutting the cache 4×. Untick to see classic multi-head attention.</Help>
              </label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={s.fp8} onChange={(e) => setS({ fp8: e.target.checked })} className="accent-primary" /> FP8 cache</label>
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-4 space-y-2">
            <div className="text-muted-foreground">2 (K and V) × {m.layers} layers × {kvHeads} KV heads × {m.headDim} dims × {seq.toLocaleString()} tokens × {s.batch} × {bytesPer} byte{bytesPer > 1 ? "s" : ""}</div>
            <div className="text-3xl font-sans font-bold text-primary">{fmtBytes(kvBytes)}</div>
            <div className="text-muted-foreground">{(perToken / 1024).toFixed(0)} KB per token{s.batch > 1 ? " per user" : ""}</div>
            {kvBytes > 80e9 && <div className="text-warning">More than a whole 80 GB GPU, before even loading the weights.</div>}
          </div>
        </div>
        <div className="text-xs font-mono text-muted-foreground mb-2">tokens processed per generation step (prompt of 8, then 16 new tokens)</div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[["without cache", noCache, sumNo, "var(--g-yellow)"], ["with KV cache", withCache, sumYes, "var(--g-green)"]].map(([label, arr, sum, color]) => (
            <div key={label as string} className="rounded-md border border-border bg-background p-3">
              <div className="flex justify-between text-xs font-mono mb-2"><span>{label as string}</span><span className="text-primary">{sum as number} total</span></div>
              <div className="flex items-end gap-0.5 h-24">
                {(arr as number[]).map((v, i) => <div key={i} className="flex-1 rounded-t" style={{ height: `${(v / 24) * 100}%`, background: color as string }} title={`step ${i + 1}: ${v}`} />)}
              </div>
            </div>
          ))}
        </div>
      </Lab>

      <Section title="Mixture of Experts: big brain, small bill" kicker="architecture">
        <p>An <span className="font-mono text-foreground">MoE</span> layer replaces the single MLP with many expert MLPs plus a <span className="font-mono text-foreground">router</span>. Each token visits only its top-k experts, so a model can hold far more parameters than it uses per token. Mixtral 8x7B stores about 47B parameters but activates about 13B per token. Experts do not neatly specialize by topic in real models; the labels below are a teaching simplification.</p>
      </Section>

      <Lab title="Route tokens to experts">
        <label htmlFor="moe-text" className="text-xs font-mono text-muted-foreground mb-1 block">Tokens (space separated, up to 24)</label>
        <input id="moe-text" value={s.moeText} onChange={(e) => setS({ moeText: e.target.value })} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-3" />
        <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono mb-4">
          <div>
            top-k experts per token:
            <div className="flex gap-1.5 mt-1">
              {[1, 2].map((k) => <button key={k} onClick={() => setS({ topK: k })} className={`px-2.5 py-1 rounded-md border ${s.topK === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>top-{k}</button>)}
            </div>
          </div>
          <label className="block">
            <span className="inline-flex items-center">capacity factor: <span className="text-primary ml-1">{s.capacity.toFixed(2)}</span> (max {routing.cap} tokens per expert)
              <Help label="Capacity factor">Each expert has a fixed number of slots per batch so work is spread evenly across GPUs. Tokens routed to a full expert are dropped (skip the layer) in classic MoE training.</Help>
            </span>
            <input type="range" min={0.5} max={2} step={0.25} value={s.capacity} onChange={(e) => setS({ capacity: +e.target.value })} className="w-full accent-primary" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0.5 text-[11px] font-mono">
            <thead>
              <tr><th />{EXPERTS.map((e) => <th key={e} className="px-1 font-normal text-muted-foreground [writing-mode:vertical-rl] rotate-180 h-20 text-left">{e}</th>)}</tr>
            </thead>
            <tbody>
              {routing.rows.map((row, i) => (
                <tr key={i}>
                  <td className="pr-2 text-right">{row.t}</td>
                  {EXPERTS.map((_, e) => {
                    const r = row.routed.find((x) => x.e === e);
                    return (
                      <td key={e} title={`gate ${(row.g[e] * 100).toFixed(0)}%`} className="h-6 w-8 rounded text-center"
                        style={{ background: r ? (r.ok ? "var(--g-green)" : "var(--g-yellow)") : `color-mix(in oklch, var(--primary) ${Math.round(row.g[e] * 60)}%, var(--secondary))`, color: r ? "var(--background)" : "transparent" }}>
                        {r ? (r.ok ? "✓" : "×") : "."}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid md:grid-cols-[1fr_240px] gap-5">
          <div className="space-y-1">
            {EXPERTS.map((e, i) => (
              <div key={e} className="grid grid-cols-[90px_1fr_40px] items-center gap-2 text-xs font-mono">
                <span>{e}</span>
                <div className="h-3 rounded bg-secondary overflow-hidden relative">
                  <div className="h-full rounded bg-chart-1" style={{ width: `${(routing.load[i] / Math.max(routing.cap, 1)) * 100}%` }} />
                </div>
                <span className="text-right text-muted-foreground">{routing.load[i]}/{routing.cap}</span>
              </div>
            ))}
          </div>
          <div className="rounded-md border border-border bg-background p-3 text-xs space-y-1.5">
            <div>routed slots: <span className="font-mono text-primary">{toks.length * s.topK - routing.dropped}</span></div>
            <div>dropped (expert full): <span className={`font-mono ${routing.dropped ? "text-warning" : "text-success"}`}>{routing.dropped}</span></div>
            <div>active share of experts per token: <span className="font-mono text-primary">{s.topK}/{EXPERTS.length} = {Math.round((s.topK / EXPERTS.length) * 100)}%</span></div>
            <p className="text-muted-foreground pt-1">Green ✓ = processed, yellow × = overflowed. Real routers add a load-balancing loss during training so no expert gets all the work.</p>
          </div>
        </div>
      </Lab>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("context").slice(2).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
