import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/transformer")({
  head: () => ({
    meta: [
      { title: "Transformer Walkthrough | GiriBioAI" },
      { name: "description", content: "Step through one GPT-style transformer block with real numbers: token and position embeddings, Q/K/V attention, residuals, layer norm, MLP and next-token logits." },
      { property: "og:title", content: "Transformer Walkthrough | GiriBioAI" },
      { property: "og:description", content: "A tiny transformer you can step through, number by number." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Transformer Walkthrough",
          description: "Embeddings, positional encoding, self-attention, MLP, residuals, layer norm and unembedding.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/transformer",
        }),
      },
    ],
  }),
  component: TransformerPage,
});

// ----------------------------------------------------------- tiny model --
const VOCAB = ["<bos>", "the", "a", "cat", "dog", "sat", "ran", "slept", "on", "mat", "rug", "and", "[UNK]"];
const D = 4;   // model width (GPT-2 small: 768)
const DFF = 8; // MLP hidden width (GPT-2 small: 3072)

type Vec = number[];
type Mat = number[][];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2024);
const randMat = (r: number, c: number, s = 1): Mat => Array.from({ length: r }, () => Array.from({ length: c }, () => +((rnd() * 2 - 1) * s).toFixed(2)));

const E = randMat(VOCAB.length, D, 1);   // token embeddings
const WQ = randMat(D, D, 0.9);
const WK = randMat(D, D, 0.9);
const WV = randMat(D, D, 0.9);
const W1 = randMat(D, DFF, 0.7);
const W2 = randMat(DFF, D, 0.7);

/** Toy "what training would have taught": likely next words after each word. */
const BIGRAM: Record<string, Record<string, number>> = {
  "<bos>": { the: 3, a: 2.5 },
  the: { cat: 3, dog: 2.8, mat: 2.2, rug: 1.8 },
  a: { cat: 2.8, dog: 3, mat: 1.6, rug: 2 },
  cat: { sat: 3, slept: 2.6, ran: 1.6, and: 1.2 },
  dog: { ran: 3, sat: 2.4, slept: 2, and: 1.2 },
  sat: { on: 3.4, and: 1 },
  ran: { on: 1.6, and: 2.2 },
  slept: { on: 3, and: 1.4 },
  on: { the: 3.2, a: 2.6 },
  mat: { and: 2.4 },
  rug: { and: 2.4 },
  and: { the: 2.2, a: 1.8, sat: 1, slept: 1.2 },
};

const matVec = (v: Vec, M: Mat): Vec => M[0].map((_, j) => v.reduce((s, vi, i) => s + vi * M[i][j], 0));
const add = (a: Vec, b: Vec) => a.map((x, i) => x + b[i]);
const dot = (a: Vec, b: Vec) => a.reduce((s, x, i) => s + x * b[i], 0);
function layerNorm(v: Vec): Vec {
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  const varr = v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length;
  return v.map((x) => (x - m) / Math.sqrt(varr + 1e-5));
}
function softmax(xs: number[]): number[] {
  const mx = Math.max(...xs.filter((x) => Number.isFinite(x)));
  const e = xs.map((x) => (Number.isFinite(x) ? Math.exp(x - mx) : 0));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}
/** Sinusoidal positional encoding from "Attention Is All You Need". */
const posEnc = (pos: number): Vec => Array.from({ length: D }, (_, i) => {
  const rate = 1 / Math.pow(10000, (2 * Math.floor(i / 2)) / D);
  return i % 2 === 0 ? Math.sin(pos * rate) : Math.cos(pos * rate);
});

function run(words: string[], trained: boolean) {
  const ids = words.map((w) => (VOCAB.includes(w) ? VOCAB.indexOf(w) : VOCAB.indexOf("[UNK]")));
  const tok = ids.map((id) => E[id]);
  const pos = ids.map((_, i) => posEnc(i));
  const x0 = tok.map((t, i) => add(t, pos[i]));
  const ln1 = x0.map(layerNorm);
  const Q = ln1.map((v) => matVec(v, WQ));
  const K = ln1.map((v) => matVec(v, WK));
  const V = ln1.map((v) => matVec(v, WV));
  const scores = Q.map((q, i) => K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(D) : -Infinity)));
  const attn = scores.map(softmax);
  const attnOut = attn.map((row) => V[0].map((_, d) => row.reduce((s, w, j) => s + w * V[j][d], 0)));
  const x1 = x0.map((v, i) => add(v, attnOut[i]));
  const ln2 = x1.map(layerNorm);
  const hidden = ln2.map((v) => matVec(v, W1).map((h) => Math.max(0, h)));
  const mlpOut = hidden.map((h) => matVec(h, W2));
  const x2 = x1.map((v, i) => add(v, mlpOut[i]));
  const lnf = layerNorm(x2[x2.length - 1]);
  const rawLogits = E.map((e) => dot(lnf, e)); // weight tying: unembedding = embeddingᵀ
  const last = words[words.length - 1];
  const logits = rawLogits.map((l, i) => (trained ? 0.35 * l + (BIGRAM[last]?.[VOCAB[i]] ?? -1) : l));
  logits[0] = -Infinity; // never predict <bos>
  const probs = softmax(logits);
  return { ids, tok, pos, x0, ln1, Q, K, V, scores, attn, attnOut, x1, ln2, hidden, mlpOut, x2, lnf, logits, probs };
}

