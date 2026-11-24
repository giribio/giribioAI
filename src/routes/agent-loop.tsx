import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack, StepForward, Wrench, Bot, User, Cog, CircleAlert, CheckCircle2 } from "lucide-react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";
import { useRealTokenizer } from "@/lib/realTokenizer";

export const Route = createFileRoute("/agent-loop")({
  head: () => ({
    meta: [
      { title: "Agent Loop Tracer | GiriBioAI" },
      { name: "description", content: "Step through a tool-calling AI agent: thoughts, JSON tool calls, MCP JSON-RPC messages, errors and retries, with exact token and cost counting." },
      { property: "og:title", content: "Agent Loop Tracer | GiriBioAI" },
      { property: "og:description", content: "Watch an agent loop turn by turn, including the MCP wire format." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Agent Loop Tracer",
          description: "ReAct-style tool calling, tool schemas, MCP JSON-RPC, retries and step limits.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/agent-loop",
        }),
      },
    ],
  }),
  component: AgentLoopPage,
});

type Json = Record<string, unknown>;
type Tool = { name: string; description: string; input_schema: Json; server?: string };
type Ev =
  | { type: "assistant"; thought: string; calls?: { id: string; name: string; args: Json }[]; final?: string }
  | { type: "tool"; id: string; name: string; result: string; error?: boolean };

type Scenario = { id: string; title: string; user: string; tools: Tool[]; events: Ev[]; note: string };

const num = (d: string) => ({ type: "number", description: d });
const str = (d: string) => ({ type: "string", description: d });

const SCENARIOS: Scenario[] = [
  {
    id: "weather",
    title: "Weather + maths",
    user: "Is it warmer in Chennai or Bengaluru right now? Answer in °F.",
    note: "Two tools, four calls. The model never does arithmetic in its head; it delegates to the calculator.",
    tools: [
      { name: "get_weather", description: "Current weather for a city, in Celsius.", input_schema: { type: "object", properties: { city: str("City name") }, required: ["city"] } },
      { name: "calculator", description: "Evaluate an arithmetic expression.", input_schema: { type: "object", properties: { expression: str("e.g. 31*9/5+32") }, required: ["expression"] } },
    ],
    events: [
      { type: "assistant", thought: "I need current temperatures for both cities. I'll fetch Chennai first.", calls: [{ id: "c1", name: "get_weather", args: { city: "Chennai" } }] },
      { type: "tool", id: "c1", name: "get_weather", result: '{"city":"Chennai","temp_c":31,"condition":"humid"}' },
      { type: "assistant", thought: "Chennai is 31 °C. Now Bengaluru.", calls: [{ id: "c2", name: "get_weather", args: { city: "Bengaluru" } }] },
      { type: "tool", id: "c2", name: "get_weather", result: '{"city":"Bengaluru","temp_c":24,"condition":"cloudy"}' },
      { type: "assistant", thought: "Convert both to Fahrenheit with the calculator.", calls: [{ id: "c3", name: "calculator", args: { expression: "31*9/5+32" } }] },
      { type: "tool", id: "c3", name: "calculator", result: "87.8" },
      { type: "assistant", thought: "Now Bengaluru in °F.", calls: [{ id: "c4", name: "calculator", args: { expression: "24*9/5+32" } }] },
      { type: "tool", id: "c4", name: "calculator", result: "75.2" },
      { type: "assistant", thought: "I have everything I need.", final: "Chennai is warmer: about 87.8 °F (humid) versus 75.2 °F (cloudy) in Bengaluru." },
    ],
  },
  {
    id: "research",
    title: "Literature search via MCP",
    user: "Find a 2024 review on CRISPR base editing and tell me its main point, with the PMID.",
    note: "The tools live on an MCP server named 'pubmed'. The app discovered them with tools/list and calls them with tools/call.",
    tools: [
      { name: "search_articles", server: "pubmed", description: "Search PubMed. Returns PMIDs and titles.", input_schema: { type: "object", properties: { query: str("Search terms"), year: num("Publication year"), max_results: num("Up to 10") }, required: ["query"] } },
      { name: "get_abstract", server: "pubmed", description: "Fetch the abstract for a PMID.", input_schema: { type: "object", properties: { pmid: str("PubMed ID") }, required: ["pmid"] } },
    ],
    events: [
      { type: "assistant", thought: "Search PubMed for 2024 reviews on base editing.", calls: [{ id: "c1", name: "search_articles", args: { query: "CRISPR base editing review", year: 2024, max_results: 3 } }] },
      { type: "tool", id: "c1", name: "search_articles", result: '[{"pmid":"38000001","title":"Base editing: progress and therapeutic outlook (review)"},{"pmid":"38000002","title":"Prime vs base editors in vivo"},{"pmid":"38000003","title":"Off-target effects of cytosine base editors"}]' },
      { type: "assistant", thought: "The first result is explicitly a review. Read its abstract before answering, instead of guessing from the title.", calls: [{ id: "c2", name: "get_abstract", args: { pmid: "38000001" } }] },
      { type: "tool", id: "c2", name: "get_abstract", result: "Base editors change single DNA letters without double-strand breaks. Clinical trials began, with delivery and off-target editing as the main open challenges." },
      { type: "assistant", thought: "Summarize from the abstract only and cite the PMID.", final: "Main point: base editors rewrite single DNA letters without cutting both strands, and the first clinical trials are under way; delivery and off-target edits remain the key hurdles (PMID 38000001, example data)." },
    ],
  },
  {
    id: "retry",
    title: "Tool error and retry",
    user: "Convert 250 USD to INR.",
    note: "The first tool call fails. A robust agent reads the error, retries once, then continues. Lower 'max steps' to see the guard stop it.",
    tools: [
      { name: "get_exchange_rate", description: "Latest FX rate between two currencies.", input_schema: { type: "object", properties: { from: str("ISO code"), to: str("ISO code") }, required: ["from", "to"] } },
      { name: "calculator", description: "Evaluate an arithmetic expression.", input_schema: { type: "object", properties: { expression: str("Expression") }, required: ["expression"] } },
    ],
    events: [
      { type: "assistant", thought: "I need the current USD→INR rate.", calls: [{ id: "c1", name: "get_exchange_rate", args: { from: "USD", to: "INR" } }] },
      { type: "tool", id: "c1", name: "get_exchange_rate", result: "Error 503: rate service timed out", error: true },
      { type: "assistant", thought: "The service timed out. Transient errors are worth one retry.", calls: [{ id: "c2", name: "get_exchange_rate", args: { from: "USD", to: "INR" } }] },
      { type: "tool", id: "c2", name: "get_exchange_rate", result: '{"rate":83.1,"as_of":"example"}' },
      { type: "assistant", thought: "Multiply 250 by the rate.", calls: [{ id: "c3", name: "calculator", args: { expression: "250*83.1" } }] },
      { type: "tool", id: "c3", name: "calculator", result: "20775" },
      { type: "assistant", thought: "Done.", final: "250 USD is about 20,775 INR at a rate of 83.1 (example rate)." },
    ],
  },
];

