import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";
import { REAL_ENCODINGS, tokenizeReal, useRealTokenizer, type RealEncoding } from "@/lib/realTokenizer";

export const Route = createFileRoute("/tokens")({
  head: () => ({
    meta: [
      { title: "Tokens | GiriBioAI" },
      { name: "description", content: "How language models turn text into numbers. Try a live tokenizer in your browser." },
      { property: "og:title", content: "Tokens | GiriBioAI" },
      { property: "og:description", content: "Live tokenizer simulator with whitespace, char, and BPE-style splits." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Tokens",
          description: "How language models turn text into numbers, with a live BPE-style tokenizer.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/tokens",
        }),
      },
    ],
  }),
  component: TokensPage,
});

type Mode = "char" | "word" | "bpe";

/** Tiny BPE-ish splitter: greedy match against a hand-tuned merge list. Educational, not production. */
const MERGES = ["ing", "tion", "the", " the", " a ", "able", " and", " of", " to", " in", " is", " are", "ly", "ed", "ation"];
function bpe(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let matched = "";
    for (const m of MERGES) {
      if (text.startsWith(m, i) && m.length > matched.length) matched = m;
    }
    if (matched) { out.push(matched); i += matched.length; }
    else { out.push(text[i]); i += 1; }
  }
  // collapse single-letter runs into small chunks for readability
  const compact: string[] = [];
  for (const t of out) {
    const last = compact[compact.length - 1];
    if (last && last.length < 3 && t.length === 1 && /[a-zA-Z]/.test(last) && /[a-zA-Z]/.test(t)) {
      compact[compact.length - 1] = last + t;
    } else compact.push(t);
  }
  return compact;
}

type AnyMode = Mode | RealEncoding;
const TEACH_MODES: Mode[] = ["char", "word", "bpe"];
const isReal = (m: AnyMode): m is RealEncoding => !TEACH_MODES.includes(m as Mode);

function tokenize(text: string, mode: Mode): string[] {
  if (mode === "char") return Array.from(text);
  if (mode === "word") return text.match(/\S+|\s+/g) ?? [];
  return bpe(text);
}

const COLORS = ["bg-chart-1/20", "bg-chart-2/20", "bg-chart-3/30", "bg-chart-4/25", "bg-secondary"];

const DEFAULTS = { text: "The quick brown fox is learning to read.", mode: "bpe" as AnyMode };

