import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help } from "@/components/learn/ModulePage";
import { TrainingRunner, type TrainingPreset } from "@/components/learn/TrainingRunner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/finetuning")({
  head: () => ({
    meta: [
      { title: "Fine-tuning | GiriBioAI" },
      { name: "description", content: "How a pre-trained model is adapted to a new task. Simulate loss curves with learning rate and dataset size." },
      { property: "og:title", content: "Fine-tuning | GiriBioAI" },
      { property: "og:description", content: "Simulate fine-tuning loss curves live." },
    ],
  }),
  component: FinetuningPage,
});

function simulate({ lr, epochs, dataset, dropout }: { lr: number; epochs: number; dataset: number; dropout: number }) {
  // Stylized curves: train loss decays exponentially, val loss U-shape if lr too high / data too small
  const out: { epoch: number; train: number; val: number }[] = [];
  const dataFactor = Math.log10(dataset + 10) / 3; // larger data = better val
  const overfit = Math.max(0, (1 - dataFactor) * (1 - dropout) * 1.2);
  const baseDecay = Math.min(1, lr * 6);
  for (let e = 0; e < epochs; e++) {
    const t = e / Math.max(1, epochs - 1);
    const train = 2.4 * Math.exp(-baseDecay * t * 3) + 0.15 + Math.random() * 0.04;
    // val improves, then turns up if overfit large
    const minPoint = 0.8 - 0.4 * dataFactor;
    const u = (t - 0.55) ** 2; // U
    const val = minPoint + 1.2 * Math.exp(-baseDecay * t * 2.2) + overfit * u + Math.random() * 0.05;
    out.push({ epoch: e + 1, train: +train.toFixed(3), val: +val.toFixed(3) });
  }
  return out;
}

