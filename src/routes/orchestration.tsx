import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help } from "@/components/learn/ModulePage";
import { Calculator, Search, Globe, Database, Bot, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/orchestration")({
  head: () => ({
    meta: [
      { title: "Orchestration | GiriBioAI" },
      { name: "description", content: "How agents, tools, and routers combine into useful AI systems. Compose a flow and run it." },
      { property: "og:title", content: "Orchestration | GiriBioAI" },
      { property: "og:description", content: "Compose tool-using agents step by step." },
    ],
  }),
  component: OrchestrationPage,
});

type Tool = "router" | "search" | "calc" | "rag" | "web" | "llm";
const TOOL_META: Record<Tool, { label: string; icon: typeof Calculator; color: string; desc: string }> = {
  router: { label: "Router", icon: Bot, color: "text-primary", desc: "Picks which tool to call based on the user query." },
  search: { label: "Search", icon: Search, color: "text-chart-2", desc: "Keyword search over a corpus." },
  calc: { label: "Calculator", icon: Calculator, color: "text-chart-3", desc: "Evaluates math expressions." },
  rag: { label: "RAG", icon: Database, color: "text-chart-4", desc: "Retrieves passages from a knowledge base." },
  web: { label: "Web fetch", icon: Globe, color: "text-chart-5", desc: "Fetches a URL and summarizes." },
  llm: { label: "LLM", icon: Bot, color: "text-primary", desc: "Generates the final answer." },
};

const PRESETS: { name: string; flow: Tool[]; query: string; result: string }[] = [
  { name: "Simple chat", flow: ["llm"], query: "Hello!", result: "Hi! How can I help today?" },
  { name: "Math agent", flow: ["router", "calc", "llm"], query: "what is 17 * 24?", result: "17 × 24 = 408." },
  { name: "RAG bot", flow: ["router", "rag", "llm"], query: "what is photosynthesis?", result: "Photosynthesis turns sunlight, water and CO₂ into glucose and O₂ inside chloroplasts." },
  { name: "Research agent", flow: ["router", "web", "rag", "llm"], query: "summarize today's tech news", result: "Fetched 3 articles, retrieved 5 relevant passages, here's a summary…" },
];