const SYSTEM = "You are an agent. Think briefly, call tools when you need facts or maths, and give a final answer when done.";
const PRICE_IN = 2.5 / 1e6;  // USD per input token (illustrative, GPT-4o class)
const PRICE_OUT = 10 / 1e6;  // USD per output token

function assistantText(e: Extract<Ev, { type: "assistant" }>) {
  return JSON.stringify({ role: "assistant", content: e.final ?? e.thought, tool_calls: e.calls?.map((c) => ({ id: c.id, name: c.name, arguments: c.args })) });
}
function toolText(e: Extract<Ev, { type: "tool" }>) {
  return JSON.stringify({ role: "tool", tool_call_id: e.id, content: e.result });
}

const DEFAULTS = { scenario: "weather", pos: 0, maxSteps: 6, mcp: false };

function AgentLoopPage() {
  const [s, setS, reset] = useShareState("agent", DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const sc = SCENARIOS.find((x) => x.id === s.scenario) ?? SCENARIOS[0];
  const { codec } = useRealTokenizer("o200k_base");
  const count = (t: string) => (codec ? codec.encode(t).length : Math.ceil(t.length / 4));

  // apply max-steps guard: stop after N assistant turns that did not finish
  const events = useMemo(() => {
    const out: (Ev | { type: "stopped" })[] = [];
    let llmCalls = 0;
    for (const e of sc.events) {
      if (e.type === "assistant") {
        if (llmCalls >= s.maxSteps) { out.push({ type: "stopped" }); break; }
        llmCalls++;
      }
      out.push(e);
    }
    return out;
  }, [sc, s.maxSteps]);

  const pos = Math.min(s.pos, events.length);
  const shown = events.slice(0, pos);
  const done = pos >= events.length;

  useEffect(() => {
    if (!playing) return;
    if (done) { setPlaying(false); return; }
    const t = setTimeout(() => setS((st) => ({ pos: st.pos + 1 })), 1100);
    return () => clearTimeout(t);
  }, [playing, done, pos, setS]);

  const toolsText = JSON.stringify(sc.tools.map(({ server: _server, ...t }) => t));
  const baseText = SYSTEM + toolsText + sc.user;

  // token accounting per LLM call: input = everything so far, output = its own message
  const ledger = useMemo(() => {
    const rows: { call: number; input: number; output: number }[] = [];
    let history = count(baseText);
    let call = 0;
    for (const e of shown) {
      if (e.type === "assistant") {
        call++;
        const out = count(assistantText(e));
        rows.push({ call, input: history, output: out });
        history += out;
      } else if (e.type === "tool") {
        history += count(toolText(e));
      }
    }
    return rows;
  }, [shown, baseText, codec]); // eslint-disable-line react-hooks/exhaustive-deps
  const totIn = ledger.reduce((a, r) => a + r.input, 0);
  const totOut = ledger.reduce((a, r) => a + r.output, 0);
  const cost = totIn * PRICE_IN + totOut * PRICE_OUT;
  const schemaTokens = count(toolsText);

  const pick = (id: string) => { setPlaying(false); setS({ scenario: id, pos: 0 }); };

  return (
    <ModulePage
      moduleId="agent-loop"
      title="Agent Loop Tracer"
      intro="An agent is a loop around an LLM: the model either answers or asks for a tool, your code runs the tool, the result goes back into the conversation, and the loop repeats. Step through real-shaped traces to see every message, the MCP wire format and what each turn costs."
    >
      <Section title="The loop in five lines" kicker="pattern">
        <pre className="rounded-md border border-border bg-card p-4 text-xs font-mono whitespace-pre-wrap text-foreground">{`messages = [system, user]
for step in range(MAX_STEPS):
    reply = llm(messages, tools=TOOL_SCHEMAS)
    if not reply.tool_calls: return reply.text          # final answer
    for call in reply.tool_calls: messages += [reply, run_tool(call)]
raise Stop("max steps reached")`}</pre>
        <p>Every call resends the whole history, including tool schemas, so the input grows each turn. That is why long agent runs get slow and expensive, and why a <span className="font-mono text-foreground">max steps</span> guard matters.</p>
      </Section>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("agent-loop").slice(0, 2).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Agent trace">
        <ResetButton onClick={() => { setPlaying(false); reset(); }} share />
        <div className="flex flex-wrap gap-2 mb-4">
          {SCENARIOS.map((x) => (
            <button key={x.id} onClick={() => pick(x.id)} className={`px-3 py-1.5 rounded-md text-xs font-mono border ${sc.id === x.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{x.title}</button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-4">{sc.note}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button onClick={() => { setPlaying(false); setS({ pos: 0 }); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-sm hover:bg-secondary"><SkipBack className="h-4 w-4" /> Restart</button>
          <button onClick={() => setS({ pos: Math.min(events.length, pos + 1) })} disabled={done || playing} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-40"><StepForward className="h-4 w-4" /> Step</button>
          <button onClick={() => { if (done) setS({ pos: 0 }); setPlaying((p) => !p); }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Pause" : "Play"}</button>
          <label className="ml-auto text-xs font-mono inline-flex items-center gap-2">
            <span className="inline-flex items-center">max steps: <span className="text-primary ml-1">{s.maxSteps}</span><Help label="Max steps">How many LLM calls the loop allows before it gives up. Set it below what the task needs to watch the guard trigger.</Help></span>
            <input type="range" min={1} max={6} value={s.maxSteps} onChange={(e) => setS({ maxSteps: +e.target.value, pos: 0 })} className="w-24 accent-primary" />
          </label>
          <label className="text-xs font-mono inline-flex items-center gap-2">
            <input type="checkbox" checked={s.mcp} onChange={(e) => setS({ mcp: e.target.checked })} className="accent-primary" /> MCP wire view
            <Help label="MCP view">Shows the JSON-RPC 2.0 messages a Model Context Protocol client sends to the tool server (tools/call) and what comes back.</Help>
          </label>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          <ol className="space-y-2" aria-live="polite">
            <li className="rounded-md border border-border bg-secondary/30 p-3 text-sm flex gap-3"><Cog className="h-4 w-4 mt-0.5 text-g-green shrink-0" /><div><div className="font-mono text-[10px] uppercase text-muted-foreground">system · {schemaTokens} tokens of tool schemas attached</div>{SYSTEM}</div></li>
            <li className="rounded-md border border-border bg-background p-3 text-sm flex gap-3"><User className="h-4 w-4 mt-0.5 text-primary shrink-0" /><div><div className="font-mono text-[10px] uppercase text-muted-foreground">user</div>{sc.user}</div></li>
            {shown.map((e, i) => {
              if (e.type === "stopped") {
                return <li key={i} className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm flex gap-3"><CircleAlert className="h-4 w-4 mt-0.5 text-warning shrink-0" /><div><div className="font-mono text-[10px] uppercase text-warning">loop stopped</div>Max steps ({s.maxSteps}) reached before a final answer. The app should tell the user and offer to continue.</div></li>;
              }
              if (e.type === "assistant") {
                const llmN = shown.slice(0, i + 1).filter((x) => x.type === "assistant").length;
                return (
                  <li key={i} className={`rounded-md border p-3 text-sm flex gap-3 ${e.final ? "border-success/40 bg-success/5" : "border-border bg-background"}`}>
                    {e.final ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-success shrink-0" /> : <Bot className="h-4 w-4 mt-0.5 text-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">assistant · LLM call {llmN}</div>
                      <div className="italic text-muted-foreground">Thought: {e.thought}</div>
                      {e.calls?.map((c) => (
                        <pre key={c.id} className="mt-2 rounded bg-secondary/60 p-2 text-[11px] font-mono whitespace-pre-wrap break-all">{JSON.stringify({ type: "tool_use", id: c.id, name: c.name, input: c.args }, null, 1)}</pre>
                      ))}
                      {e.final && <div className="mt-1 font-medium text-foreground">{e.final}</div>}
                    </div>
                  </li>
                );
              }
              const call = sc.events.find((x) => x.type === "assistant" && x.calls?.some((c) => c.id === e.id)) as Extract<Ev, { type: "assistant" }> | undefined;
              const args = call?.calls?.find((c) => c.id === e.id)?.args ?? {};
              const tool = sc.tools.find((t) => t.name === e.name);
              return (
                <li key={i} className={`rounded-md border p-3 text-sm flex gap-3 ml-6 ${e.error ? "border-warning/50 bg-warning/10" : "border-border bg-secondary/30"}`}>
                  <Wrench className={`h-4 w-4 mt-0.5 shrink-0 ${e.error ? "text-warning" : "text-g-cyan"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">tool result · {e.name}{tool?.server ? ` (MCP server "${tool.server}")` : ""}</div>
                    <div className="font-mono text-xs break-all">{e.result}</div>
                    {s.mcp && (
                      <div className="mt-2 grid gap-1.5">
                        <pre className="rounded bg-background border border-border p-2 text-[10.5px] font-mono whitespace-pre-wrap break-all"><span className="text-primary">→ request</span>{"\n"}{JSON.stringify({ jsonrpc: "2.0", id: i, method: "tools/call", params: { name: e.name, arguments: args } })}</pre>
                        <pre className="rounded bg-background border border-border p-2 text-[10.5px] font-mono whitespace-pre-wrap break-all"><span className="text-success">← response</span>{"\n"}{JSON.stringify({ jsonrpc: "2.0", id: i, result: { content: [{ type: "text", text: e.result }], isError: !!e.error } })}</pre>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            {!done && <li className="text-xs font-mono text-muted-foreground pl-1">… press Step or Play</li>}
          </ol>

          <aside className="space-y-3 lg:sticky lg:top-20 self-start">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs font-mono text-muted-foreground mb-2 inline-flex items-center">token meter {codec ? "(exact, GPT-4o tokenizer)" : "(estimating…)"}
                <Help label="Token meter">Counted with the real o200k tokenizer on the JSON messages. Prices are illustrative GPT-4o-class rates: $2.50 per million input tokens and $10 per million output tokens.</Help>
              </div>
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-muted-foreground"><th className="text-left">call</th><th className="text-right">in</th><th className="text-right">out</th></tr></thead>
                <tbody>
                  {ledger.map((r) => <tr key={r.call} className="border-t border-border"><td>#{r.call}</td><td className="text-right">{r.input}</td><td className="text-right">{r.output}</td></tr>)}
                  {ledger.length === 0 && <tr><td colSpan={3} className="text-muted-foreground py-1">no LLM calls yet</td></tr>}
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs font-mono"><span>total</span><span className="text-primary">{totIn + totOut} tokens</span></div>
              <div className="flex justify-between text-xs font-mono"><span>cost</span><span className="text-success">${cost.toFixed(5)}</span></div>
              <p className="mt-2 text-[11px] text-muted-foreground">Input grows every call because the full history is resent. Prompt caching can discount the repeated prefix.</p>
            </div>
            <details className="rounded-md border border-border bg-background p-3 text-xs">
              <summary className="cursor-pointer font-mono">tool schemas sent to the model</summary>
              <pre className="mt-2 font-mono text-[10.5px] whitespace-pre-wrap break-all">{JSON.stringify(sc.tools.map(({ server: _server, ...t }) => t), null, 1)}</pre>
            </details>
          </aside>
        </div>
      </Lab>

      <Section title="Design rules for reliable agents" kicker="practice">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Give tools precise names, descriptions and JSON schemas; the model chooses tools from these words alone.</li>
          <li>Return errors to the model as tool results, not crashes, so it can retry or change plan.</li>
          <li>Cap steps, time and spend. Log every call so you can replay and evaluate runs.</li>
          <li>Treat tool output as untrusted data (see prompt injection in the Evals module) and give agents the least permissions they need.</li>
        </ul>
      </Section>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("agent-loop").slice(2).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