function FinetuningPage() {
  const [lr, setLr] = useState(0.05);
  const [epochs, setEpochs] = useState(20);
  const [dataset, setDataset] = useState(500);
  const [dropout, setDropout] = useState(0.1);
  const [method, setMethod] = useState<"full" | "lora" | "rlhf">("lora");
  const [seed, setSeed] = useState(0);

  const reset = () => { setLr(0.05); setEpochs(20); setDataset(500); setDropout(0.1); setMethod("lora"); setSeed((s) => s + 1); };

  const data = useMemo(() => simulate({ lr, epochs, dataset, dropout }), [lr, epochs, dataset, dropout, seed]);
  const last = data[data.length - 1];
  const overfitting = last && last.val - last.train > 0.4;

  useEffect(() => { setSeed((s) => s + 1); }, [method]);

  return (
    <ModulePage
      moduleId="finetuning"
      title="Fine-tuning"
      intro="Pre-training gives a model general language ability. Fine-tuning teaches it a specific behavior, such as answering in a tone, following a format, or learning your domain. You change the weights with much smaller datasets and tiny learning rates."
    >
      <Section title="Three families of fine-tuning" kicker="methods">
        <p><span className="font-mono text-foreground">Full fine-tuning</span>, which updates every weight. Highest quality, highest cost.</p>
        <p><span className="font-mono text-foreground">LoRA / adapters</span>, which freeze the base and train a small low-rank delta. Cheap, composable, the default in 2024+.</p>
        <p><span className="font-mono text-foreground">RLHF / DPO</span> (Reinforcement Learning from Human Feedback / Direct Preference Optimization), which align the model to human preferences: people rank two answers, and the model learns to prefer the better one. This is how ChatGPT became helpful.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        <KeyTerm term="learning rate" def="How aggressively weights change per step. Too high = chaos; too low = stuck." />
        <KeyTerm term="overfitting" def="Train loss falls, val loss rises. The model memorized your data." />
        <KeyTerm term="LoRA" def="Low-Rank Adaptation. Trains < 1% of the params." />
      </div>

      <Lab title="Fine-tuning simulator">
        <div className="flex justify-end mb-2">
          <button onClick={reset} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <span className="text-xs font-mono text-muted-foreground inline-flex items-center">
            Method
            <Help label="Method">
              <b>FULL</b> updates every weight, for highest quality but costly. <b>LORA</b> freezes the base model and trains a small low-rank delta, which is cheap and the default in 2024+. <b>RLHF</b> aligns the model to human preference rankings.<br />
              <span className="text-muted-foreground">Example: LoRA on a 7B model might train ~50M params instead of 7B.</span>
            </Help>
            :
          </span>
          {(["full", "lora", "rlhf"] as const).map((m) => (
            <button key={m} onClick={() => setMethod(m)} className={`px-3 py-1.5 rounded-md text-sm font-mono border transition ${method === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
              {m.toUpperCase()}
            </button>
          ))}
          {overfitting && (
            <span className="ml-auto px-3 py-1.5 rounded-md text-xs font-mono bg-warning/15 text-warning border border-warning/50">
              ⚠ likely overfitting
            </span>
          )}
        </div>
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <Slider label="Learning rate" help={<>Step size for each weight update. Too high → loss explodes / oscillates. Too low → training is slow or stuck. Typical fine-tuning values are 1e-5 to 1e-4.<br /><span className="text-muted-foreground">Example: lr 0.2 → loss may spike; lr 0.005 → curve flattens slowly.</span></>} value={lr} min={0.005} max={0.2} step={0.005} fmt={(v) => v.toFixed(3)} onChange={setLr} />
            <Slider label="Epochs" help={<>One epoch = the model sees every training example once. More epochs help when data is small, but past a point the model starts memorizing (overfitting).<br /><span className="text-muted-foreground">Example: 5 epochs → underfit; 40 epochs on 50 samples → val loss rises.</span></>} value={epochs} min={3} max={40} step={1} fmt={(v) => `${v}`} onChange={setEpochs} />
            <Slider label="Dataset size" help={<>Number of training examples. More data almost always helps generalization and reduces overfitting risk.<br /><span className="text-muted-foreground">Example: 50 samples → high overfit; 20,000 → smoother val loss.</span></>} value={dataset} min={50} max={20000} step={50} fmt={(v) => `${v}`} onChange={setDataset} />
            <Slider label="Dropout" help={<>Randomly disables a fraction of neurons during training. Acts as regularization, since it fights overfitting by preventing the model from depending on any one weight.<br /><span className="text-muted-foreground">Example: dropout 0.0 → val loss may rise after epoch 10; dropout 0.5 → train loss stays higher but val improves.</span></>} value={dropout} min={0} max={0.5} step={0.01} fmt={(v) => v.toFixed(2)} onChange={setDropout} />
            <button onClick={() => setSeed((s) => s + 1)} className="w-full px-4 py-2 rounded-md border border-border hover:bg-secondary text-sm">Re-run</button>
          </div>
          <div className="rounded-md border border-border bg-background p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="epoch" stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="train" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} name="train loss" />
                <Line type="monotone" dataKey="val" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} name="val loss" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Try a tiny dataset with a high learning rate, then watch val loss diverge. Add dropout or more data to fix it.</p>
      </Lab>

      <Lab title="Animated training run · A100 GPU">
        <p className="text-sm text-muted-foreground mb-4">
          Now feel it run. This simulated A100 fine-tunes your chosen method epoch-by-epoch, streaming GPU util, VRAM, tokens/sec, and a live train/val loss curve. Fine-tuning typically uses far less VRAM and finishes in minutes, not weeks.
        </p>
        <FineTuneRunnerPanel method={method} dataset={dataset} dropout={dropout} epochs={epochs} />
      </Lab>
    </ModulePage>
  );
}

const FT_PRESETS: Record<"full" | "lora" | "rlhf", TrainingPreset> = {
  full:  { name: "Full FT · 7B",  params: 7_000_000_000, tokensPerStep: 8_192, throughput: 14_000, vramGB: 72.0, startLoss: 2.4, endLoss: 0.35 },
  lora:  { name: "LoRA · 7B",     params: 50_000_000,    tokensPerStep: 8_192, throughput: 38_000, vramGB: 18.5, startLoss: 2.2, endLoss: 0.45 },
  rlhf:  { name: "RLHF · 7B",     params: 7_000_000_000, tokensPerStep: 4_096, throughput: 9_000,  vramGB: 64.0, startLoss: 1.8, endLoss: 0.6  },
};

function FineTuneRunnerPanel({ method, dataset, dropout, epochs }: { method: "full" | "lora" | "rlhf"; dataset: number; dropout: number; epochs: number }) {
  const preset = FT_PRESETS[method];
  const [speed, setSpeed] = useState(70);
  // overfit factor mirrors the static simulator
  const dataFactor = Math.log10(dataset + 10) / 3;
  const overfit = Math.max(0, (1 - dataFactor) * (1 - dropout) * 1.2);
  // steps/epoch scales with dataset (cap for animation)
  const stepsPerEpoch = Math.max(10, Math.min(60, Math.round(dataset / 50)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
        <span>Method <span className="text-primary">{method.toUpperCase()}</span></span>
        <span>· steps/epoch <span className="text-primary">{stepsPerEpoch}</span></span>
        <span>· dataset <span className="text-primary">{dataset.toLocaleString()}</span></span>
        <label className="ml-auto inline-flex items-center gap-2">
          <span>speed: <span className="text-primary">{speed}ms</span></span>
          <input type="range" min={15} max={200} step={5} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-40 accent-primary" />
        </label>
      </div>
      <TrainingRunner preset={preset} epochs={epochs} stepsPerEpoch={stepsPerEpoch} msPerStep={speed} showVal overfit={overfit} />
      <p className="text-xs text-muted-foreground">Change <b>Method</b>, <b>Dataset size</b>, <b>Dropout</b>, or <b>Epochs</b> above and press Start, then the run rebuilds. Watch LoRA finish in a fraction of the VRAM of full fine-tuning.</p>
    </div>
  );
}

function Slider({ label, help, value, min, max, step, fmt, onChange }: { label: string; help?: ReactNode; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-muted-foreground inline-flex items-center">
          {label}
          {help && <Help label={label}>{help}</Help>}
        </span>
        <span className="text-primary">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-primary" />
    </label>
  );
}