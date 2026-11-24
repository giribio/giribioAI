import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, StepForward } from "lucide-react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/neural-networks")({
  head: () => ({
    meta: [
      { title: "Neural Network Basics | GiriBioAI" },
      { name: "description", content: "Tune a single neuron by hand, then watch a tiny neural network learn XOR and circles live with gradient descent, all in your browser." },
      { property: "og:title", content: "Neural Network Basics | GiriBioAI" },
      { property: "og:description", content: "A neuron playground and a live-training mini network." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Neural Network Basics",
          description: "Neurons, activation functions, hidden layers and gradient descent.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/neural-networks",
        }),
      },
    ],
  }),
  component: NeuralNetworksPage,
});

// ---------------------------------------------------------------- shared --
type Pt = { x: number; y: number; label: 0 | 1 };
const RANGE = 2.4;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rnd: () => number) {
  return Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
}

type Dataset = "blobs" | "xor" | "circle" | "spiral";
function makeData(kind: Dataset, n = 160, seed = 7): Pt[] {
  const rnd = mulberry32(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    if (kind === "blobs") {
      const l = (i % 2) as 0 | 1;
      const c = l ? 1 : -1;
      pts.push({ x: c + gauss(rnd) * 0.45, y: c + gauss(rnd) * 0.45, label: l });
    } else if (kind === "xor") {
      const sx = rnd() < 0.5 ? -1 : 1, sy = rnd() < 0.5 ? -1 : 1;
      pts.push({ x: sx * (0.3 + rnd() * 1.5), y: sy * (0.3 + rnd() * 1.5), label: sx * sy > 0 ? 1 : 0 });
    } else if (kind === "circle") {
      const l = (i % 2) as 0 | 1;
      const r = l ? rnd() * 0.9 : 1.4 + rnd() * 0.7;
      const a = rnd() * Math.PI * 2;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), label: l });
    } else {
      const l = (i % 2) as 0 | 1;
      const t = (i / n) * 3.2 + 0.4;
      const a = t * 2.1 + (l ? Math.PI : 0);
      const r = t * 0.62;
      pts.push({ x: r * Math.cos(a) + gauss(rnd) * 0.08, y: r * Math.sin(a) + gauss(rnd) * 0.08, label: l });
    }
  }
  return pts;
}

/** Draws f(x, y) in [0, 1] as a blue/yellow field plus data points. */
function FieldCanvas({ fn, points, version }: { fn: (x: number, y: number) => number; points: Pt[]; version: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width, H = cv.height, N = 60;
    const cw = W / N, ch = H / N;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = -RANGE + ((i + 0.5) / N) * 2 * RANGE;
        const y = RANGE - ((j + 0.5) / N) * 2 * RANGE;
        const v = Math.min(1, Math.max(0, fn(x, y)));
        // blend Google yellow (0) -> Google blue (1)
        const r = Math.round(251 + (66 - 251) * v), g = Math.round(188 + (133 - 188) * v), b = Math.round(5 + (244 - 5) * v);
        const a = 0.18 + Math.abs(v - 0.5) * 0.5;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.clearRect(i * cw, j * ch, cw + 1, ch + 1);
        ctx.fillRect(i * cw, j * ch, cw + 1, ch + 1);
      }
    }
    for (const p of points) {
      const px = ((p.x + RANGE) / (2 * RANGE)) * W, py = ((RANGE - p.y) / (2 * RANGE)) * H;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = p.label ? "#1A73E8" : "#F9AB00";
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.stroke();
    }
  }, [fn, points, version]);
  return <canvas ref={ref} width={360} height={360} className="w-full max-w-[360px] aspect-square rounded-lg border border-border bg-background" aria-label="Decision boundary plot" />;
}

// ---------------------------------------------------------- lab A neuron --
type Act = "step" | "sigmoid" | "tanh" | "relu";
const ACTS: Record<Act, { f: (z: number) => number; label: string; range: string }> = {
  step: { f: (z) => (z >= 0 ? 1 : 0), label: "step", range: "0 or 1" },
  sigmoid: { f: (z) => 1 / (1 + Math.exp(-z)), label: "sigmoid", range: "0 to 1" },
  tanh: { f: (z) => Math.tanh(z), label: "tanh", range: "-1 to 1" },
  relu: { f: (z) => Math.max(0, z), label: "ReLU", range: "0 to ∞" },
};
const toUnit = (act: Act, v: number) => (act === "tanh" ? (v + 1) / 2 : act === "relu" ? Math.min(1, v / 2) : v);

