import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/embeddings")({
  head: () => ({
    meta: [
      { title: "Embeddings & Attention | GiriBioAI" },
      { name: "description", content: "See words as points in space, try king minus man plus woman, and watch a toy self-attention heatmap in your browser." },
      { property: "og:title", content: "Embeddings & Attention | GiriBioAI" },
      { property: "og:description", content: "Interactive embedding map, vector arithmetic and attention heads." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Embeddings & Attention",
          description: "Word vectors, cosine similarity, vector arithmetic and self-attention heads.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/embeddings",
        }),
      },
    ],
  }),
  component: EmbeddingsPage,
});

// ---------------------------------------------------------------------------
// Lab A data: a hand-placed 2D "embedding space". Real models use 768 to
// 12,288 dimensions; two are enough to show that meaning becomes geometry.
// ---------------------------------------------------------------------------

type Cluster = "people" | "animals" | "colours" | "food" | "biology";
const CLUSTER_COLOR: Record<Cluster, string> = {
  people: "var(--chart-1)",
  animals: "var(--chart-2)",
  colours: "var(--chart-3)",
  food: "var(--chart-4)",
  biology: "var(--muted-foreground)",
};

const WORDS: { w: string; x: number; y: number; c: Cluster }[] = [
  { w: "man", x: 3, y: 1, c: "people" },
  { w: "woman", x: 3, y: 3, c: "people" },
  { w: "boy", x: 2, y: 0.6, c: "people" },
  { w: "girl", x: 2, y: 2.6, c: "people" },
  { w: "king", x: 5.5, y: 1.2, c: "people" },
  { w: "queen", x: 5.5, y: 3.2, c: "people" },
  { w: "prince", x: 4.6, y: 0.4, c: "people" },
  { w: "princess", x: 4.6, y: 2.4, c: "people" },
  { w: "cat", x: -2.5, y: 5, c: "animals" },
  { w: "dog", x: -3, y: 4.4, c: "animals" },
  { w: "kitten", x: -2.2, y: 5.8, c: "animals" },
  { w: "puppy", x: -3.5, y: 5.3, c: "animals" },
  { w: "lion", x: -1.2, y: 4.2, c: "animals" },
  { w: "tiger", x: -1.5, y: 3.5, c: "animals" },
  { w: "blue", x: -5, y: -1.5, c: "colours" },
  { w: "green", x: -5.6, y: -0.7, c: "colours" },
  { w: "yellow", x: -4.6, y: -2.3, c: "colours" },
  { w: "purple", x: -5.4, y: -2.8, c: "colours" },
  { w: "apple", x: -1, y: -5, c: "food" },
  { w: "banana", x: -0.2, y: -5.7, c: "food" },
  { w: "bread", x: -1.8, y: -5.8, c: "food" },
  { w: "rice", x: 0.5, y: -4.8, c: "food" },
  { w: "DNA", x: 4.5, y: -3.5, c: "biology" },
  { w: "gene", x: 5.3, y: -2.8, c: "biology" },
  { w: "protein", x: 4, y: -4.5, c: "biology" },
  { w: "cell", x: 5.7, y: -3.9, c: "biology" },
  { w: "enzyme", x: 3.4, y: -3.6, c: "biology" },
];

const vecOf = (w: string) => WORDS.find((x) => x.w === w)!;
const cosine = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y) || 1);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const ANALOGIES: [string, string, string][] = [
  ["king", "man", "woman"],
  ["prince", "boy", "girl"],
  ["puppy", "dog", "cat"],
  ["queen", "woman", "man"],
];

// ---------------------------------------------------------------------------
// Lab B: toy self-attention. Three hand-written "heads" produce raw scores,
// then softmax(score / temperature) turns each row into weights.
// ---------------------------------------------------------------------------

const STOP = new Set("the a an of to in on at for and or but is was are were be because so with by it its this that".split(" "));
const PRONOUNS = new Set(["it", "she", "he", "they", "her", "him", "them", "its", "his", "their"]);
const ANIMATE = new Set(["cat", "dog", "girl", "boy", "man", "woman", "king", "queen", "doctor", "student", "scientist", "bird", "kitten", "puppy", "child", "teacher"]);

type Head = "previous" | "coreference" | "content";
const HEADS: { id: Head; label: string; help: string }[] = [
  { id: "previous", label: "Head 1 · previous token", help: "Many real models have a head that mostly looks one step back. It helps track word order." },
  { id: "coreference", label: "Head 2 · who is 'it'?", help: "Pronouns look back for the noun they refer to. This toy head prefers living things, the way real models learn that 'tired' fits a cat better than a mat." },
  { id: "content", label: "Head 3 · related words", help: "Content words attend to other content words that share letters or stems, a stand-in for semantic similarity. Filler words are ignored." },
];