function OrchestrationPage() {
  const [flow, setFlow] = useState<Tool[]>(PRESETS[1].flow);
  const [query, setQuery] = useState(PRESETS[1].query);
  const [running, setRunning] = useState<number | null>(null);
  const [output, setOutput] = useState<string>("");
  const [trace, setTrace] = useState<string[]>([]);

  const reset = () => { setFlow(PRESETS[1].flow); setQuery(PRESETS[1].query); setOutput(""); setTrace([]); setRunning(null); };

  function run() {
    setOutput("");
    setTrace([]);
    setRunning(0);
    flow.forEach((tool, i) => {
      setTimeout(() => {
        setRunning(i);
        setTrace((t) => [...t, traceLine(tool, query, i)]);
        if (i === flow.length - 1) {
          setTimeout(() => {
            setRunning(null);
            setOutput(synth(query, flow));
          }, 500);
        }
      }, (i + 1) * 600);
    });
  }

  return (
    <ModulePage
      moduleId="orchestration"
      title="Orchestration"
      intro="A bare LLM is a text-in, text-out function. To build real applications you wrap it in a flow: routers decide what to do, tools take action, retrievers fetch knowledge, and memory persists across turns. This is what frameworks like LangChain and LlamaIndex are for."
    >
      <Section title="Components of an agent" kicker="patterns">
        <p><span className="font-mono text-foreground">Router</span> classifies intent → pick a tool. <span className="font-mono text-foreground">Tools</span> are typed functions the model can call. <span className="font-mono text-foreground">Memory</span> stores past turns or facts. A <span className="font-mono text-foreground">loop</span> lets the LLM call tools repeatedly until done.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        <KeyTerm term="tool / function call" def="Structured output the LLM emits to trigger an external action." />
        <KeyTerm term="ReAct loop" def="Reason → Act → Observe → repeat until the agent answers." />
        <KeyTerm term="guardrails" def="Checks on inputs and outputs: hide personal data (PII), enforce the expected format, block unsafe content." />
      </div>

      <Lab title="Compose & run an agent">
        <div className="flex justify-end mb-2">
          <button onClick={reset} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs font-mono text-muted-foreground self-center inline-flex items-center">
            Preset
            <Help label="Preset">
              Pre-built example flows. Pick one to see common agent shapes such as a bare LLM, a tool-using math agent, a RAG bot, or a multi-step research agent.<br />
              <span className="text-muted-foreground">Example: "RAG bot" loads router → rag → llm for a knowledge question.</span>
            </Help>
            :
          </span>
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => { setFlow(p.flow); setQuery(p.query); setOutput(""); setTrace([]); }} className="px-3 py-1.5 rounded-md text-xs font-mono border border-border hover:bg-secondary">
              {p.name}
            </button>
          ))}
        </div>

        <label htmlFor="orch-query" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          User query
          <Help label="User query">
            The request that enters the flow. The router (if present) uses it to decide which tool to call next.<br />
            <span className="text-muted-foreground">Example: "what is 17 * 24?" triggers the router to call the calculator tool.</span>
          </Help>
        </label>
        <input id="orch-query" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-5" />

        <div className="text-xs font-mono text-muted-foreground mb-2 inline-flex items-center">
          Flow (click a node to remove, or add below)
          <Help label="Flow">
            Ordered pipeline of components. Data passes left-to-right: input → tools → answer. Click any node to delete it; add more from the menu below.<br />
            <span className="text-muted-foreground">Example: input → router → calc → llm solves math problems in three steps.</span>
          </Help>
        </div>
        <div className="rounded-md border border-border bg-background p-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Node label="input" />
            {flow.map((tool, i) => {
              const { label, icon: Icon, color } = TOOL_META[tool];
              return (
                <div key={i} className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    onClick={() => setFlow(flow.filter((_, j) => j !== i))}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-md border transition ${running === i ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border bg-secondary/40 hover:border-warning/60"}`}
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-mono">{label}</span>
                  </button>
                </div>
              );
            })}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Node label="answer" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <span className="text-xs font-mono text-muted-foreground self-center inline-flex items-center">
            + add
            <Help label="Add a node">
              Each node is a typed function the agent can call. Hover any button below to see what it does.<br />
              <span className="text-muted-foreground">Example: adding "web" after "router" lets the agent fetch live pages before answering.</span>
            </Help>
            :
          </span>
          {(Object.keys(TOOL_META) as Tool[]).map((t) => {
            const { label, icon: Icon, color, desc } = TOOL_META[t];
            return (
              <button
                key={t}
                onClick={() => setFlow([...flow, t])}
                title={`${label}: ${desc}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-border hover:bg-secondary"
              >
                <Icon className={`h-3 w-3 ${color}`} /> {label}
              </button>
            );
          })}
        </div>

        <button onClick={run} disabled={running !== null || flow.length === 0} className="px-5 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
          ▶ Run agent
        </button>

        <div className="mt-5 grid md:grid-cols-2 gap-4">
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-xs font-mono text-muted-foreground mb-2">Trace</div>
            <div className="space-y-1 text-xs font-mono min-h-24">
              {trace.length === 0 && <span className="text-muted-foreground">(run the flow)</span>}
              {trace.map((t, i) => <div key={i} className="text-foreground/80">{t}</div>)}
            </div>
          </div>
          <div className="rounded-md border border-border bg-background p-4">
            <div className="text-xs font-mono text-muted-foreground mb-2">Final answer</div>
            <div className="text-sm min-h-24">{output || <span className="text-muted-foreground font-mono text-xs">(waiting)</span>}</div>
          </div>
        </div>
      </Lab>
    </ModulePage>
  );
}

function Node({ label }: { label: string }) {
  return <span className="px-3 py-2 rounded-md border border-dashed border-border text-xs font-mono text-muted-foreground">{label}</span>;
}

function traceLine(tool: Tool, q: string, i: number) {
  const t = TOOL_META[tool].label;
  if (tool === "router") return `[${i}] router → classified intent of "${q.slice(0, 28)}…"`;
  if (tool === "calc") return `[${i}] calc   → evaluated expression`;
  if (tool === "rag") return `[${i}] rag    → retrieved top-3 chunks`;
  if (tool === "search") return `[${i}] search → returned 5 hits`;
  if (tool === "web") return `[${i}] web    → fetched & cleaned 1 page`;
  return `[${i}] llm    → generated 1 response`;
}
function synth(q: string, flow: Tool[]) {
  if (flow.includes("calc")) {
    const m = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*x×/])\s*(-?\d+(?:\.\d+)?)/);
    if (m) {
      const a = +m[1], op = m[2], b = +m[3];
      const r = op === "+" ? a + b : op === "-" ? a - b : op === "/" ? a / b : a * b;
      return `${a} ${op} ${b} = ${r}`;
    }
  }
  if (flow.includes("rag")) return `Based on retrieved context, here is a grounded answer to: "${q}"`;
  if (flow.includes("web")) return `Fetched and summarized live web results for: "${q}"`;
  return `Answer to: "${q}"`;
}