// ------------------------------------------------------------------- UI --
const STEPS = [
  { key: "tokens", title: "1 · Tokens to IDs", short: "Tokenize" },
  { key: "embed", title: "2 · Token + position embeddings", short: "Embed" },
  { key: "qkv", title: "3 · Queries, keys and values", short: "Q K V" },
  { key: "attn", title: "4 · Attention weights", short: "Attention" },
  { key: "resid", title: "5 · Mix values + residual", short: "Residual" },
  { key: "mlp", title: "6 · MLP (feed-forward)", short: "MLP" },
  { key: "logits", title: "7 · Logits to next token", short: "Predict" },
] as const;

const PRESETS = ["the cat sat on", "a dog ran and", "the dog slept on a", "the cat"];
const DEFAULTS = { text: PRESETS[0], step: 0, focus: -1, trained: true };

function cellColor(v: number) {
  const a = Math.min(1, Math.abs(v) / 2);
  return v >= 0 ? `color-mix(in oklch, var(--g-blue) ${Math.round(a * 85)}%, transparent)` : `color-mix(in oklch, var(--g-yellow) ${Math.round(a * 85)}%, transparent)`;
}

function VecRow({ v, label }: { v: Vec; label?: string }) {
  return (
    <div className="flex items-center gap-1">
      {label && <span className="w-14 shrink-0 text-right pr-1 text-muted-foreground truncate">{label}</span>}
      {v.map((x, i) => (
        <span key={i} className="w-12 h-7 rounded grid place-items-center text-[11px] tabular-nums" style={{ background: cellColor(x) }}>{x.toFixed(2)}</span>
      ))}
    </div>
  );
}