// ------------------------------------------------------------ lab B MLP --
type Net = { W1: number[][]; b1: number[]; W2: number[]; b2: number };

function initNet(hidden: number, seed: number): Net {
  const rnd = mulberry32(seed);
  return {
    W1: Array.from({ length: hidden }, () => [gauss(rnd) * 0.9, gauss(rnd) * 0.9]),
    b1: Array.from({ length: hidden }, () => gauss(rnd) * 0.1),
    W2: Array.from({ length: hidden }, () => gauss(rnd) * 0.9),
    b2: 0,
  };
}
const sig = (z: number) => 1 / (1 + Math.exp(-z));

/** With hidden = 0 the net is plain logistic regression on (x, y). */
function forward(net: Net, x: number, y: number, hidden: number) {
  if (hidden === 0) return { h: [] as number[], out: sig(net.W2[0] * x + net.W2[1] * y + net.b2) };
  const h = net.W1.map((w, k) => Math.tanh(w[0] * x + w[1] * y + net.b1[k]));
  return { h, out: sig(h.reduce((s, hk, k) => s + hk * net.W2[k], net.b2)) };
}

function trainEpoch(net: Net, data: Pt[], lr: number, hidden: number) {
  const H = hidden;
  const gW1 = net.W1.map(() => [0, 0]), gb1 = net.b1.map(() => 0), gW2 = net.W2.map(() => 0);
  let gb2 = 0, loss = 0;
  for (const p of data) {
    const { h, out } = forward(net, p.x, p.y, H);
    loss += -(p.label * Math.log(out + 1e-9) + (1 - p.label) * Math.log(1 - out + 1e-9));
    const d = out - p.label; // dLoss/dz for sigmoid + cross-entropy
    gb2 += d;
    if (H === 0) { gW2[0] += d * p.x; gW2[1] += d * p.y; continue; }
    for (let k = 0; k < H; k++) {
      gW2[k] += d * h[k];
      const dh = d * net.W2[k] * (1 - h[k] * h[k]);
      gW1[k][0] += dh * p.x; gW1[k][1] += dh * p.y; gb1[k] += dh;
    }
  }
  const n = data.length;
  net.b2 -= (lr * gb2) / n;
  net.W2 = net.W2.map((w, k) => w - (lr * gW2[k]) / n);
  if (H > 0) {
    net.W1 = net.W1.map((w, k) => [w[0] - (lr * gW1[k][0]) / n, w[1] - (lr * gW1[k][1]) / n]);
    net.b1 = net.b1.map((b, k) => b - (lr * gb1[k]) / n);
  }
  return loss / n;
}

function accuracy(net: Net, data: Pt[], hidden: number) {
  return data.filter((p) => (forward(net, p.x, p.y, hidden).out >= 0.5 ? 1 : 0) === p.label).length / data.length;
}

const NET_DEFAULTS = { data: "xor" as Dataset, hidden: 4, lr: 0.5, seed: 1 };

