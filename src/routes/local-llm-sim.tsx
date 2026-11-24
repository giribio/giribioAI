import { createFileRoute } from "@tanstack/react-router";
import { CompleteToggle } from "@/components/learn/ModulePage";
import { useMemo, useState } from "react";
import { Cpu, MonitorSmartphone, Box, Terminal, KeyRound, Plug, Check, Copy, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { GPUS, FIT_TONE_CLASS, fitVerdict, type GPU } from "@/lib/hardware";

export const Route = createFileRoute("/local-llm-sim")({
  head: () => ({
    meta: [
      { title: "Local LLM Setup Simulator | Pick GPU, OS, model, runtime, MCP" },
      { name: "description", content: "Step through choosing a GPU, OS, model and runtime to run an LLM locally, then wire up an OpenAI compatible API and an MCP server." },
      { property: "og:title", content: "Local LLM Setup Simulator" },
      { property: "og:description", content: "Interactive walkthrough for running an LLM on your own machine, with API and MCP wiring." },
    ],
  }),
  component: LocalLLMSim,
});

type OS = { id: "windows" | "linux" | "macos"; name: string; pkg: string; note: string };
const OSES: OS[] = [
  { id: "windows", name: "Windows 11",            pkg: "winget", note: "CUDA via NVIDIA driver. WSL2 recommended for vLLM." },
  { id: "linux",   name: "Linux (Ubuntu 22.04)",  pkg: "apt",    note: "Best support for CUDA, vLLM and production serving." },
  { id: "macos",   name: "macOS (Apple Silicon)", pkg: "brew",   note: "No CUDA. Use llama.cpp or MLX with unified memory." },
];

type Model = { id: string; name: string; family: string; params: number; size: "small" | "large"; quants: { q: string; gb: number }[] };

const MODELS: Model[] = [
  { id: "llama32-3b",   name: "Llama 3.2 3B Instruct",  family: "Meta",    params: 3,   size: "small", quants: [{q:"Q4_K_M",gb:2.0},{q:"Q8_0",gb:3.4},{q:"FP16",gb:6.4}] },
  { id: "phi3-mini",    name: "Phi-3 Mini 3.8B",        family: "MS",      params: 3.8, size: "small", quants: [{q:"Q4_K_M",gb:2.3},{q:"Q8_0",gb:4.0},{q:"FP16",gb:7.6}] },
  { id: "qwen25-7b",    name: "Qwen 2.5 7B Instruct",   family: "Alibaba", params: 7,   size: "small", quants: [{q:"Q4_K_M",gb:4.5},{q:"Q8_0",gb:7.6},{q:"FP16",gb:14}] },
  { id: "mistral-7b",   name: "Mistral 7B v0.3",        family: "Mistral", params: 7,   size: "small", quants: [{q:"Q4_K_M",gb:4.4},{q:"Q8_0",gb:7.5},{q:"FP16",gb:14}] },
  { id: "llama31-70b",  name: "Llama 3.1 70B Instruct", family: "Meta",    params: 70,  size: "large", quants: [{q:"Q4_K_M",gb:42},{q:"Q8_0",gb:74},{q:"FP16",gb:140}] },
  { id: "qwen25-72b",   name: "Qwen 2.5 72B Instruct",  family: "Alibaba", params: 72,  size: "large", quants: [{q:"Q4_K_M",gb:44},{q:"Q8_0",gb:76},{q:"FP16",gb:144}] },
  { id: "mixtral-8x22", name: "Mixtral 8x22B",          family: "Mistral", params: 176, size: "large", quants: [{q:"Q4_K_M",gb:80},{q:"Q8_0",gb:140},{q:"FP16",gb:280}] },
  { id: "llama31-405b", name: "Llama 3.1 405B",         family: "Meta",    params: 405, size: "large", quants: [{q:"Q4_K_M",gb:230},{q:"Q8_0",gb:410},{q:"FP16",gb:810}] },
];

type Runtime = { id: "ollama" | "llamacpp" | "vllm" | "lmstudio"; name: string; oses: OS["id"][]; endpoint: string; port: number; blurb: string };

const RUNTIMES: Runtime[] = [
  { id: "ollama",   name: "Ollama",    oses: ["windows","linux","macos"], endpoint: "http://localhost:11434/v1", port: 11434, blurb: "Easiest. One command pulls and serves with an OpenAI compatible API." },
  { id: "llamacpp", name: "llama.cpp", oses: ["windows","linux","macos"], endpoint: "http://localhost:8080/v1",  port: 8080,  blurb: "C++ inference. Best for CPU and Apple Silicon, supports GGUF." },
  { id: "vllm",     name: "vLLM",      oses: ["linux"],                   endpoint: "http://localhost:8000/v1",  port: 8000,  blurb: "Throughput king. Production serving with paged attention, Linux + CUDA only." },
  { id: "lmstudio", name: "LM Studio", oses: ["windows","macos","linux"], endpoint: "http://localhost:1234/v1",  port: 1234,  blurb: "Desktop app with GUI. Built in chat plus a local OpenAI compatible server." },
];

const STEPS = [
  { id: 1, label: "GPU",      icon: Cpu },
  { id: 2, label: "OS",       icon: MonitorSmartphone },
  { id: 3, label: "Model",    icon: Box },
  { id: 4, label: "Runtime",  icon: Terminal },
  { id: 5, label: "Install",  icon: Terminal },
  { id: 6, label: "API Keys", icon: KeyRound },
  { id: 7, label: "MCP",      icon: Plug },
] as const;

function LocalLLMSim() {
  const [step, setStep] = useState(1);
  const [gpuId, setGpuId] = useState<string | null>(null);
  const [osId, setOsId] = useState<OS["id"] | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [quant, setQuant] = useState<string>("Q4_K_M");
  const [runtimeId, setRuntimeId] = useState<Runtime["id"] | null>(null);

  const gpu = useMemo(() => GPUS.find(g => g.id === gpuId) ?? null, [gpuId]);
  const os = useMemo(() => OSES.find(o => o.id === osId) ?? null, [osId]);
  const model = useMemo(() => MODELS.find(m => m.id === modelId) ?? null, [modelId]);
  const quantRow = useMemo(() => model?.quants.find(q => q.q === quant) ?? model?.quants[0] ?? null, [model, quant]);
  const runtime = useMemo(() => RUNTIMES.find(r => r.id === runtimeId) ?? null, [runtimeId]);

  const fit = fitVerdict(gpu, quantRow?.gb ?? 0);

  const canNext = (() => {
    if (step === 1) return !!gpu;
    if (step === 2) return !!os;
    if (step === 3) return !!model;
    if (step === 4) return !!runtime;
    return true;
  })();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <p className="text-xs font-mono text-primary uppercase tracking-widest">Simulator</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">Set up a local LLM, step by step</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Pick your hardware and operating system, choose a model that fits, generate the install commands,
          then wire an OpenAI compatible API and an MCP server. Every step updates a live summary on the right.
        </p>
      </header>

      <Stepper step={step} setStep={setStep} />

      <div className="mt-6 grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="rounded-xl border border-border bg-card p-6 min-h-[420px]">
          {step === 1 && <StepGPU gpuId={gpuId} setGpuId={setGpuId} />}
          {step === 2 && <StepOS osId={osId} setOsId={setOsId} />}
          {step === 3 && <StepModel modelId={modelId} setModelId={setModelId} quant={quant} setQuant={setQuant} gpu={gpu} />}
          {step === 4 && <StepRuntime os={os} runtimeId={runtimeId} setRuntimeId={setRuntimeId} />}
          {step === 5 && <StepInstall os={os} runtime={runtime} model={model} quant={quant} />}
          {step === 6 && <StepAPI runtime={runtime} model={model} />}
          {step === 7 && <StepMCP runtime={runtime} />}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-secondary disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-xs font-mono text-muted-foreground">Step {step} of {STEPS.length}</span>
            <button
              onClick={() => setStep(s => Math.min(STEPS.length, s + 1))}
              disabled={!canNext || step === STEPS.length}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <SummaryPanel gpu={gpu} os={os} model={model} quant={quant} quantRow={quantRow} runtime={runtime} fit={fit} />
        </aside>
      </div>
      <CompleteToggle moduleId="local-llm-sim" className="mt-10" />
    </div>
  );
}

