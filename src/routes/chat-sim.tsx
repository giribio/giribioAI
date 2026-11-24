import { createFileRoute } from "@tanstack/react-router";
import { CompleteToggle } from "@/components/learn/ModulePage";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRealTokenizer } from "@/lib/realTokenizer";
import { Send, Cpu, Zap, DollarSign, Clock, Hash, AlertTriangle, Sparkles, RotateCcw, Play, Pause, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";

export const Route = createFileRoute("/chat-sim")({
  head: () => ({
    meta: [
      { title: "Chat Simulator | See tokens, cost & latency for every message" },
      { name: "description", content: "A ChatGPT-like sandbox that shows exactly how many tokens your prompt and the model's reply use, since even 'hi' and 'thanks' cost tokens." },
      { property: "og:title", content: "Chat Simulator | GiriBioAI" },
      { property: "og:description", content: "See exactly how many tokens, what cost, and how much latency every message takes, including misspellings and even 'hi' or 'thanks'." },
    ],
  }),
  component: ChatSim,
});

// -----------------------------------------------------------------------------
// Tokenizer (heuristic, BPE-like). Not exact GPT tokenization, but close enough
// for teaching: ~4 chars/token, whitespace becomes leading-space tokens, common
// short words are 1 token, long/rare words split into sub-pieces, and obvious
// misspellings get fragmented more (since BPE has no merge for them).
// -----------------------------------------------------------------------------

const COMMON = new Set([
  "the","a","an","and","or","but","if","then","else","of","to","in","on","at",
  "is","are","was","were","be","been","being","i","you","he","she","it","we","they",
  "this","that","these","those","my","your","our","their","for","with","as","by",
  "from","not","no","yes","do","does","did","have","has","had","can","will","would",
  "should","could","what","when","where","why","how","who","hi","hello","hey","thanks",
  "thank","please","ok","okay","sure","sorry","bye","good","bad","like","just","so",
  "very","much","more","less","one","two","three","new","old","get","got","make","made",
  "go","going","gone","know","think","want","need","help","love","time","day","work",
]);

// Tiny spell checker: flag tokens that look like misspellings of common words.
const DICT_HINTS: Record<string, string> = {
  recieve: "receive", teh: "the", thx: "thanks", thnx: "thanks", thnks: "thanks",
  pls: "please", plz: "please", definately: "definitely", seperate: "separate",
  occured: "occurred", wierd: "weird", alot: "a lot", untill: "until",
  becuase: "because", begining: "beginning", goverment: "government",
  enviroment: "environment", calender: "calendar", adress: "address",
  occassion: "occasion", tommorow: "tomorrow", neccessary: "necessary",
  acheive: "achieve", beleive: "believe", freind: "friend", greatful: "grateful",
  hav: "have", wht: "what", wat: "what", u: "you", ur: "your", r: "are",
  helo: "hello", helllo: "hello", hii: "hi", hiii: "hi",
};

type Tok = { text: string; kind: "word" | "subword" | "punct" | "space" | "misspell" };

function tokenize(input: string): Tok[] {
  if (!input) return [];
  const out: Tok[] = [];
  // Split keeping whitespace + punctuation.
  const parts = input.match(/\s+|[A-Za-z']+|[0-9]+|[^\sA-Za-z0-9]/g) ?? [];
  for (const p of parts) {
    if (/^\s+$/.test(p)) {
      // collapse to a single leading-space marker per run; long runs cost extra
      const extras = Math.floor(p.length / 4);
      for (let i = 0; i <= extras; i++) out.push({ text: "·", kind: "space" });
      continue;
    }
    if (/^[^\sA-Za-z0-9]$/.test(p)) {
      out.push({ text: p, kind: "punct" });
      continue;
    }
    if (/^[0-9]+$/.test(p)) {
      // digits: ~1 token per 3 chars
      for (let i = 0; i < p.length; i += 3) {
        out.push({ text: p.slice(i, i + 3), kind: "subword" });
      }
      continue;
    }
    const low = p.toLowerCase();
    const mis = DICT_HINTS[low];
    if (COMMON.has(low) && p.length <= 6) {
      out.push({ text: p, kind: "word" });
      continue;
    }
    // Misspellings fragment more (BPE has no merge → more sub-pieces)
    const chunkSize = mis ? 2 : p.length > 10 ? 3 : 4;
    if (p.length <= chunkSize) {
      out.push({ text: p, kind: mis ? "misspell" : "word" });
    } else {
      for (let i = 0; i < p.length; i += chunkSize) {
        out.push({ text: p.slice(i, i + chunkSize), kind: mis ? "misspell" : "subword" });
      }
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Canned response generator: gives meaningful replies so token counts feel real.
// -----------------------------------------------------------------------------

function generateReply(prompt: string): string {
  const p = prompt.trim().toLowerCase();
  if (!p) return "I didn't catch that. Could you type a question?";
  if (/^(hi+|hello+|hey+|yo|sup|helo+)[!.?]*$/.test(p))
    return "Hi! How can I help you today?";
  if (/^(thanks|thank you|thx|thnx|ty|cheers)[!.?]*$/.test(p))
    return "You're welcome, happy to help!";
  if (/^(bye|goodbye|cya|see ya)/.test(p))
    return "Goodbye! Come back any time.";
  if (/(your name|who are you)/.test(p))
    return "I'm a simulated assistant running entirely in your browser. No real model is being called, but every token you see is measured locally so you can feel the cost of each word.";
  if (/(how.*work|explain.*token|what.*token)/.test(p))
    return "Language models read text as tokens, which are small chunks of characters. Common words like 'the' are one token, but rare words and typos split into many sub-pieces, which is why misspellings cost more.";
  if (p.endsWith("?"))
    return `Good question. The short answer is: it depends on context, but generally yes. If you want, I can walk through the trade-offs step by step and give a concrete example you can try yourself.`;
  // Default: echo-style helpful reply, length scales with prompt length.
  const base = `Got it, you said: "${prompt.trim()}". Here's a thought: break the problem into smaller pieces, try the simplest version first, and iterate from there.`;
  return prompt.length > 80 ? base + " Want me to go deeper on any specific part?" : base;
}

// -----------------------------------------------------------------------------
// Pricing presets (illustrative, per 1K tokens, USD)
// -----------------------------------------------------------------------------

const MODELS = {
  "gpt-4o":      { in: 0.0025, out: 0.01,   tps: 80,  ctx: 128000 },
  "gpt-4o-mini": { in: 0.00015,out: 0.0006, tps: 120, ctx: 128000 },
  "claude-3.5":  { in: 0.003,  out: 0.015,  tps: 70,  ctx: 200000 },
  "llama-3-70b": { in: 0.0009, out: 0.0009, tps: 60,  ctx: 8192  },
} as const;
type ModelKey = keyof typeof MODELS;

// -----------------------------------------------------------------------------

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tokens: Tok[];
  misspellings: string[];
  ms: number;       // simulated latency
  cost: number;     // USD
};

function ChatSim() {
  const [model, setModel] = useState<ModelKey>("gpt-4o-mini");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, streaming]);

  const liveTokens = useMemo(() => tokenize(input), [input]);
  const { codec: realCodec } = useRealTokenizer("o200k_base", input.length > 0);
  const liveMisspellings = useMemo(
    () => findMisspellings(input),
    [input]
  );

  const totals = useMemo(() => {
    let inT = 0, outT = 0, cost = 0, ms = 0;
    for (const m of msgs) {
      if (m.role === "user") { inT += m.tokens.length; }
      else { outT += m.tokens.length; }
      cost += m.cost;
      ms += m.ms;
    }
    return { inT, outT, cost, ms };
  }, [msgs]);

  function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const userToks = tokenize(text);
    const userMis = findMisspellings(text);
    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      tokens: userToks,
      misspellings: userMis,
      ms: 0,
      cost: (userToks.length / 1000) * MODELS[model].in,
    };
    setInput("");
    setMsgs((m) => [...m, userMsg]);

    // Simulate streaming reply
    const reply = generateReply(text);
    const replyToks = tokenize(reply);
    const tps = MODELS[model].tps;
    const totalMs = Math.max(300, (replyToks.length / tps) * 1000);
    const ttftMs = 180 + Math.random() * 220; // time to first token
    const cost = (replyToks.length / 1000) * MODELS[model].out;

    const asstId = crypto.randomUUID();
    setMsgs((m) => [...m, {
      id: asstId, role: "assistant", text: "", tokens: [],
      misspellings: [], ms: totalMs + ttftMs, cost,
    }]);
    setStreaming(true);

    const startedAt = performance.now();
    let shown = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt - ttftMs;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const target = Math.min(replyToks.length, Math.floor((elapsed / 1000) * tps));
      if (target > shown) {
        shown = target;
        const slice = replyToks.slice(0, shown);
        const partial = renderText(slice);
        setMsgs((m) => m.map((x) => x.id === asstId ? { ...x, text: partial, tokens: slice } : x));
      }
      if (shown < replyToks.length) {
        setTimeout(tick, 1000 / tps);
      } else {
        setMsgs((m) => m.map((x) => x.id === asstId ? { ...x, text: reply, tokens: replyToks } : x));
        setStreaming(false);
      }
    };
    requestAnimationFrame(tick);
  }

  function reset() {
    setMsgs([]); setInput(""); setStreaming(false);
  }

  const m = MODELS[model];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-6">
        <p className="font-mono text-xs text-primary uppercase tracking-wider">/ chat simulator</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-2">Every word costs tokens, even for "hi"</h1>
        <p className="mt-2 text-muted-foreground max-w-3xl">
          Chat with a simulated assistant and watch the token meter for every prompt and reply.
          Misspellings get fragmented into more sub-pieces, which is why "thnks" can cost more
          than "thanks". No real model is called, since all metrics are computed locally.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Chat column */}
        <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-[70vh]">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 bg-secondary/40">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Simulated chat</span>
              <label htmlFor="chat-sim-model" className="text-xs text-muted-foreground font-mono">· model:</label>
              <select
                id="chat-sim-model"
                aria-label="Active chat model"
                value={model}
                onChange={(e) => setModel(e.target.value as ModelKey)}
                className="bg-background border border-border rounded px-2 py-1 text-xs font-mono"
              >
                {Object.keys(MODELS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground">
              <RotateCcw className="h-3 w-3" /> reset
            </button>
          </div>

          {/* Messages */}
          <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-4">
            {msgs.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">
                Try sending <code className="px-1.5 py-0.5 rounded bg-secondary font-mono">hi</code>,{" "}
                <code className="px-1.5 py-0.5 rounded bg-secondary font-mono">thanks</code>, or a misspelled question like{" "}
                <code className="px-1.5 py-0.5 rounded bg-secondary font-mono">wht is teh capital of france?</code>
              </div>
            )}
            {msgs.map((msg) => (
              <MsgBubble key={msg.id} msg={msg} model={model} />
            ))}
            {streaming && (
              <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> streaming…
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/60 p-3">
            {input.length > 0 && (
              <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>
                  {liveTokens.length} tokens (simulated) · {input.length} chars · ~${((liveTokens.length / 1000) * m.in).toFixed(5)} input cost
                  {realCodec && <span className="ml-2 text-success" title="Exact count from the real GPT-4o (o200k) tokenizer">· exact GPT-4o: {realCodec.encode(input).length}</span>}
                </span>
                {liveMisspellings.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <AlertTriangle className="h-3 w-3" /> {liveMisspellings.length} likely typo(s)
                  </span>
                )}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                aria-label="Chat message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder="Ask anything… try a typo on purpose"
                rows={2}
                className="flex-1 resize-none rounded-md bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={send}
                disabled={!input.trim() || streaming}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Send
              </button>
            </div>
          </div>
        </div>

        {/* Metrics column */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">Session totals</p>
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={Hash}    label="Input tok"  value={totals.inT.toLocaleString('en-US')} />
              <Stat icon={Hash}    label="Output tok" value={totals.outT.toLocaleString('en-US')} />
              <Stat icon={DollarSign} label="Cost"    value={`$${totals.cost.toFixed(5)}`} />
              <Stat icon={Clock}   label="Sim time"   value={`${(totals.ms/1000).toFixed(2)}s`} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-xs space-y-2">
            <p className="font-mono text-muted-foreground uppercase tracking-wider">Active model</p>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Throughput</span><span className="font-mono">{m.tps} tok/s</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Input price</span><span className="font-mono">${m.in.toFixed(5)}/1K</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Output price</span><span className="font-mono">${m.out.toFixed(5)}/1K</span></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Context window</span><span className="font-mono">{m.ctx.toLocaleString('en-US')} tok</span></div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-mono uppercase tracking-wider text-foreground">How tokens are counted</p>
            <p>Common short words ("the", "hi") are <span className="text-foreground">1 token</span>. Longer words split every ~4 chars. Punctuation and whitespace each cost a token.</p>
            <p>Misspellings have <span className="text-warning">no learned merge</span> in real BPE vocabs, so they fragment into 2-char pieces, costing 2-3× more.</p>
          </div>
        </aside>
      </div>

      <InteractionsTable msgs={msgs} model={model} totals={totals} />
      <InteractionsBreakdown msgs={msgs} />
      <TokenStreamScrubber msgs={msgs} />
      <CompleteToggle moduleId="chat-sim" className="mt-10" />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-lg font-mono mt-1">{value}</div>
    </div>
  );
}

function MsgBubble({ msg, model }: { msg: Msg; model: ModelKey }) {
  const isUser = msg.role === "user";
  const m = MODELS[model];
  const rate = isUser ? m.in : m.out;
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-secondary/60 border border-border/60"}`}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text || "▍"}</div>

        {/* token strip */}
        {msg.tokens.length > 0 && (
          <details className="mt-2 group">
            <summary className={`cursor-pointer text-[10px] font-mono uppercase tracking-wider ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {msg.tokens.length} tokens · show pieces
            </summary>
            <div className="mt-2 flex flex-wrap gap-1">
              {msg.tokens.map((t, i) => (
                <span
                  key={i}
                  title={`kind: ${t.kind}`}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                    t.kind === "misspell" ? "bg-warning/15 text-foreground border border-warning/50" :
                    t.kind === "subword"  ? "bg-background/40 border border-border/60" :
                    t.kind === "punct"    ? "bg-background/40 border border-border/40 text-muted-foreground" :
                    t.kind === "space"    ? "bg-background/30 border border-border/30 text-muted-foreground" :
                                            "bg-background/50 border border-border/60"
                  }`}
                >
                  {t.text === " " ? "·" : t.text}
                </span>
              ))}
            </div>
          </details>
        )}

        {/* metrics row */}
        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono ${isUser ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
          <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{msg.tokens.length} tok</span>
          <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" />${((msg.tokens.length / 1000) * rate).toFixed(6)}</span>
          {!isUser && (
            <>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{(msg.ms).toFixed(0)}ms</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" />{Math.round((msg.tokens.length / (msg.ms / 1000)) || 0)} tok/s</span>
              <span className="inline-flex items-center gap-1"><Cpu className="h-3 w-3" />{model}</span>
            </>
          )}
          {isUser && msg.misspellings.length > 0 && (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" />{msg.misspellings.length} typo(s): {msg.misspellings.slice(0,3).join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function findMisspellings(s: string): string[] {
  const out: string[] = [];
  const words = s.match(/[A-Za-z']+/g) ?? [];
  for (const w of words) {
    const k = w.toLowerCase();
    if (DICT_HINTS[k]) out.push(`${w}→${DICT_HINTS[k]}`);
  }
  return out;
}

function renderText(toks: Tok[]): string {
  let s = "";
  for (const t of toks) {
    if (t.kind === "space") s += " ";
    else s += t.text;
  }
  return s;
}

// Per-message overhead in real chat APIs (role markers, separators). Simulated.
const SPECIAL_PER_MSG = 4;

const KIND_META: Record<Tok["kind"] | "special", { label: string; cls: string; dot: string }> = {
  word:     { label: "word",        cls: "bg-primary/70",            dot: "bg-primary/70" },
  subword:  { label: "subword",     cls: "bg-chart-4/80",            dot: "bg-chart-4/80" },
  punct:    { label: "punctuation", cls: "bg-muted-foreground/60",   dot: "bg-muted-foreground/60" },
  space:    { label: "whitespace",  cls: "bg-muted-foreground/30",   dot: "bg-muted-foreground/30" },
  misspell: { label: "misspelling", cls: "bg-warning",          dot: "bg-warning" },
  special:  { label: "special",     cls: "bg-chart-2/80",        dot: "bg-chart-2/80" },
};

function countKinds(toks: Tok[]): Record<Tok["kind"], number> {
  const c: Record<Tok["kind"], number> = { word: 0, subword: 0, punct: 0, space: 0, misspell: 0 };
  for (const t of toks) c[t.kind]++;
  return c;
}

function StackedBar({
  parts,
  total,
}: {
  parts: { key: string; n: number; cls: string; label: string }[];
  total: number;
}) {
  if (total === 0) {
    return <div className="h-3 rounded bg-background/40 border border-border/40" />;
  }
  return (
    <div className="flex h-3 w-full overflow-hidden rounded border border-border/40 bg-background/40">
      {parts.map((p) =>
        p.n > 0 ? (
          <div
            key={p.key}
            className={p.cls}
            style={{ width: `${(p.n / total) * 100}%` }}
            title={`${p.label}: ${p.n} tok (${((p.n / total) * 100).toFixed(1)}%)`}
          />
        ) : null
      )}
    </div>
  );
}

function InteractionsBreakdown({ msgs }: { msgs: Msg[] }) {
  type Row = {
    n: number;
    prompt: string;
    promptKinds: Record<Tok["kind"], number>;
    promptTotal: number;
    replyKinds: Record<Tok["kind"], number>;
    replyTotal: number;
    special: number;
    grand: number;
  };
  const rows: Row[] = [];
  let i = 0;
  let n = 1;
  while (i < msgs.length) {
    const u = msgs[i];
    if (u.role !== "user") { i++; continue; }
    const a = msgs[i + 1] && msgs[i + 1].role === "assistant" ? msgs[i + 1] : undefined;
    const promptKinds = countKinds(u.tokens);
    const replyKinds = a ? countKinds(a.tokens) : { word: 0, subword: 0, punct: 0, space: 0, misspell: 0 };
    const promptTotal = u.tokens.length;
    const replyTotal = a ? a.tokens.length : 0;
    const special = a ? SPECIAL_PER_MSG * 2 : SPECIAL_PER_MSG;
    rows.push({
      n: n++,
      prompt: u.text,
      promptKinds,
      promptTotal,
      replyKinds,
      replyTotal,
      special,
      grand: promptTotal + replyTotal + special,
    });
    i += a ? 2 : 1;
  }

  const kindOrder: (Tok["kind"])[] = ["word", "subword", "misspell", "punct", "space"];

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-secondary/40">
        <p className="font-mono text-xs text-primary uppercase tracking-wider">Token breakdown per interaction</p>
        <p className="text-xs text-muted-foreground mt-1">
          For each turn, see exactly where the tokens went: prompt pieces by kind, response pieces by kind,
          and chat-protocol special tokens (role markers like <code className="font-mono">{`<|im_start|>`}</code> that every API adds per message).
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border/40 text-[11px] font-mono text-muted-foreground">
        {(["word","subword","misspell","punct","space","special"] as const).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${KIND_META[k].dot}`} />
            {KIND_META[k].label}
          </span>
        ))}
      </div>

      <div className="p-4 space-y-5">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No interactions yet. Send a message to see its token breakdown.
          </p>
        )}

        {rows.map((r) => {
          const promptParts = kindOrder.map((k) => ({
            key: `p-${k}`, n: r.promptKinds[k], cls: KIND_META[k].cls, label: `prompt ${KIND_META[k].label}`,
          }));
          const replyParts = kindOrder.map((k) => ({
            key: `r-${k}`, n: r.replyKinds[k], cls: KIND_META[k].cls, label: `reply ${KIND_META[k].label}`,
          }));
          const combinedParts = [
            ...kindOrder.map((k) => ({
              key: `cp-${k}`, n: r.promptKinds[k], cls: KIND_META[k].cls, label: `prompt ${KIND_META[k].label}`,
            })),
            ...kindOrder.map((k) => ({
              key: `cr-${k}`, n: r.replyKinds[k], cls: KIND_META[k].cls, label: `reply ${KIND_META[k].label}`,
            })),
            { key: "cs", n: r.special, cls: KIND_META.special.cls, label: "special tokens" },
          ];
          return (
            <div key={r.n} className="rounded-lg border border-border/50 bg-background/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs">
                  <span className="font-mono text-muted-foreground mr-2">#{r.n}</span>
                  <span className="font-medium truncate inline-block max-w-[60vw] align-bottom" title={r.prompt}>
                    {r.prompt}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">{r.grand} tok total</span>
              </div>

              {/* Combined view */}
              <div className="space-y-2">
                <StackedBar parts={combinedParts} total={r.grand} />

                {/* Split rows: prompt / reply / special */}
                <div className="grid grid-cols-[80px_1fr_70px] gap-2 items-center text-[11px] font-mono">
                  <span className="text-muted-foreground">prompt</span>
                  <StackedBar parts={promptParts} total={r.promptTotal} />
                  <span className="text-right text-muted-foreground">{r.promptTotal} tok</span>

                  <span className="text-muted-foreground">reply</span>
                  <StackedBar parts={replyParts} total={r.replyTotal} />
                  <span className="text-right text-muted-foreground">{r.replyTotal} tok</span>

                  <span className="text-muted-foreground">special</span>
                  <StackedBar
                    parts={[{ key: "s", n: r.special, cls: KIND_META.special.cls, label: "special" }]}
                    total={r.special}
                  />
                  <span className="text-right text-muted-foreground">{r.special} tok</span>
                </div>

                {/* Per-kind counts */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-muted-foreground pt-1">
                  {kindOrder.map((k) => {
                    const n = r.promptKinds[k] + r.replyKinds[k];
                    if (n === 0) return null;
                    return (
                      <span key={k} className="inline-flex items-center gap-1">
                        <span className={`h-2 w-2 rounded-sm ${KIND_META[k].dot}`} />
                        {KIND_META[k].label}: {n}
                      </span>
                    );
                  })}
                  <span className="inline-flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-sm ${KIND_META.special.dot}`} />
                    special: {r.special}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractionsTable({
  msgs,
  model,
  totals,
}: {
  msgs: Msg[];
  model: ModelKey;
  totals: { inT: number; outT: number; cost: number; ms: number };
}) {
  const m = MODELS[model];
  // Pair each user message with the following assistant message into a single interaction row.
  type Row = {
    n: number;
    prompt: string;
    reply: string;
    inTok: number;
    outTok: number;
    inCost: number;
    outCost: number;
    ms: number;
    typos: number;
  };
  const rows: Row[] = [];
  let i = 0;
  let n = 1;
  while (i < msgs.length) {
    const u = msgs[i];
    const a = msgs[i + 1] && msgs[i + 1].role === "assistant" ? msgs[i + 1] : undefined;
    if (u.role !== "user") { i++; continue; }
    const inTok = u.tokens.length;
    const outTok = a ? a.tokens.length : 0;
    rows.push({
      n: n++,
      prompt: u.text,
      reply: a ? a.text : "",
      inTok,
      outTok,
      inCost: (inTok / 1000) * m.in,
      outCost: (outTok / 1000) * m.out,
      ms: a ? a.ms : 0,
      typos: u.misspellings.length,
    });
    i += a ? 2 : 1;
  }

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-secondary/40">
        <div>
          <p className="font-mono text-xs text-primary uppercase tracking-wider">Per-interaction token ledger</p>
          <p className="text-xs text-muted-foreground mt-1">One row per prompt and its reply. Every metric in the side panel is summed from this table.</p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">model: {model}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            <tr>
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Prompt</th>
              <th className="text-left px-3 py-2">Reply</th>
              <th className="text-right px-3 py-2">In tok</th>
              <th className="text-right px-3 py-2">Out tok</th>
              <th className="text-right px-3 py-2">Total tok</th>
              <th className="text-right px-3 py-2">Cost</th>
              <th className="text-right px-3 py-2">Latency</th>
              <th className="text-right px-3 py-2">Typos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                  No interactions yet. Send a message above to start filling the ledger.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.n} className="border-t border-border/40 hover:bg-secondary/30">
                <td className="px-3 py-2 font-mono text-muted-foreground align-top">{r.n}</td>
                <td className="px-3 py-2 align-top max-w-[260px]">
                  <div className="truncate" title={r.prompt}>{r.prompt}</div>
                </td>
                <td className="px-3 py-2 align-top max-w-[320px] text-muted-foreground">
                  <div className="truncate" title={r.reply}>{r.reply || <span className="italic">…</span>}</div>
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.inTok}</td>
                <td className="px-3 py-2 text-right font-mono">{r.outTok}</td>
                <td className="px-3 py-2 text-right font-mono">{r.inTok + r.outTok}</td>
                <td className="px-3 py-2 text-right font-mono">${(r.inCost + r.outCost).toFixed(6)}</td>
                <td className="px-3 py-2 text-right font-mono">{r.ms ? `${r.ms.toFixed(0)}ms` : "—"}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.typos > 0 ? "text-warning" : "text-muted-foreground"}`}>{r.typos}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-background/40 border-t border-border/60 font-mono">
              <tr>
                <td className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground" colSpan={3}>Session totals</td>
                <td className="px-3 py-2 text-right">{totals.inT.toLocaleString('en-US')}</td>
                <td className="px-3 py-2 text-right">{totals.outT.toLocaleString('en-US')}</td>
                <td className="px-3 py-2 text-right">{(totals.inT + totals.outT).toLocaleString('en-US')}</td>
                <td className="px-3 py-2 text-right">${totals.cost.toFixed(5)}</td>
                <td className="px-3 py-2 text-right">{(totals.ms / 1000).toFixed(2)}s</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{rows.reduce((s, r) => s + r.typos, 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
// -----------------------------------------------------------------------------
// Token stream scrubber: pick an interaction, step through every token as it
// would arrive over the wire (special markers, prompt tokens, more specials,
// then the streamed reply token by token). Play/pause, step, speed.
// -----------------------------------------------------------------------------

type StreamItem = {
  text: string;
  kind: Tok["kind"] | "special";
  origin: "special" | "prompt" | "reply";
  label?: string; // for special markers
};

function buildStream(prompt: Tok[], reply: Tok[]): StreamItem[] {
  const s: StreamItem[] = [];
  const sp = (label: string): StreamItem => ({ text: label, kind: "special", origin: "special", label });
  // 4 specials wrapping the user message
  s.push(sp("<|im_start|>"));
  s.push(sp("user"));
  for (const t of prompt) s.push({ text: t.text, kind: t.kind, origin: "prompt" });
  s.push(sp("<|im_end|>"));
  s.push(sp("<|sep|>"));
  // 4 specials wrapping the assistant message
  s.push(sp("<|im_start|>"));
  s.push(sp("assistant"));
  for (const t of reply) s.push({ text: t.text, kind: t.kind, origin: "reply" });
  s.push(sp("<|im_end|>"));
  s.push(sp("<|eos|>"));
  return s;
}

function TokenStreamScrubber({ msgs }: { msgs: Msg[] }) {
  // Pair interactions, same logic as the other components.
  type Pair = { n: number; prompt: string; pToks: Tok[]; rToks: Tok[] };
  const pairs: Pair[] = [];
  {
    let i = 0, n = 1;
    while (i < msgs.length) {
      const u = msgs[i];
      if (u.role !== "user") { i++; continue; }
      const a = msgs[i + 1] && msgs[i + 1].role === "assistant" ? msgs[i + 1] : undefined;
      pairs.push({ n: n++, prompt: u.text, pToks: u.tokens, rToks: a ? a.tokens : [] });
      i += a ? 2 : 1;
    }
  }

  const [sel, setSel] = useState(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Clamp selection if interactions list shrinks.
  useEffect(() => { if (sel >= pairs.length) setSel(Math.max(0, pairs.length - 1)); }, [pairs.length, sel]);

  const stream = useMemo(() => {
    const p = pairs[sel];
    if (!p) return [] as StreamItem[];
    return buildStream(p.pToks, p.rToks);
  }, [pairs, sel]);

  // Clamp / reset pos when stream changes.
  useEffect(() => { setPos((x) => Math.min(x, stream.length)); }, [stream.length]);

  // Playback timer: ~6 tokens/sec at 1x.
  useEffect(() => {
    if (!playing) return;
    if (pos >= stream.length) { setPlaying(false); return; }
    const id = setTimeout(() => setPos((x) => Math.min(stream.length, x + 1)), 170 / speed);
    return () => clearTimeout(id);
  }, [playing, pos, stream.length, speed]);

  if (pairs.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Token stream scrubber will appear once you send a message.
      </div>
    );
  }

  const shown = stream.slice(0, pos);
  const counts = {
    prompt: shown.filter((s) => s.origin === "prompt").length,
    reply: shown.filter((s) => s.origin === "reply").length,
    special: shown.filter((s) => s.origin === "special").length,
  };
  const total = stream.length;

  return (
    <div className="mt-8 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 bg-secondary/40 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-primary uppercase tracking-wider">Token stream scrubber</p>
          <p className="text-xs text-muted-foreground mt-1">
            Step through the wire order of an interaction: special markers, prompt pieces, then the streamed reply token by token.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground">interaction:</span>
          <select
            aria-label="Choose interaction to scrub"
            value={sel}
            onChange={(e) => { setSel(Number(e.target.value)); setPos(0); setPlaying(false); }}
            className="bg-background border border-border rounded px-2 py-1 text-xs font-mono max-w-[260px]"
          >
            {pairs.map((p, i) => (
              <option key={p.n} value={i}>#{p.n} · {p.prompt.slice(0, 36)}{p.prompt.length > 36 ? "…" : ""}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Transport controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setPos(0); setPlaying(false); }}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono hover:bg-secondary"
            title="Restart"
          >
            <SkipBack className="h-3 w-3" />
          </button>
          <button
            onClick={() => setPos((x) => Math.max(0, x - 1))}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono hover:bg-secondary"
            title="Step back"
          >
            <StepBack className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              if (pos >= total) { setPos(0); setPlaying(true); }
              else setPlaying((p) => !p);
            }}
            className="inline-flex items-center gap-1.5 rounded bg-primary text-primary-foreground px-3 py-1 text-xs font-medium"
          >
            {playing ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Play</>}
          </button>
          <button
            onClick={() => setPos((x) => Math.min(total, x + 1))}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono hover:bg-secondary"
            title="Step forward"
          >
            <StepForward className="h-3 w-3" />
          </button>
          <button
            onClick={() => { setPos(total); setPlaying(false); }}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-mono hover:bg-secondary"
            title="Jump to end"
          >
            <SkipForward className="h-3 w-3" />
          </button>

          <div className="ml-2 inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
            speed:
            {[0.5, 1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded border ${speed === s ? "border-primary text-primary" : "border-border hover:bg-secondary"}`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div className="ml-auto text-[11px] font-mono text-muted-foreground">
            {pos} / {total} tok
          </div>
        </div>

        {/* Scrubber slider */}
        <input
          type="range"
          min={0}
          max={total}
          value={pos}
          onChange={(e) => { setPos(Number(e.target.value)); setPlaying(false); }}
          className="w-full accent-primary"
        />

        {/* Running counts */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${KIND_META.special.dot}`} />
            special: {counts.special}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm bg-primary/70`} />
            prompt: {counts.prompt}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm bg-chart-4/80`} />
            reply: {counts.reply}
          </span>
          <span className="text-muted-foreground">accumulated: {shown.length}</span>
        </div>

        {/* Accumulated token chips */}
        <div className="rounded border border-border/50 bg-background/40 p-3 min-h-[120px] flex flex-wrap gap-1 content-start">
          {shown.length === 0 && (
            <span className="text-xs text-muted-foreground italic">Press play or drag the slider to begin.</span>
          )}
          {shown.map((s, i) => {
            const isNewest = i === shown.length - 1;
            const cls =
              s.kind === "special" ? "bg-chart-2/15 text-foreground border-chart-2/50" :
              s.kind === "misspell" ? "bg-warning/15 text-foreground border-warning/50" :
              s.kind === "subword"  ? "bg-chart-4/15 text-foreground border-chart-4/50" :
              s.kind === "punct"    ? "bg-background/40 border-border/60 text-muted-foreground" :
              s.kind === "space"    ? "bg-background/30 border-border/30 text-muted-foreground" :
              s.origin === "reply"  ? "bg-chart-4/15 text-foreground border-chart-4/50" :
                                      "bg-primary/15 text-primary border-primary/40";
            return (
              <span
                key={i}
                title={`${s.origin} · ${s.kind}`}
                className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${cls} ${isNewest ? "ring-1 ring-primary/60" : ""}`}
              >
                {s.text === " " ? "·" : s.text}
              </span>
            );
          })}
        </div>

        {/* Stage indicator */}
        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
          {[
            { label: "user wrap", origin: "prompt" as const, total: stream.filter((x) => x.origin === "prompt").length + 4, done: counts.prompt + Math.min(4, counts.special) },
            { label: "reply stream", origin: "reply" as const, total: stream.filter((x) => x.origin === "reply").length, done: counts.reply },
            { label: "all specials", origin: "special" as const, total: stream.filter((x) => x.origin === "special").length, done: counts.special },
          ].map((s) => (
            <div key={s.label} className="rounded border border-border/40 bg-background/30 p-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{s.label}</span>
                <span>{s.done}/{s.total}</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-background/60 overflow-hidden">
                <div
                  className={s.origin === "special" ? "h-full bg-chart-2/80" : s.origin === "reply" ? "h-full bg-chart-4/80" : "h-full bg-primary/70"}
                  style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