function NeuralNetworksPage() {
  // ---- Lab A
  const [n, setN, resetN] = useShareState("neuron", { w1: 1, w2: 1, b: 0, act: "sigmoid" as Act, x1: 0.5, x2: -0.3 });
  const act = n.act as Act;
  const z = n.w1 * n.x1 + n.w2 * n.x2 + n.b;
  const a = ACTS[act].f(z);
  const neuronFn = useCallback((x: number, y: number) => toUnit(act, ACTS[act].f(n.w1 * x + n.w2 * y + n.b)), [act, n.w1, n.w2, n.b]);
  const blobPts = useMemo(() => makeData("blobs", 60, 3), []);
  const neuronAcc = blobPts.filter((p) => (neuronFn(p.x, p.y) >= 0.5 ? 1 : 0) === p.label).length / blobPts.length;

  // ---- Lab B
  const [cfg, setCfg, resetCfg] = useShareState("net", NET_DEFAULTS);
  const dataset = cfg.data as Dataset;
  const data = useMemo(() => makeData(dataset), [dataset]);
  const netRef = useRef<Net>(initNet(NET_DEFAULTS.hidden, 1));
  const [epoch, setEpoch] = useState(0);
  const [losses, setLosses] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState(0);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const reinit = useCallback(() => {
    netRef.current = initNet(Math.max(cfgRef.current.hidden, 2), cfgRef.current.seed);
    setEpoch(0);
    setLosses([]);
    setVersion((v) => v + 1);
  }, []);

  // restart whenever the architecture or data changes
  useEffect(() => {
    reinit();
  }, [cfg.hidden, cfg.data, cfg.seed, reinit]);

  const step = useCallback((epochs: number) => {
    let l = 0;
    for (let i = 0; i < epochs; i++) l = trainEpoch(netRef.current, data, cfgRef.current.lr, cfgRef.current.hidden);
    setEpoch((e) => e + epochs);
    setLosses((ls) => [...ls.slice(-199), l]);
    setVersion((v) => v + 1);
  }, [data]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const tick = () => {
      step(5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, step]);

  const netFn = useCallback((x: number, y: number) => forward(netRef.current, x, y, cfgRef.current.hidden).out, []);
  const acc = useMemo(() => accuracy(netRef.current, data, cfg.hidden), [data, cfg.hidden, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastLoss = losses[losses.length - 1];
  const maxLoss = Math.max(0.8, ...losses);

  const resetB = () => { setRunning(false); resetCfg(); };

  return (
    <ModulePage
      moduleId="neural-networks"
      title="Neural Network Basics"
      intro="Every LLM is a neural network: billions of tiny units that multiply, add and squash numbers. Before tokens and transformers, get a feel for one neuron, then watch a small network teach itself to separate patterns a single neuron never could."
    >
      <Section title="One neuron, three steps" kicker="concept">
        <p>A <span className="font-mono text-foreground">neuron</span> takes inputs, multiplies each by a <span className="font-mono text-foreground">weight</span>, adds a <span className="font-mono text-foreground">bias</span>, and passes the sum <code>z</code> through an <span className="font-mono text-foreground">activation function</span>. On a 2D plane, that draws a straight line: one side says "yes", the other "no".</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("neural-networks").slice(0, 3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      <Lab title="Single neuron">
        <ResetButton onClick={resetN} share />
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <FieldCanvas fn={neuronFn} points={blobPts} version={0} />
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3 text-xs font-mono">
              {([["w1", "weight 1"], ["w2", "weight 2"], ["b", "bias"]] as const).map(([k, label]) => (
                <label key={k} className="block">
                  {label}: <span className="text-primary">{n[k].toFixed(1)}</span>
                  <input type="range" min={-3} max={3} step={0.1} value={n[k]} onChange={(e) => setN({ [k]: +e.target.value })} className="w-full accent-primary" />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground inline-flex items-center">activation
                <Help label="Activation">Without a non-linear activation, stacking neurons would still only draw straight lines. ReLU is the default in most modern networks; LLM MLPs use smooth cousins like GELU and SwiGLU.</Help>:
              </span>
              {(Object.keys(ACTS) as Act[]).map((k) => (
                <button key={k} onClick={() => setN({ act: k })} className={`px-2.5 py-1 rounded-md border ${act === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{ACTS[k].label}</button>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-4 font-mono text-sm space-y-2">
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <label>x1 = <span className="text-primary">{n.x1.toFixed(1)}</span><input type="range" min={-2} max={2} step={0.1} value={n.x1} onChange={(e) => setN({ x1: +e.target.value })} className="w-full accent-primary" /></label>
                <label>x2 = <span className="text-primary">{n.x2.toFixed(1)}</span><input type="range" min={-2} max={2} step={0.1} value={n.x2} onChange={(e) => setN({ x2: +e.target.value })} className="w-full accent-primary" /></label>
              </div>
              <div>z = {n.w1.toFixed(1)}·{n.x1.toFixed(1)} + {n.w2.toFixed(1)}·{n.x2.toFixed(1)} + {n.b.toFixed(1)} = <span className="text-primary">{z.toFixed(2)}</span></div>
              <div>output = {ACTS[act].label}(z) = <span className="text-success font-bold">{a.toFixed(3)}</span> <span className="text-xs text-muted-foreground">(range {ACTS[act].range})</span></div>
            </div>
            <p className="text-sm text-muted-foreground">
              Classifying the two clusters: <span className={`font-mono font-bold ${neuronAcc > 0.9 ? "text-success" : "text-warning"}`}>{Math.round(neuronAcc * 100)}% correct</span>. Try making weight 1 negative and watch the boundary flip. Blue dots should sit on blue.
            </p>
          </div>
        </div>
      </Lab>

      <Section title="Learning = rolling downhill" kicker="training">
        <p>Nobody sets the weights by hand in a real network. Training measures the error with a <span className="font-mono text-foreground">loss</span>, uses <span className="font-mono text-foreground">backpropagation</span> to find which direction each weight should move, then takes a small step: <span className="font-mono text-foreground">gradient descent</span>. Repeat thousands of times. GPT-style models do exactly this, with billions of weights and next-token loss.</p>
        <p>A single neuron can only draw a line, so it fails on XOR and circles. Add a <span className="font-mono text-foreground">hidden layer</span> and the network can bend the boundary.</p>
      </Section>

      <Lab title="Train a tiny network">
        <ResetButton onClick={resetB} share />
        <div className="flex flex-wrap gap-2 mb-4 text-xs font-mono">
          <span className="text-muted-foreground self-center inline-flex items-center">dataset
            <Help label="Datasets"><b>blobs</b>: two clusters, one straight line separates them. <b>xor</b> ("exclusive or"): blue where x and y have the same sign, yellow where they differ, so no single straight line works. <b>circle</b>: blue inside, yellow around it. <b>spiral</b>: two interleaved arms, the hardest.</Help>:
          </span>
          {(["blobs", "xor", "circle", "spiral"] as Dataset[]).map((d) => (
            <button key={d} onClick={() => { setRunning(false); setCfg({ data: d }); }} className={`px-2.5 py-1 rounded-md border ${dataset === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{d}</button>
          ))}
        </div>
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <div>
            <FieldCanvas fn={netFn} points={data} version={version} />
            <div className="mt-2 flex items-center justify-center gap-4 text-xs font-mono text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-g-blue" /> class 1</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-g-yellow" /> class 0</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono">
              <label className="block">
                <span className="inline-flex items-center">hidden neurons: <span className="text-primary ml-1">{cfg.hidden === 0 ? "0 (single neuron)" : cfg.hidden}</span>
                  <Help label="Hidden neurons">0 means no hidden layer, just one output neuron, which can only draw a straight line. Each hidden neuron adds one more line the output can combine.</Help>
                </span>
                <input type="range" min={0} max={8} value={cfg.hidden} onChange={(e) => { setRunning(false); setCfg({ hidden: +e.target.value }); }} className="w-full accent-primary" />
              </label>
              <label className="block">
                <span className="inline-flex items-center">learning rate: <span className="text-primary ml-1">{cfg.lr.toFixed(2)}</span>
                  <Help label="Learning rate">Step size of each update. Too small: painfully slow. Too large: the loss bounces around or blows up.</Help>
                </span>
                <input type="range" min={0.01} max={3} step={0.01} value={cfg.lr} onChange={(e) => setCfg({ lr: +e.target.value })} className="w-full accent-primary" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setRunning((r) => !r)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90">
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "Pause" : "Train"}
              </button>
              <button onClick={() => step(1)} disabled={running} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-40">
                <StepForward className="h-4 w-4" /> 1 epoch
              </button>
              <button onClick={() => { setRunning(false); setCfg({ seed: cfg.seed + 1 }); }} className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary">New random weights</button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="rounded border border-border bg-secondary/40 p-2">epoch<div className="text-lg text-primary">{epoch}</div></div>
              <div className="rounded border border-border bg-secondary/40 p-2">loss<div className="text-lg text-primary">{lastLoss != null ? lastLoss.toFixed(3) : "-"}</div></div>
              <div className="rounded border border-border bg-secondary/40 p-2">accuracy<div className={`text-lg ${acc > 0.95 ? "text-success" : "text-primary"}`}>{Math.round(acc * 100)}%</div></div>
            </div>
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">loss curve (last 200 updates)</div>
              <svg viewBox="0 0 200 60" className="w-full h-24 rounded-md border border-border bg-background" preserveAspectRatio="none" role="img" aria-label="Loss curve">
                <polyline fill="none" stroke="var(--chart-1)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                  points={losses.map((l, i) => `${(i / 199) * 200},${58 - (l / maxLoss) * 54}`).join(" ")} />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">Try: XOR with 0 hidden neurons never passes ~75%. Set 3 or more and press Train. Spiral needs 8 neurons and patience; crank the learning rate to 3 to see training go unstable.</p>
          </div>
        </div>
      </Lab>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("neural-networks").slice(3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}
