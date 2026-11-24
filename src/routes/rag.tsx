import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/rag")({
  head: () => ({
    meta: [
      { title: "Retrieval-Augmented Generation (RAG) | GiriBioAI" },
      { name: "description", content: "How models answer questions about your own documents. Try a live retrieval pipeline." },
      { property: "og:title", content: "Retrieval-Augmented Generation (RAG) | GiriBioAI" },
      { property: "og:description", content: "Live RAG retrieval demo with TF-IDF cosine ranking." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Retrieval-Augmented Generation",
          description: "Indexing documents, embedding queries, and ranking chunks live.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/rag",
        }),
      },
    ],
  }),
  component: RagPage,
});

const DEFAULT_DOCS = [
  "Photosynthesis converts sunlight, water and carbon dioxide into glucose and oxygen inside chloroplasts.",
  "The mitochondria is the powerhouse of the cell, producing ATP through respiration.",
  "Newton's second law states that force equals mass times acceleration (F = ma).",
  "DNA is a double helix made of nucleotides: adenine, thymine, cytosine and guanine.",
  "The speed of light in a vacuum is approximately 299,792 kilometers per second.",
  "Plants release oxygen during photosynthesis, which animals breathe to survive.",
  "Black holes have an event horizon beyond which not even light can escape.",
];

const STOP = new Set("the a an of to in on for is are and or but with by from that this it as at be".split(" "));
function tokens(s: string) { return s.toLowerCase().match(/[a-z0-9']+/g)?.filter((t) => !STOP.has(t)) ?? []; }

function tfidfScore(query: string, docs: string[]) {
  const docToks = docs.map(tokens);
  const N = docs.length;
  const df = new Map<string, number>();
  for (const d of docToks) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  const idf = (w: string) => Math.log((N + 1) / ((df.get(w) ?? 0) + 1)) + 1;

  const vec = (toks: string[]) => {
    const v = new Map<string, number>();
    for (const t of toks) v.set(t, (v.get(t) ?? 0) + 1);
    for (const [k, c] of v) v.set(k, c * idf(k));
    return v;
  };
  const cos = (a: Map<string, number>, b: Map<string, number>) => {
    let dot = 0, na = 0, nb = 0;
    for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k)!; }
    for (const v of b.values()) nb += v * v;
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  };
  const q = vec(tokens(query));
  return docToks.map((d, i) => ({ i, score: cos(q, vec(d)), terms: [...q.keys()] }));
}

function RagPage() {
  const [st, setSt, reset] = useShareState("rag", { docs: DEFAULT_DOCS.join("\n"), q: "how do plants make food?", k: 3 });
  const { docs: docsText, q: query, k } = st;
  const setDocsText = (v: string) => setSt({ docs: v });
  const setQuery = (v: string) => setSt({ q: v });
  const setK = (v: number) => setSt({ k: v });

  const docs = useMemo(() => docsText.split("\n").map((d) => d.trim()).filter(Boolean), [docsText]);
  const ranked = useMemo(
    () => tfidfScore(query, docs).sort((a, b) => b.score - a.score),
    [query, docs]
  );
  const top = ranked.slice(0, k);

  const prompt = `You are a helpful assistant. Use ONLY the context below.\n\nContext:\n${top.map((r, i) => `[${i + 1}] ${docs[r.i]}`).join("\n")}\n\nQuestion: ${query}\n\nAnswer:`;

  return (
    <ModulePage
      moduleId="rag"
      title="Retrieval-Augmented Generation"
      intro="LLMs only know what they were trained on. RAG lets a model answer about your private or fresh documents by retrieving relevant chunks first and stuffing them into the prompt."
    >
      <Section title="The pipeline in 4 steps" kicker="concept">
        <p><span className="font-mono text-foreground">1. Chunk</span> documents into passages. <span className="font-mono text-foreground">2. Embed</span> each chunk into a vector. <span className="font-mono text-foreground">3. Retrieve</span> the top-k by similarity to the query. <span className="font-mono text-foreground">4. Generate</span> with the chunks prepended to the prompt.</p>
        <p>Production systems use neural embeddings + a vector database. The lab below uses classic TF-IDF cosine, and the math feels identical.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        <KeyTerm term="embedding" def="A vector that captures meaning. Similar text → close vectors." />
        <KeyTerm term="top-k" def="How many retrieved chunks to send to the LLM." />
        <KeyTerm term="grounding" def="Forcing answers to come from retrieved context, reducing hallucinations." />
      </div>

      <Lab title="RAG retriever">
        <ResetButton onClick={reset} share />
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="rag-docs" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
              Knowledge base (1 doc per line)
              <Help label="Knowledge base">
                Your private/fresh documents. In production these are chunked into ~200-token passages and stored in a vector database; here each line is one chunk.<br />
                <span className="text-muted-foreground">Example: add a doc about the Eiffel Tower → asking "tall Paris structure" now ranks it first.</span>
              </Help>
            </label>
            <textarea id="rag-docs" value={docsText} onChange={(e) => setDocsText(e.target.value)} rows={9} className="w-full font-mono text-xs rounded-md border border-input bg-background p-3" />
          </div>
          <div>
            <label htmlFor="rag-query" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
              User question
              <Help label="User question">
                The query the system tries to answer. It's compared against every chunk to find the most relevant ones.<br />
                <span className="text-muted-foreground">Example: "how do plants make food?" ranks photosynthesis docs highest.</span>
              </Help>
            </label>
            <input id="rag-query" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-3" />
            <label className="block text-xs font-mono">
              <span className="inline-flex items-center">
                Top-K: <span className="text-primary ml-1">{k}</span>
                <Help label="Top-K">
                  How many of the highest-scoring chunks to inject into the LLM's prompt. Too low → missing facts. Too high → noisy context, more tokens, more cost.<br />
                  <span className="text-muted-foreground">Example: K=1 may miss the full answer; K=7 includes weaker, possibly distracting docs.</span>
                </Help>
              </span>
              <input type="range" min={1} max={Math.max(1, docs.length)} value={k} onChange={(e) => setK(+e.target.value)} className="w-full accent-primary" />
            </label>
            <div className="mt-3 space-y-2">
              {ranked.map((r) => {
                const isTop = top.includes(r);
                return (
                  <div key={r.i} className={`rounded-md border p-3 text-sm transition ${isTop ? "border-primary/60 bg-primary/5" : "border-border bg-background"}`}>
                    <div className="flex justify-between items-center mb-1 font-mono text-xs">
                      <span className={isTop ? "text-primary" : "text-muted-foreground"}>doc #{r.i + 1}</span>
                      <span className={isTop ? "text-primary" : "text-muted-foreground"}>{(r.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-muted-foreground line-clamp-2">{docs[r.i]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <div className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
            Generated prompt sent to the LLM
            <Help label="Generated prompt">
              The retrieved chunks are stitched into a prompt that instructs the model to answer using only that context. This is what "grounding" means in practice.<br />
              <span className="text-muted-foreground">Example: with K=2, the prompt contains the top 2 docs followed by the question.</span>
            </Help>
          </div>
          <pre className="rounded-md border border-border bg-background p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto">{prompt}</pre>
        </div>
      </Lab>
    </ModulePage>
  );
}