function TokensPage() {
  const [s, setS, reset] = useShareState("tok", DEFAULTS);
  const mode = s.mode as AnyMode;
  const real = isReal(mode);
  const { codec, error } = useRealTokenizer(real ? mode : "o200k_base", real);
  const [compare, setCompare] = useState(false);
  const cmp4o = useRealTokenizer("o200k_base", compare);
  const cmp4 = useRealTokenizer("cl100k_base", compare);
  const cmp2 = useRealTokenizer("r50k_base", compare);

  const tokens = useMemo(() => {
    if (!real) return tokenize(s.text, mode as Mode).map((t) => ({ text: t, id: 1000 + (t.charCodeAt(0) % 900), partial: false }));
    if (!codec) return [];
    return tokenizeReal(codec, s.text);
  }, [s.text, mode, real, codec]);

  const words = s.text.trim() ? s.text.trim().split(/\s+/).length : 0;

  return (
    <ModulePage
      moduleId="tokens"
      title="Tokens"
      intro="Models don't read characters, instead they read tokens. A tokenizer splits your text into chunks and maps each chunk to an integer ID. The choice of tokenizer changes everything downstream: vocabulary size, sequence length, even bias."
    >
      <Section title="Why tokens?" kicker="concept">
        <p>Neural networks operate on numbers. Tokenization is the bridge from text to integer IDs the model can embed and process. The most common modern approach is <span className="font-mono text-foreground">Byte-Pair Encoding</span> (BPE), which learns frequent subword chunks like <code>tion</code>, <code>ing</code>, or <code> the</code>.</p>
        <p>Trade-offs: character-level tokenizers have tiny vocabularies but long sequences. Word-level tokenizers have huge vocabularies and can't handle new words. BPE sits in the middle. The three teaching modes are simplified; the GPT modes run the exact tokenizers OpenAI models use, right in your browser.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("tokens").map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Tokenizer">
        <ResetButton onClick={() => { reset(); setCompare(false); }} share />
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground self-center inline-flex items-center">
            teaching
            <Help label="Tokenizer mode">
              <b>char</b> = one character per token (tiny vocab, very long sequences). <b>word</b> = whitespace splits (huge vocab, fails on new words). <b>bpe</b> = a hand-made subword splitter that mimics real LLMs.<br />
              <span className="text-muted-foreground">Example: <b>learning</b> becomes 8 chars, 1 word, or ~2 BPE pieces (learn + ing).</span>
            </Help>
            :
          </span>
          {TEACH_MODES.map((m) => (
            <button key={m} onClick={() => setS({ mode: m })} className={`px-3 py-1.5 rounded-md text-sm font-mono border transition ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-mono text-muted-foreground self-center inline-flex items-center">
            real
            <Help label="Real tokenizers">
              Exact byte-level BPE vocabularies from the gpt-tokenizer library. The vocabulary file (0.5 to 2.4 MB) downloads once when you pick a mode and runs offline. IDs shown are the true token IDs.
            </Help>
            :
          </span>
          {REAL_ENCODINGS.map((e) => (
            <button key={e.id} onClick={() => setS({ mode: e.id })} title={`${e.models} · ${e.vocab} tokens`} className={`px-3 py-1.5 rounded-md text-sm font-mono border transition ${mode === e.id ? "bg-success text-success-foreground border-success" : "border-border hover:bg-secondary"}`}>
              {e.label}
            </button>
          ))}
          <div className="ml-auto text-xs font-mono text-muted-foreground inline-flex items-center">
            {real && !codec ? "loading vocabulary…" : `${tokens.length} tokens · ${words} words · ${s.text.length} chars`}
            <Help label="Token count">
              Token count drives API cost and context-window usage. A rough rule of thumb for English: 1 token ≈ ¾ of a word, or about 4 characters.
            </Help>
          </div>
        </div>
        {error && <p className="text-xs text-warning mb-2">Could not load the tokenizer: {error}</p>}
        <label htmlFor="tokens-input" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          Input text
          <Help label="Input text">
            Try emoji, code, numbers or non-English text: token counts balloon for scripts the tokenizer saw less often in training.<br />
            <span className="text-muted-foreground">Example: compare "hello" with "வணக்கம்" (Tamil) in GPT-2 vs GPT-4o.</span>
          </Help>
        </label>
        <textarea
          id="tokens-input"
          value={s.text}
          onChange={(e) => setS({ text: e.target.value })}
          rows={3}
          className="w-full font-mono text-sm rounded-md border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-4 rounded-md border border-border bg-background p-4 font-mono text-sm leading-7 min-h-[3.5rem]">
          {tokens.map((t, i) => (
            <span key={i} title={`id ${t.id}`} className={`inline-block rounded px-1 mr-0.5 my-0.5 ${t.partial ? "bg-warning/20 border border-dashed border-warning/60" : COLORS[i % COLORS.length]}`}>
              {t.partial ? "▒" : t.text.replace(/\n/g, "↵").replace(/ /g, "·")}
            </span>
          ))}
        </div>
        {tokens.some((t) => t.partial) && <p className="mt-2 text-xs text-muted-foreground"><span className="font-mono text-warning">▒</span> = a token holding only some bytes of a character (common for emoji and many non-Latin scripts).</p>}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          {tokens.slice(0, 16).map((t, i) => (
            <div key={i} className="rounded border border-border bg-secondary/30 px-2 py-1 flex justify-between gap-2">
              <span className="truncate">{t.partial ? "(partial byte)" : JSON.stringify(t.text)}</span>
              <span className={real ? "text-success" : "text-primary"}>#{t.id}</span>
            </div>
          ))}
        </div>
        {!real && <p className="mt-2 text-xs text-muted-foreground">IDs in teaching modes are made up. Pick a GPT mode for true IDs.</p>}

        <div className="mt-5 rounded-md border border-border bg-secondary/30 p-4">
          <label className="flex items-center gap-2 text-xs font-mono">
            <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} className="accent-primary" />
            compare token counts across real tokenizers
          </label>
          {compare && (
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs font-mono">
              {[["GPT-4o", cmp4o.codec], ["GPT-4", cmp4.codec], ["GPT-2", cmp2.codec]].map(([label, c]) => {
                const codecC = c as typeof codec;
                return (
                  <div key={label as string} className="rounded border border-border bg-background p-2">
                    {label as string}
                    <div className="text-lg text-primary">{codecC ? codecC.encode(s.text).length : "…"}</div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Bigger, newer vocabularies usually need fewer tokens for the same text, especially for code and non-English languages, which makes those models cheaper and lets more fit in the context.</p>
        </div>
      </Lab>
    </ModulePage>
  );
}