function Stepper({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map(s => {
        const Icon = s.icon;
        const active = s.id === step;
        const done = s.id < step;
        return (
          <li key={s.id}>
            <button
              onClick={() => setStep(s.id)}
              className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="font-mono">{s.id}.</span> {s.label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function StepGPU({ gpuId, setGpuId }: { gpuId: string | null; setGpuId: (s: string) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Choose a GPU</h2>
      <p className="text-sm text-muted-foreground mt-1">VRAM is the main limit on model size. FP16 TFLOPs drive throughput.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {GPUS.map(g => {
          const selected = gpuId === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGpuId(g.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{g.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.price}</div>
                </div>
                {selected && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <Stat label="VRAM" value={`${g.vramGB} GB`} />
                <Stat label="FP16" value={`${g.fp16Tflops} TFLOPs`} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">{g.blurb}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepOS({ osId, setOsId }: { osId: OS["id"] | null; setOsId: (s: OS["id"]) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Choose an operating system</h2>
      <p className="text-sm text-muted-foreground mt-1">Drives which package manager and which runtimes are available.</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        {OSES.map(o => {
          const selected = osId === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setOsId(o.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{o.name}</div>
                {selected && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div className="mt-2 text-xs font-mono text-muted-foreground">pkg: {o.pkg}</div>
              <p className="text-xs text-muted-foreground mt-3">{o.note}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepModel({ modelId, setModelId, quant, setQuant, gpu }: {
  modelId: string | null;
  setModelId: (s: string) => void;
  quant: string;
  setQuant: (s: string) => void;
  gpu: GPU | null;
}) {
  const groups: ("small" | "large")[] = ["small", "large"];
  return (
    <div>
      <h2 className="text-lg font-semibold">Choose a model</h2>
      <p className="text-sm text-muted-foreground mt-1">Quantization shrinks the file. Q4 is the usual default for local inference.</p>
      {groups.map(g => (
        <div key={g} className="mt-5">
          <h3 className="text-xs uppercase font-mono text-muted-foreground tracking-widest mb-2">{g === "small" ? "Small models" : "Large models"}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {MODELS.filter(m => m.size === g).map(m => {
              const selected = modelId === m.id;
              const q = m.quants.find(x => x.q === quant) ?? m.quants[0];
              const verdict = fitVerdict(gpu, q.gb);
              return (
                <button
                  key={m.id}
                  onClick={() => setModelId(m.id)}
                  className={`text-left rounded-lg border p-4 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.family} · {m.params}B params</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="mt-3 text-xs font-mono text-muted-foreground">{q.q}: {q.gb} GB</div>
                  <FitBadge verdict={verdict} className="mt-2" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-6">
        <h3 className="text-xs uppercase font-mono text-muted-foreground tracking-widest mb-2">Quantization</h3>
        <div className="flex flex-wrap gap-2">
          {["Q4_K_M", "Q8_0", "FP16"].map(q => (
            <button
              key={q}
              onClick={() => setQuant(q)}
              className={`text-xs font-mono px-3 py-1.5 rounded-md border ${quant === q ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepRuntime({ os, runtimeId, setRuntimeId }: {
  os: OS | null;
  runtimeId: Runtime["id"] | null;
  setRuntimeId: (s: Runtime["id"]) => void;
}) {
  const available = RUNTIMES.filter(r => !os || r.oses.includes(os.id));
  const blocked = RUNTIMES.filter(r => os && !r.oses.includes(os.id));
  return (
    <div>
      <h2 className="text-lg font-semibold">Choose a runtime</h2>
      <p className="text-sm text-muted-foreground mt-1">All of these expose an OpenAI compatible HTTP API once running.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {available.map(r => {
          const selected = runtimeId === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRuntimeId(r.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm">{r.name}</div>
                {selected && <Check className="w-4 h-4 text-primary" />}
              </div>
              <div className="mt-1 text-xs font-mono text-muted-foreground">{r.endpoint}</div>
              <p className="text-xs text-muted-foreground mt-3">{r.blurb}</p>
            </button>
          );
        })}
      </div>
      {blocked.length > 0 && (
        <p className="text-xs text-muted-foreground mt-4">
          Hidden on {os?.name}: {blocked.map(b => b.name).join(", ")}.
        </p>
      )}
    </div>
  );
}

function StepInstall({ os, runtime, model, quant }: { os: OS | null; runtime: Runtime | null; model: Model | null; quant: string }) {
  if (!os || !runtime || !model) return <Hint>Pick GPU, OS, model and runtime to generate install commands.</Hint>;
  const modelTag = `${model.id}:${quant.toLowerCase()}`;
  const cmds = buildInstall(os, runtime, modelTag);
  return (
    <div>
      <h2 className="text-lg font-semibold">Install and run</h2>
      <p className="text-sm text-muted-foreground mt-1">Copy these into a terminal. They are generated for {os.name} + {runtime.name}.</p>
      <div className="mt-5 space-y-4">
        {cmds.map((c, i) => <CodeBlock key={i} title={c.title} code={c.code} />)}
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Server will listen on <span className="font-mono text-foreground">{runtime.endpoint}</span> once started.
      </p>
    </div>
  );
}

function StepAPI({ runtime, model }: { runtime: Runtime | null; model: Model | null }) {
  if (!runtime || !model) return <Hint>Pick a runtime and model first.</Hint>;
  const base = runtime.endpoint;
  const modelName = model.id;

  const envBlock = [
    "# .env",
    "# Local runtime ignores the key but OpenAI clients require one",
    "OPENAI_API_KEY=sk-local-anything",
    `OPENAI_BASE_URL=${base}`,
    "",
    "# Optional fallback to a real provider",
    "# OPENAI_API_KEY=sk-...   # your real OpenAI key",
    "# ANTHROPIC_API_KEY=sk-ant-...",
  ].join("\n");

  const curl = [
    `curl ${base}/chat/completions \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "Authorization: Bearer $OPENAI_API_KEY" \\`,
    `  -d '{`,
    `    "model": "${modelName}",`,
    `    "messages": [{"role":"user","content":"Hello from my laptop"}]`,
    `  }'`,
  ].join("\n");

  const py = [
    "from openai import OpenAI",
    "import os",
    "",
    "client = OpenAI(",
    '    base_url=os.environ["OPENAI_BASE_URL"],',
    '    api_key=os.environ["OPENAI_API_KEY"],',
    ")",
    "",
    "resp = client.chat.completions.create(",
    `    model="${modelName}",`,
    '    messages=[{"role": "user", "content": "Hello from my laptop"}],',
    ")",
    "print(resp.choices[0].message.content)",
  ].join("\n");

  const js = [
    'import OpenAI from "openai";',
    "",
    "const client = new OpenAI({",
    "  baseURL: process.env.OPENAI_BASE_URL,",
    "  apiKey: process.env.OPENAI_API_KEY,",
    "});",
    "",
    "const resp = await client.chat.completions.create({",
    `  model: "${modelName}",`,
    '  messages: [{ role: "user", content: "Hello from my laptop" }],',
    "});",
    "console.log(resp.choices[0].message.content);",
  ].join("\n");

  return (
    <div>
      <h2 className="text-lg font-semibold">API keys and local endpoint</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Local runtimes speak the OpenAI Chat Completions protocol, so the OpenAI SDKs work with no code changes once you point them at the local URL.
      </p>
      <div className="mt-5 space-y-4">
        <CodeBlock title=".env" code={envBlock} />
        <CodeBlock title="curl" code={curl} />
        <CodeBlock title="Python" code={py} />
        <CodeBlock title="Node / TypeScript" code={js} />
      </div>
    </div>
  );
}

function StepMCP({ runtime }: { runtime: Runtime | null }) {
  const base = runtime?.endpoint ?? "http://localhost:11434/v1";

  const mcpConfig = [
    "{",
    '  "mcpServers": {',
    '    "weather": {',
    '      "command": "node",',
    '      "args": ["./mcp-servers/weather/index.js"],',
    '      "env": {',
    '        "OPENWEATHER_API_KEY": "your-key-here"',
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");

  const serverCode = [
    "// mcp-servers/weather/index.js",
    'import { Server } from "@modelcontextprotocol/sdk/server/index.js";',
    'import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";',
    "",
    "const server = new Server(",
    '  { name: "weather", version: "0.1.0" },',
    "  { capabilities: { tools: {} } }",
    ");",
    "",
    'server.setRequestHandler("tools/list", async () => ({',
    "  tools: [{",
    '    name: "get_weather",',
    '    description: "Get current weather for a city",',
    "    inputSchema: {",
    '      type: "object",',
    '      properties: { city: { type: "string" } },',
    '      required: ["city"],',
    "    },",
    "  }],",
    "}));",
    "",
    'server.setRequestHandler("tools/call", async (req) => {',
    "  const { name, arguments: args } = req.params;",
    '  if (name !== "get_weather") throw new Error("Unknown tool");',
    "  const url = `https://api.openweathermap.org/data/2.5/weather?q=${args.city}&appid=${process.env.OPENWEATHER_API_KEY}`;",
    "  const r = await fetch(url);",
    "  const data = await r.json();",
    '  return { content: [{ type: "text", text: JSON.stringify(data) }] };',
    "});",
    "",
    "await server.connect(new StdioServerTransport());",
  ].join("\n");

  const runCmds = [
    "# install the SDK",
    "npm install @modelcontextprotocol/sdk",
    "",
    "# start the server (for stdio transport, the host launches it for you)",
    "node ./mcp-servers/weather/index.js",
    "",
    "# point your MCP host at the config file above",
    "# - Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json",
    "# - Continue / Cline / Cursor: see each tool's MCP section",
    `# - For a local LLM, run an MCP aware client and point it at ${base}`,
  ].join("\n");

  const diagram = [
    "  +-------------+    JSON-RPC      +--------------+    HTTP/SDK    +--------------+",
    "  | LLM Client  | ---------------> |  MCP Server  | -------------> | Tool / Data  |",
    "  | (host app)  | <--------------- | (your code)  | <------------- |   source     |",
    "  +-------------+   tool results   +--------------+    response    +--------------+",
  ].join("\n");

  return (
    <div>
      <h2 className="text-lg font-semibold">Add an MCP server</h2>
      <p className="text-sm text-muted-foreground mt-1">
        MCP (Model Context Protocol) lets your LLM call tools and read data from local processes through a standard
        JSON RPC interface. A <strong>host</strong> (your chat app) launches an <strong>MCP server</strong> and
        forwards tool calls from the model to it.
      </p>

      <pre className="mt-5 rounded-lg border border-border bg-background/40 p-4 font-mono text-xs overflow-x-auto">{diagram}</pre>

      <div className="mt-5 space-y-4">
        <CodeBlock title="mcp.json (host config)"    code={mcpConfig} />
        <CodeBlock title="Minimal MCP server (Node)" code={serverCode} />
        <CodeBlock title="Run it"                    code={runCmds} />
      </div>

      <div className="mt-6 rounded-md border border-border bg-background/40 p-4 text-sm">
        <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="w-4 h-4 text-primary" /> You are done</div>
        <p className="text-muted-foreground mt-1">
          Your local LLM is now reachable at <span className="font-mono text-foreground">{base}</span>, your code
          talks to it through the OpenAI SDK, and your MCP server exposes <span className="font-mono text-foreground">get_weather</span> as
          a callable tool.
        </p>
      </div>
    </div>
  );
}

function SummaryPanel({ gpu, os, model, quant, quantRow, runtime, fit }: {
  gpu: GPU | null;
  os: OS | null;
  model: Model | null;
  quant: string;
  quantRow: { q: string; gb: number } | null;
  runtime: Runtime | null;
  fit: ReturnType<typeof fitVerdict>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sticky top-20">
      <h3 className="font-semibold text-sm">Your stack</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="GPU"      v={gpu ? `${gpu.name} (${gpu.vramGB}GB)` : "not set"} />
        <Row k="OS"       v={os?.name ?? "not set"} />
        <Row k="Model"    v={model ? model.name : "not set"} />
        <Row k="Quant"    v={quantRow ? `${quant} · ${quantRow.gb}GB` : "not set"} />
        <Row k="Runtime"  v={runtime?.name ?? "not set"} />
        <Row k="Endpoint" v={runtime?.endpoint ?? "not set"} mono />
      </dl>
      <div className="mt-5">
        <h4 className="text-xs uppercase font-mono text-muted-foreground tracking-widest mb-2">Compatibility</h4>
        <FitBadge verdict={fit} />
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase font-mono text-muted-foreground tracking-widest">{k}</dt>
      <dd className={`text-right ${mono ? "font-mono text-xs" : "text-sm"} text-foreground`}>{v}</dd>
    </div>
  );
}

function FitBadge({ verdict, className = "" }: { verdict: { label: string; tone: "good" | "tight" | "offload" | "bad" }; className?: string }) {
  const tones = FIT_TONE_CLASS;
  const Icon = verdict.tone === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-md border ${tones[verdict.tone]} ${className}`}>
      <Icon className="w-3.5 h-3.5" /> {verdict.label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/40 border border-border px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background/40 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/60">
        <span className="text-xs font-mono text-muted-foreground">{title}</span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch {}
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-xs font-mono p-3 overflow-x-auto leading-relaxed text-foreground/90">{code}</pre>
    </div>
  );
}

function buildInstall(os: OS, runtime: Runtime, modelTag: string): { title: string; code: string }[] {
  if (runtime.id === "ollama") {
    const install =
      os.id === "macos" ? "brew install ollama" :
      os.id === "linux" ? "curl -fsSL https://ollama.com/install.sh | sh" :
                          "winget install Ollama.Ollama";
    return [
      { title: "1. Install Ollama",   code: install },
      { title: "2. Start the server", code: "ollama serve" },
      { title: "3. Pull the model",   code: `ollama pull ${modelTag}` },
      { title: "4. Chat from CLI",    code: `ollama run ${modelTag}` },
    ];
  }
  if (runtime.id === "llamacpp") {
    const install =
      os.id === "macos" ? "brew install llama.cpp" :
      os.id === "linux" ? "sudo apt install -y build-essential cmake\ngit clone https://github.com/ggerganov/llama.cpp\ncd llama.cpp && cmake -B build && cmake --build build -j" :
                          "winget install llama.cpp";
    return [
      { title: "1. Install llama.cpp", code: install },
      { title: "2. Download a GGUF",   code: `# from huggingface.co, e.g.\nhuggingface-cli download bartowski/${modelTag}.gguf --local-dir ./models` },
      { title: "3. Start the server",  code: `./build/bin/llama-server -m ./models/${modelTag}.gguf --port ${runtime.port}` },
    ];
  }
  if (runtime.id === "vllm") {
    return [
      { title: "1. Install vLLM",    code: "pip install vllm" },
      { title: "2. Serve the model", code: `vllm serve ${modelTag} --port ${runtime.port}` },
    ];
  }
  const install =
    os.id === "macos" ? "brew install --cask lm-studio" :
    os.id === "linux" ? "# download AppImage from lmstudio.ai\nchmod +x LM-Studio-*.AppImage && ./LM-Studio-*.AppImage" :
                        "winget install LMStudio.LMStudio";
  return [
    { title: "1. Install LM Studio",                   code: install },
    { title: "2. In the app, search and download",     code: modelTag },
    { title: "3. Start local server (Developer tab)",  code: `# server listens on ${runtime.endpoint}` },
  ];
}