function TransformerPage() {
  const [s, setS, reset] = useShareState("tf", DEFAULTS);
  const words = useMemo(() => {
    const w = ["<bos>", ...s.text.toLowerCase().split(/\s+/).filter(Boolean)].slice(0, 8);
    return w;
  }, [s.text]);
  const r = useMemo(() => run(words, s.trained), [words, s.trained]);
  const step = Math.min(Math.max(s.step, 0), STEPS.length - 1);
  const focus = s.focus >= 0 && s.focus < words.length ? s.focus : words.length - 1;
  const top = r.probs.map((p, i) => ({ w: VOCAB[i], p, l: r.logits[i] })).sort((a, b) => b.p - a.p).slice(0, 6);
  const unknown = words.filter((w) => !VOCAB.includes(w));

  return (
    <ModulePage
      moduleId="transformer"
      title="Transformer Walkthrough"
      intro="GPT, Llama, Claude and Gemini are all stacks of the same building block: the transformer. Here is one block shrunk to 4 numbers per token, so you can follow every multiplication from words to the predicted next word."
    >
      <Section title="The block in one breath" kicker="architecture">
        <p>Each token becomes a vector (<span className="font-mono text-foreground">embedding</span>) plus a hint about its position. Inside the block, <span className="font-mono text-foreground">attention</span> lets tokens share information, then a per-token <span className="font-mono text-foreground">MLP</span> transforms it. <span className="font-mono text-foreground">Residual connections</span> add each result back onto the running vector and <span className="font-mono text-foreground">layer norm</span> keeps the numbers in range. At the end, the last token's vector is compared with every vocabulary embedding to score the next word.</p>
        <p>GPT-2 small does this with 768 numbers per token, 12 attention heads and 12 stacked blocks. This toy uses 4 numbers, 1 head and 1 block.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("transformer").slice(0, 3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Step through a GPT block">
        <ResetButton onClick={reset} share />
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setS({ text: p, focus: -1 })} className={`px-2.5 py-1 rounded-md text-xs font-mono border ${s.text === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{p}</button>
          ))}
        </div>
        <label htmlFor="tf-input" className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          Input (vocabulary: {VOCAB.slice(1, -1).join(", ")})
          <Help label="Input">The toy model only knows 11 words. Anything else becomes [UNK], just like an out-of-vocabulary word. Up to 7 words.</Help>
        </label>
        <input id="tf-input" value={s.text} onChange={(e) => setS({ text: e.target.value, focus: -1 })} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-2" />
        {unknown.length > 0 && <p className="text-xs text-warning mb-2">Not in vocabulary, mapped to [UNK]: {unknown.join(", ")}</p>}

        <label className="flex items-center gap-2 text-xs font-mono mb-4">
          <input type="checkbox" checked={s.trained} onChange={(e) => setS({ trained: e.target.checked })} className="accent-primary" />
          add "trained" knowledge to the final logits
          <Help label="Trained knowledge">The matrices here are random, so on their own they predict nonsense. Ticking this adds a small hand-made table of which words follow which, standing in for what billions of training steps would store in the weights.</Help>
        </label>

        {/* stepper */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {STEPS.map((st, i) => (
            <button key={st.key} onClick={() => setS({ step: i })} className={`px-2.5 py-1 rounded-full text-xs font-mono border transition ${i === step ? "bg-primary text-primary-foreground border-primary" : i < step ? "border-success/50 text-success bg-success/5" : "border-border hover:bg-secondary"}`}>
              {i + 1}. {st.short}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[190px_1fr] gap-5">
          {/* block diagram */}
          <ol className="text-xs font-mono space-y-1.5" aria-label="Block diagram">
            {[
              ["input words", 0], ["token embed + position", 1], ["layer norm", 2], ["Q · K · V", 2], ["masked softmax", 3], ["Σ weights × V  (+ residual)", 4], ["layer norm → MLP (+ residual)", 5], ["layer norm → unembed → softmax", 6],
            ].map(([label, idx], i) => (
              <li key={i} className={`rounded-md border px-2 py-1.5 transition ${idx === step ? "border-primary bg-accent text-accent-foreground font-semibold" : "border-border text-muted-foreground"}`}>{label}</li>
            ))}
            <li className="text-[10px] text-muted-foreground pt-1">GPT-2 small repeats the middle part 12 times.</li>
          </ol>

          <div className="rounded-lg border border-border bg-background p-4 min-h-[300px] font-mono text-xs overflow-x-auto">
            <div className="text-sm font-semibold font-sans mb-3">{STEPS[step].title}</div>

            {step === 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {words.map((w, i) => (
                    <div key={i} className="rounded-md border border-border px-2 py-1 text-center">
                      <div className="text-foreground">{w}</div>
                      <div className="text-primary">id {r.ids[i]}</div>
                    </div>
                  ))}
                </div>
                <p className="font-sans text-muted-foreground text-sm">A special <code>&lt;bos&gt;</code> (beginning of sequence) token is added first. Each word is looked up in the vocabulary to get an integer ID. Real models use subword tokens, covered in the Tokens module.</p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-4">
                  <div><div className="text-muted-foreground mb-1">token embedding</div>{r.tok.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div><div className="text-muted-foreground mb-1">+ position (sin/cos)</div>{r.pos.map((v, i) => <VecRow key={i} v={v} label={`pos ${i}`} />)}</div>
                  <div><div className="text-muted-foreground mb-1">= input vector x</div>{r.x0.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                </div>
                <p className="font-sans text-muted-foreground text-sm">The embedding table has one learned row per vocabulary word ({VOCAB.length} × {D} here; 50,257 × 768 in GPT-2). Attention itself ignores order, so a position vector is added. Notice "the" gets a different final vector at each position.</p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-4">
                  <div><div className="text-muted-foreground mb-1">query Q (what am I looking for?)</div>{r.Q.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div><div className="text-muted-foreground mb-1">key K (what do I offer?)</div>{r.K.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div><div className="text-muted-foreground mb-1">value V (what do I share?)</div>{r.V.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                </div>
                <p className="font-sans text-muted-foreground text-sm">Each vector is layer-normed, then multiplied by three learned {D}×{D} matrices: W<sub>Q</sub>, W<sub>K</sub> and W<sub>V</sub>.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <table className="border-separate border-spacing-0.5">
                  <thead><tr><th className="text-right pr-2 text-muted-foreground font-normal">query ↓ key →</th>{words.map((w, j) => <th key={j} className="px-1 font-normal text-muted-foreground">{w}</th>)}</tr></thead>
                  <tbody>
                    {r.attn.map((row, i) => (
                      <tr key={i} onClick={() => setS({ focus: i })} className="cursor-pointer">
                        <td className={`text-right pr-2 ${i === focus ? "text-primary font-bold" : "text-muted-foreground"}`}>{words[i]}</td>
                        {row.map((w, j) => (
                          <td key={j} title={Number.isFinite(r.scores[i][j]) ? `score ${r.scores[i][j].toFixed(2)}` : "masked (future token)"} className={`h-8 w-12 rounded text-center ${i === focus ? "ring-1 ring-primary/50" : ""}`}
                            style={{ background: j > i ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${Math.round(w * 100)}%, var(--secondary))`, color: w > 0.5 ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
                            {j > i ? "·" : `${Math.round(w * 100)}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div>score("{words[focus]}" → each earlier word) = Q·K / √{D}:</div>
                <div className="flex flex-wrap gap-2">{r.scores[focus].map((sc, j) => j <= focus && <span key={j} className="rounded border border-border px-1.5 py-0.5">{words[j]}: {sc.toFixed(2)}</span>)}</div>
                <p className="font-sans text-muted-foreground text-sm">Dot products between queries and keys say how relevant each token is. Future tokens are masked (grey) because a GPT cannot peek ahead. Softmax turns each row into weights that sum to 100%. Click a row to inspect it.</p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-4">
                  <div><div className="text-muted-foreground mb-1">x (from step 2)</div>{r.x0.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div><div className="text-muted-foreground mb-1">+ attention output Σ wⱼ·Vⱼ</div>{r.attnOut.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div><div className="text-muted-foreground mb-1">= x after attention</div>{r.x1.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                </div>
                <p className="font-sans text-muted-foreground text-sm">Each token's new information is the attention-weighted average of the value vectors. It is <b>added</b> to the original vector (the residual connection) instead of replacing it, so nothing learned earlier is lost.</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><div className="text-muted-foreground mb-1">hidden = ReLU(LN(x) · W₁)  ({D} → {DFF})</div>{r.hidden.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  <div className="space-y-3">
                    <div><div className="text-muted-foreground mb-1">MLP out = hidden · W₂  ({DFF} → {D})</div>{r.mlpOut.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                    <div><div className="text-muted-foreground mb-1">x + MLP out (residual)</div>{r.x2.map((v, i) => <VecRow key={i} v={v} label={words[i]} />)}</div>
                  </div>
                </div>
                <p className="font-sans text-muted-foreground text-sm">The MLP works on each token separately: expand to a wider layer, zero out negatives, squeeze back. About two thirds of a GPT's parameters live here, and research suggests much factual knowledge is stored in these weights.</p>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div><div className="text-muted-foreground mb-1">last token "{words[words.length - 1]}", layer-normed</div><VecRow v={r.lnf} /></div>
                <div className="space-y-1">
                  {top.map((t) => (
                    <div key={t.w} className="grid grid-cols-[70px_1fr_60px_60px] items-center gap-2">
                      <span className={t === top[0] ? "text-success font-bold" : ""}>{t.w}</span>
                      <div className="h-4 rounded bg-secondary overflow-hidden"><div className="h-full rounded" style={{ width: `${t.p * 100}%`, background: t === top[0] ? "var(--g-green)" : "var(--chart-1)" }} /></div>
                      <span className="text-right text-muted-foreground">logit {Number.isFinite(t.l) ? t.l.toFixed(2) : "-∞"}</span>
                      <span className="text-right text-primary">{(t.p * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <div className="font-sans text-sm">
                  Next word: <span className="font-mono font-bold text-success">{top[0].w}</span>{" "}
                  <button onClick={() => setS({ text: `${s.text} ${top[0].w}`.trim(), step: 0, focus: -1 })} className="ml-2 text-xs font-mono px-2 py-0.5 rounded border border-border hover:bg-secondary">append and run again</button>
                </div>
                <p className="font-sans text-muted-foreground text-sm">The final vector is dotted with every row of the embedding table (weight tying) to give one logit per word; softmax turns logits into probabilities. Sampling settings from the Sampling module decide which word is actually picked. {s.trained ? "" : "Without the trained knowledge, random weights give random-looking guesses."}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button onClick={() => setS({ step: Math.max(0, step - 1) })} disabled={step === 0} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
          <button onClick={() => setS({ step: Math.min(STEPS.length - 1, step + 1) })} disabled={step === STEPS.length - 1} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Next step <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-g-blue" /> positive</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-g-yellow" /> negative</span>
          <span>darker = larger magnitude</span>
        </div>
      </Lab>

      <Section title="Toy vs. real" kicker="scale">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground font-mono text-xs"><th className="py-1">setting</th><th>this toy</th><th>GPT-2 small</th><th>Llama 3 8B</th></tr></thead>
            <tbody className="font-mono text-xs">
              {[
                ["vocabulary", VOCAB.length, "50,257", "128,256"],
                ["numbers per token (d)", D, 768, "4,096"],
                ["attention heads", 1, 12, "32 (8 KV)"],
                ["blocks (layers)", 1, 12, 32],
                ["MLP width", DFF, "3,072", "14,336"],
                ["context length", 8, "1,024", "8,192"],
                ["parameters", "~200", "124 M", "8 B"],
              ].map((row) => (
                <tr key={String(row[0])} className="border-t border-border">{row.map((c, i) => <td key={i} className={`py-1.5 ${i === 0 ? "font-sans text-foreground" : ""}`}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("transformer").slice(3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
