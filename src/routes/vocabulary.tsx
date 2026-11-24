import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help } from "@/components/learn/ModulePage";

export const Route = createFileRoute("/vocabulary")({
  head: () => ({
    meta: [
      { title: "Vocabulary | GiriBioAI" },
      { name: "description", content: "What a model's vocabulary is, how it's built, and why size matters." },
      { property: "og:title", content: "Vocabulary | GiriBioAI" },
      { property: "og:description", content: "Build a vocabulary from a corpus and watch coverage." },
    ],
  }),
  component: VocabularyPage,
});

const DEFAULT_CORPUS = `the cat sat on the mat
the dog sat on the log
a quick brown fox jumps over the lazy dog
language models learn from large amounts of text
a vocabulary is a finite set of tokens that the model recognizes
rare words may be split into multiple subword tokens`;

function VocabularyPage() {
  const [corpus, setCorpus] = useState(DEFAULT_CORPUS);
  const [size, setSize] = useState(20);

  const reset = () => { setCorpus(DEFAULT_CORPUS); setSize(20); };

  const { vocab, total, coverage, freq } = useMemo<{
    vocab: [string, number][];
    total: number;
    coverage: number;
    freq: [string, number][];
  }>(() => {
    const words = corpus.toLowerCase().match(/[a-z']+/g) ?? [];
    const f = new Map<string, number>();
    for (const w of words) f.set(w, (f.get(w) ?? 0) + 1);
    const sorted = [...f.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, size);
    const inVocab = new Set(top.map(([w]) => w));
    const covered = words.filter((w) => inVocab.has(w)).length;
    return {
      vocab: top,
      total: words.length,
      coverage: words.length === 0 ? 0 : (covered / words.length) * 100,
      freq: sorted,
    };
  }, [corpus, size]);

  return (
    <ModulePage
      moduleId="vocabulary"
      title="Vocabulary"
      intro="A model's vocabulary is the fixed set of tokens it knows. Building it well is a balancing act between sequence length, memory and coverage. Bigger vocab = shorter sequences but a larger embedding table."
    >
      <Section title="How vocabularies are built" kicker="concept">
        <p>The simplest approach: count every word in a corpus, keep the top N most frequent. Modern tokenizers (BPE, WordPiece, Unigram) instead learn <em>subword</em> merges so rare words still decompose into known pieces. GPT-4 uses ~100k tokens; Llama 3 uses 128k.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        <KeyTerm term="vocab size" def="Count of unique tokens the model recognizes." />
        <KeyTerm term="OOV" def="Out-of-vocabulary, meaning a word the tokenizer can't represent." />
        <KeyTerm term="coverage" def="% of corpus words representable by the vocab." />
      </div>

      <Lab title="Vocabulary Builder">
        <div className="flex justify-end mb-2">
          <button onClick={reset} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
        </div>
        <label htmlFor="vocab-corpus" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          Corpus
          <Help label="Corpus">
            The text the vocabulary is built from. Real tokenizers train on hundreds of GBs; here a few sentences are enough to see the effect.<br />
            <span className="text-muted-foreground">Example: adding "the dog barked" increases "dog" frequency and may push it into the top-N list.</span>
          </Help>
        </label>
        <textarea id="vocab-corpus" value={corpus} onChange={(e) => setCorpus(e.target.value)} rows={6} className="w-full font-mono text-sm rounded-md border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="mt-4 flex items-center gap-4">
          <label className="text-xs font-mono text-muted-foreground inline-flex items-center">
            Vocab size: <span className="text-primary ml-1">{size}</span>
            <Help label="Vocab size">
              How many of the most-frequent words to keep. Smaller = more out-of-vocabulary words; larger = bigger embedding table and more memory.<br />
              <span className="text-muted-foreground">Example: size 10 may cover 60% of words; size 40 often covers 95%+.</span>
            </Help>
          </label>
          <input aria-label="Vocab size" type="range" min={5} max={Math.max(10, freq.length)} value={size} onChange={(e) => setSize(+e.target.value)} className="flex-1 accent-primary" />
        </div>
        <div className="mt-5 grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-md border border-border bg-background p-3 max-h-80 overflow-auto">
            <div className="font-mono text-xs text-muted-foreground mb-2">top {vocab.length} tokens</div>
            <ul className="font-mono text-sm space-y-1">
              {vocab.map(([w, c], i) => (
                <li key={w} className="flex justify-between gap-3">
                  <span className="text-muted-foreground w-8">#{i + 1}</span>
                  <span className="flex-1">{w}</span>
                  <span className="text-primary">{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <Stat label="Unique words" value={freq.length} />
            <Stat label="Total words" value={total} />
            <Stat label="Coverage" value={`${coverage.toFixed(1)}%`} accent />
            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              Shrink the vocab to feel the trade-off: rare words drop out first.
            </div>
          </div>
        </div>
      </Lab>
    </ModulePage>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}