function trigrams(w: string) {
  const s = `^${w.toLowerCase()}$`;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

function rawScore(head: Head, toks: string[], i: number, j: number): number {
  const qi = toks[i].toLowerCase();
  const kj = toks[j].toLowerCase();
  if (head === "previous") {
    if (i === 0) return j === 0 ? 4 : 0;
    return j === i - 1 ? 4 : j === i ? 1 : 0;
  }
  if (head === "coreference") {
    if (!PRONOUNS.has(qi)) return j === i ? 3 : 0;
    if (j >= i) return j === i ? 0.5 : -2;
    if (ANIMATE.has(kj)) return 4 + 0.1 * j;
    if (!STOP.has(kj) && !PRONOUNS.has(kj) && kj.length > 2) return 1.5 + 0.1 * j;
    return 0;
  }
  // content
  if (STOP.has(qi) || STOP.has(kj)) return j === i ? 2 : -1;
  if (i === j) return 2;
  const a = trigrams(qi), b = trigrams(kj);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const jacc = inter / (a.size + b.size - inter || 1);
  return 1 + jacc * 8;
}

function attention(head: Head, toks: string[], temp: number, causal: boolean) {
  return toks.map((_, i) => {
    const allowed = toks.map((__, j) => !causal || j <= i);
    const scores = toks.map((__, j) => (allowed[j] ? rawScore(head, toks, i, j) / temp : -Infinity));
    const max = Math.max(...scores);
    const exps = scores.map((s) => (s === -Infinity ? 0 : Math.exp(s - max)));
    const sum = exps.reduce((a, b) => a + b, 0) || 1;
    return exps.map((e) => e / sum);
  });
}

const DEFAULT_SENTENCE = "The cat sat on the mat because it was tired";

function EmbeddingsPage() {
  // Lab A state
  const [pickA, setPickA] = useState("king");
  const [pickB, setPickB] = useState("queen");
  const [analogy, setAnalogy] = useState<[string, string, string]>(ANALOGIES[0]);
  const [nextPick, setNextPick] = useState<"A" | "B">("A");

  const result = useMemo(() => {
    const [a, b, c] = analogy.map(vecOf);
    const target = { x: a.x - b.x + c.x, y: a.y - b.y + c.y };
    const nearest = WORDS.filter((w) => !analogy.includes(w.w))
      .map((w) => ({ w: w.w, d: dist(w, target) }))
      .sort((p, q) => p.d - q.d)[0];
    return { target, nearest };
  }, [analogy]);

  function clickWord(w: string) {
    if (nextPick === "A") { setPickA(w); setNextPick("B"); }
    else { setPickB(w); setNextPick("A"); }
  }

  const resetA = () => { setPickA("king"); setPickB("queen"); setAnalogy(ANALOGIES[0]); setNextPick("A"); };

  // Lab B state
  const [att, setAtt, resetAtt] = useShareState("attn", { sentence: DEFAULT_SENTENCE, head: "coreference" as Head, temp: 1, causal: true });
  const { sentence, temp, causal } = att;
  const head = att.head as Head;
  const setSentence = (v: string) => setAtt({ sentence: v });
  const setHead = (v: Head) => setAtt({ head: v });
  const setTemp = (v: number) => setAtt({ temp: v });
  const setCausal = (v: boolean) => setAtt({ causal: v });
  const [focus, setFocus] = useState<number | null>(null);

  const toks = useMemo(() => sentence.match(/[A-Za-z0-9']+|[^\sA-Za-z0-9]/g)?.slice(0, 16) ?? [], [sentence]);
  const attn = useMemo(() => attention(head, toks, temp, causal), [head, toks, temp, causal]);
  const pronounIdx = toks.findIndex((t) => PRONOUNS.has(t.toLowerCase()));
  const focusRow = focus ?? (pronounIdx >= 0 ? pronounIdx : toks.length - 1);

  const resetB = () => { resetAtt(); setFocus(null); };

  const A = vecOf(pickA), B = vecOf(pickB);
  const sx = (x: number) => ((x + 7) / 14) * 100;
  const sy = (y: number) => ((7 - y) / 14) * 100;

  return (
    <ModulePage
      moduleId="embeddings"
      title="Embeddings & Attention"
      intro="After tokenizing, every token ID is swapped for a long list of numbers: its embedding. Words with similar meaning end up close together. Then attention lets each token look at the others and borrow the context it needs, which is how 'it' finds out it means 'the cat'."
    >
      <Section title="Meaning becomes geometry" kicker="concept">
        <p>An <span className="font-mono text-foreground">embedding</span> is a learned vector. During training, words used in similar contexts get pushed toward similar vectors, so distance and direction start to mean something. The famous example: the arrow from <code>man</code> to <code>woman</code> points the same way as <code>king</code> to <code>queen</code>.</p>
        <p>Real models use hundreds or thousands of dimensions. The lab below squeezes a small vocabulary into two so you can see it.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("embeddings").slice(0, 3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Embedding map">
        <ResetButton onClick={resetA} />
        <div className="grid lg:grid-cols-[1fr_300px] gap-5">
          <div className="relative aspect-square max-h-[460px] w-full rounded-lg border border-border bg-background surface-grid">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label="2D embedding scatter plot">
              <line x1="50" y1="0" x2="50" y2="100" stroke="var(--border)" strokeWidth="0.3" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeWidth="0.3" />
              {/* origin vectors for the picked pair */}
              {[A, B].map((p, k) => (
                <line key={k} x1="50" y1="50" x2={sx(p.x)} y2={sy(p.y)} stroke={k === 0 ? "var(--chart-1)" : "var(--g-green)"} strokeWidth="0.6" strokeDasharray="1.5 1" />
              ))}
              {/* analogy arrow */}
              <line x1={sx(vecOf(analogy[1]).x)} y1={sy(vecOf(analogy[1]).y)} x2={sx(vecOf(analogy[2]).x)} y2={sy(vecOf(analogy[2]).y)} stroke="var(--g-yellow)" strokeWidth="0.5" />
              <line x1={sx(vecOf(analogy[0]).x)} y1={sy(vecOf(analogy[0]).y)} x2={sx(result.target.x)} y2={sy(result.target.y)} stroke="var(--g-yellow)" strokeWidth="0.5" strokeDasharray="1 0.8" />
              <circle cx={sx(result.target.x)} cy={sy(result.target.y)} r="2.4" fill="none" stroke="var(--g-yellow)" strokeWidth="0.5" />
              {WORDS.map((p) => {
                const sel = p.w === pickA || p.w === pickB;
                return (
                  <g key={p.w} onClick={() => clickWord(p.w)} className="cursor-pointer">
                    <circle cx={sx(p.x)} cy={sy(p.y)} r={sel ? 1.6 : 1.1} fill={CLUSTER_COLOR[p.c]} stroke={sel ? "var(--foreground)" : "none"} strokeWidth="0.4" />
                    <text x={sx(p.x) + 1.8} y={sy(p.y) + 1} fontSize="2.6" fill="var(--foreground)" fontFamily="var(--font-mono)" fontWeight={sel ? 700 : 400}>{p.w}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <div className="text-xs font-mono text-muted-foreground inline-flex items-center">
                Compare two words
                <Help label="Compare">Click any dot to set word {nextPick}. Cosine similarity measures the angle between the two vectors from the centre; 1 means the same direction.</Help>
              </div>
              <div className="mt-2 font-mono">
                <span className="text-chart-1 font-semibold">{pickA}</span> vs <span className="text-g-green font-semibold">{pickB}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded bg-background border border-border p-2">cosine<div className="text-lg text-primary">{cosine(A, B).toFixed(2)}</div></div>
                <div className="rounded bg-background border border-border p-2">distance<div className="text-lg text-primary">{dist(A, B).toFixed(2)}</div></div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Next click sets word <b>{nextPick}</b>.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <div className="text-xs font-mono text-muted-foreground inline-flex items-center">
                Vector arithmetic
                <Help label="Vector arithmetic">Take word A, subtract B, add C. The nearest remaining word to that point is the model's "answer". The yellow arrows show the shared direction.</Help>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ANALOGIES.map((an) => (
                  <button key={an.join()} onClick={() => setAnalogy(an)} className={`text-xs font-mono px-2 py-1 rounded border ${an === analogy ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
                    {an[0]} − {an[1]} + {an[2]}
                  </button>
                ))}
              </div>
              <div className="mt-3 font-mono text-sm">
                {analogy[0]} − {analogy[1]} + {analogy[2]} ≈ <span className="text-success font-bold">{result.nearest.w}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {(Object.keys(CLUSTER_COLOR) as Cluster[]).map((c) => (
                <span key={c} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: CLUSTER_COLOR[c] }} />{c}</span>
              ))}
            </div>
          </div>
        </div>
      </Lab>

      <Section title="Attention: tokens talking to tokens" kicker="mechanism">
        <p>An embedding alone does not know its context: the vector for <code>bank</code> is the same in "river bank" and "bank account". <span className="font-mono text-foreground">Self-attention</span> fixes this. Each token asks a question (query), every token offers a label (key), and the match scores, after a <span className="font-mono text-foreground">softmax</span>, decide how much of each token's information (value) to mix in.</p>
        <p>A model has many <span className="font-mono text-foreground">heads</span> per layer and dozens of layers, and each head learns its own pattern. The three toy heads below are hand-written to mimic patterns researchers actually find.</p>
      </Section>

      <Lab title="Attention heatmap">
        <ResetButton onClick={resetB} share />
        <label htmlFor="attn-input" className="block text-xs font-mono text-muted-foreground mb-1">Sentence (up to 16 tokens)</label>
        <input id="attn-input" value={sentence} onChange={(e) => { setSentence(e.target.value); setFocus(null); }} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-4" />
        <div className="flex flex-wrap gap-2 mb-4">
          {HEADS.map((h) => (
            <span key={h.id} className="inline-flex items-center">
              <button onClick={() => setHead(h.id)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition ${head === h.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{h.label}</button>
              <Help label={h.label}>{h.help}</Help>
            </span>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-5 text-xs font-mono">
          <label className="block">
            <span className="inline-flex items-center">softmax temperature: <span className="text-primary ml-1">{temp.toFixed(1)}</span>
              <Help label="Temperature">Divides scores before softmax. Low values make attention sharp (one token wins); high values spread it evenly.</Help>
            </span>
            <input type="range" min={0.2} max={4} step={0.1} value={temp} onChange={(e) => setTemp(+e.target.value)} className="w-full accent-primary" />
          </label>
          <label className="inline-flex items-center gap-2 self-end">
            <input type="checkbox" checked={causal} onChange={(e) => setCausal(e.target.checked)} className="accent-primary" />
            causal mask (GPT-style: only look backwards)
            <Help label="Causal mask">Decoder models such as GPT cannot peek at future tokens while generating, so the upper triangle is blocked. Encoder models such as BERT see both directions.</Help>
          </label>
        </div>

        {toks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0.5 font-mono text-[11px]">
              <thead>
                <tr>
                  <th className="text-right pr-2 text-muted-foreground font-normal">query ↓ key →</th>
                  {toks.map((t, j) => <th key={j} className="px-1 font-normal text-muted-foreground [writing-mode:vertical-rl] rotate-180 h-16 text-left">{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {attn.map((row, i) => (
                  <tr key={i} onClick={() => setFocus(i)} className="cursor-pointer">
                    <td className={`text-right pr-2 ${i === focusRow ? "text-primary font-bold" : "text-muted-foreground"}`}>{toks[i]}</td>
                    {row.map((w, j) => (
                      <td key={j} title={`${toks[i]} → ${toks[j]}: ${(w * 100).toFixed(1)}%`} className={`h-7 w-7 min-w-7 rounded text-center align-middle ${i === focusRow ? "ring-1 ring-primary/50" : ""}`} style={{ background: `color-mix(in oklch, var(--primary) ${Math.round(w * 100)}%, var(--secondary))`, color: w > 0.5 ? "var(--primary-foreground)" : "var(--muted-foreground)" }}>
                        {w >= 0.1 ? Math.round(w * 100) : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {toks[focusRow] && (
          <div className="mt-5 rounded-md border border-border bg-background p-4">
            <div className="text-xs font-mono text-muted-foreground mb-2">Where does <span className="text-primary font-bold">"{toks[focusRow]}"</span> look? (click a row to change)</div>
            <div className="flex flex-wrap gap-1 font-mono text-sm">
              {toks.map((t, j) => {
                const w = attn[focusRow]?.[j] ?? 0;
                return (
                  <span key={j} className="px-1.5 py-0.5 rounded" style={{ background: `color-mix(in oklch, var(--g-green) ${Math.round(w * 90)}%, transparent)`, fontWeight: w > 0.3 ? 700 : 400 }}>{t}</span>
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Try: switch to Head 2 and read the "it" row. Then change "cat" to "dog" or replace "it" with "she". Turn off the causal mask to see what an encoder would allow.</p>
      </Lab>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("embeddings").slice(3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
