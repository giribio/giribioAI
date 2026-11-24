import { useEffect, useMemo, useRef, useState } from "react";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Help } from "./ModulePage";

export type TrainingPreset = {
  /** Display name, e.g. "Pre-train · GPT-mini" */
  name: string;
  /** Number of model parameters, e.g. 124_000_000 */
  params: number;
  /** Tokens (or samples) per training step */
  tokensPerStep: number;
  /** A100 sustained throughput in tokens/sec, simulated */
  throughput: number;
  /** VRAM in GB the run occupies on a 80GB A100 */
  vramGB: number;
  /** Initial loss */
  startLoss: number;
  /** Asymptotic loss */
  endLoss: number;
};

type Props = {
  preset: TrainingPreset;
  epochs: number;
  stepsPerEpoch: number;
  /** Real-world ms per simulated step (animation speed). Default 60. */
  msPerStep?: number;
  /** Curve shape: pretraining=smooth, finetuning=can overfit */
  showVal?: boolean;
  /** Multiplier on val-loss U-shape (overfitting). 0 = none. */
  overfit?: number;
};

type Point = { step: number; epoch: number; train: number; val?: number };

export function TrainingRunner({ preset, epochs, stepsPerEpoch, msPerStep = 60, showVal = false, overfit = 0 }: Props) {
  const totalSteps = epochs * stepsPerEpoch;
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [util, setUtil] = useState(0);
  const [vram, setVram] = useState(0);
  const [temp, setTemp] = useState(34);
  const [speed, setSpeed] = useState(1); // multiplier: 0.25, 0.5, 1, 2, 4
  const timer = useRef<number | null>(null);
  const startedAt = useRef<number>(0);
  const elapsedFreeze = useRef<number>(0);

  const reset = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setRunning(false);
    setStep(0);
    setPoints([]);
    setLogs([]);
    setUtil(0);
    setVram(0);
    setTemp(34);
    elapsedFreeze.current = 0;
  };

  // Reset when shape changes
  useEffect(() => { reset(); /* eslint-disable-next-line */ }, [epochs, stepsPerEpoch, preset.name]);

  // Advance simulation by exactly one step. Pure of timers, so reusable by interval and manual step buttons.
  const advanceOne = () => {
    setStep((s) => {
      if (s >= totalSteps) return s;
      const next = s + 1;
      const t = next / totalSteps;
      const train = preset.endLoss + (preset.startLoss - preset.endLoss) * Math.exp(-3.2 * t) + (Math.random() - 0.5) * 0.04;
      let val: number | undefined;
      if (showVal) {
        const u = Math.max(0, (t - 0.55)) ** 2;
        val = preset.endLoss + (preset.startLoss - preset.endLoss) * Math.exp(-2.6 * t) + overfit * u * 2.4 + (Math.random() - 0.5) * 0.05;
      }
      const epoch = Math.min(epochs, Math.floor((next - 1) / stepsPerEpoch) + 1);
      setPoints((p) => {
        const np = [...p, { step: next, epoch, train: +train.toFixed(3), val: val !== undefined ? +val.toFixed(3) : undefined }];
        return np.length > 400 ? np.slice(-400) : np;
      });
      setUtil(92 + Math.round(Math.random() * 8));
      setVram(+(preset.vramGB + Math.random() * 0.4).toFixed(1));
      setTemp(64 + Math.round(Math.random() * 8));
      if (next % stepsPerEpoch === 0) {
        const ep = next / stepsPerEpoch;
        setLogs((l) => [
          `[epoch ${ep}/${epochs}] loss=${train.toFixed(3)}${val !== undefined ? ` val=${val.toFixed(3)}` : ""}  lr=3.0e-4  tok/s=${preset.throughput.toLocaleString()}`,
          ...l,
        ].slice(0, 8));
      }
      if (next >= totalSteps) {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        setRunning(false);
        setLogs((l) => [`✓ training complete, final loss ${train.toFixed(3)}`, ...l].slice(0, 8));
      }
      return next;
    });
  };

  const stepOnce = () => { if (!running) advanceOne(); };
  const stepMany = (n: number) => { if (running) return; for (let i = 0; i < n; i++) advanceOne(); };

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now() - elapsedFreeze.current;
    const interval = Math.max(8, Math.round(msPerStep / speed));
    timer.current = window.setInterval(advanceOne, interval);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
      elapsedFreeze.current = performance.now() - startedAt.current;
    };
  }, [running, totalSteps, msPerStep, speed, preset, stepsPerEpoch, epochs, showVal, overfit]);

  const progress = step / totalSteps;
  const currentEpoch = Math.min(epochs, Math.floor(step / stepsPerEpoch) + (step % stepsPerEpoch === 0 && step > 0 ? 0 : 1));
  const tokensSeen = step * preset.tokensPerStep;
  // simulated wall-clock = tokensSeen / throughput
  const simSeconds = tokensSeen / preset.throughput;
  const etaSeconds = Math.max(0, (totalSteps - step) * preset.tokensPerStep / preset.throughput);

  const status = step === 0 ? "idle" : step >= totalSteps ? "done" : running ? "running" : "paused";

  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      {/* Header: GPU panel */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${status === "running" ? "bg-success animate-pulse" : status === "done" ? "bg-primary" : "bg-muted-foreground/50"}`} />
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">NVIDIA A100 · 80GB SXM</span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-background border border-border text-muted-foreground">
          {status}
        </span>
        <div className="ml-auto flex flex-wrap gap-3 text-[11px] font-mono">
          <Stat label="util" value={`${running ? util : 0}%`} />
          <Stat label="vram" value={`${running ? vram : 0}/80 GB`} />
          <Stat label="temp" value={`${running ? temp : 34}°C`} />
          <Stat label="power" value={`${running ? 380 + Math.round(Math.random() * 20) : 35}W`} />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <button
          onClick={() => setRunning((r) => !r)}
          disabled={step >= totalSteps}
          className="px-3 py-1.5 rounded-md text-xs font-mono bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {running ? "⏸ Pause" : step >= totalSteps ? "✓ Done" : step > 0 ? "▶ Resume" : "▶ Start training"}
        </button>
        <button
          onClick={stepOnce}
          disabled={running || step >= totalSteps}
          title="Advance one step"
          className="px-2 py-1.5 rounded-md text-xs font-mono border border-border hover:bg-secondary disabled:opacity-40"
        >
          ⏭ Step
        </button>
        <button
          onClick={() => stepMany(10)}
          disabled={running || step >= totalSteps}
          title="Advance ten steps"
          className="px-2 py-1.5 rounded-md text-xs font-mono border border-border hover:bg-secondary disabled:opacity-40"
        >
          ⏭⏭ +10
        </button>
        <label className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
          speed
          <select
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="bg-background border border-border rounded px-1.5 py-1 text-xs font-mono text-foreground"
          >
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
          <Help label="Playback speed">
            Multiplies the step rate. <b>0.25×</b> = slow-motion to watch every loss tick. <b>4×</b> = fast-forward to the end. Use <b>Step</b> / <b>+10</b> while paused to scrub manually.
          </Help>
        </label>
        <button onClick={reset} className="px-3 py-1.5 rounded-md text-xs font-mono border border-border hover:bg-secondary">
          ⟲ Reset
        </button>
        <span className="ml-auto inline-flex items-center text-[11px] font-mono text-muted-foreground">
          {preset.name} · {fmtParams(preset.params)} params
          <Help label="What's simulated?">
            We mimic the rhythm of a real training job: per-step loss, GPU util, VRAM, throughput (tok/s) and ETA. Numbers are stylized, but the <i>shape</i> of the curves and the pacing of epochs mirror an A100 run on a small model.
          </Help>
        </span>
      </div>

      {/* Progress + epoch tiles */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div>
          <div className="flex justify-between text-[11px] font-mono mb-1">
            <span className="text-muted-foreground">Epoch {currentEpoch}/{epochs} · step {step}/{totalSteps}</span>
            <span className="text-primary">{(progress * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded bg-secondary overflow-hidden">
            <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="tokens seen" value={fmtTokens(tokensSeen)} />
          <Tile label="throughput" value={`${(preset.throughput / 1000).toFixed(1)}k tok/s`} />
          <Tile label="elapsed" value={fmtDuration(simSeconds)} />
          <Tile label="eta" value={running ? fmtDuration(etaSeconds) : "n/a"} />
        </div>
        {/* Epoch pips */}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: epochs }).map((_, i) => {
            const ep = i + 1;
            const done = ep < currentEpoch || step >= totalSteps;
            const active = ep === currentEpoch && step > 0 && step < totalSteps;
            return (
              <div key={ep} className={`h-5 min-w-7 px-1.5 rounded text-[10px] font-mono inline-flex items-center justify-center border ${done ? "bg-primary/20 border-primary/40 text-primary" : active ? "border-primary text-primary animate-pulse" : "border-border text-muted-foreground"}`}>
                e{ep}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loss chart + log */}
      <div className="grid md:grid-cols-[1fr_280px]">
        <div className="h-56 p-2 border-b md:border-b-0 md:border-r border-border">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="step" stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} />
              <YAxis stroke="var(--color-muted-foreground)" tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="train" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} name="train" />
              {showVal && <Line type="monotone" dataKey="val" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} isAnimationActive={false} name="val" />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="p-3 bg-secondary/30 font-mono text-[11px] leading-relaxed overflow-hidden">
          <div className="text-muted-foreground mb-1">train.log</div>
          {logs.length === 0 ? (
            <div className="text-muted-foreground/60">Press Start to stream epoch logs…</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={i === 0 && running ? "text-primary" : "text-foreground/80"}>{l}</div>
            ))
          )}
        </div>
      </div>

      {status === "done" && <SummaryPanel points={points} preset={preset} totalSteps={totalSteps} epochs={epochs} stepsPerEpoch={stepsPerEpoch} showVal={showVal} />}
    </div>
  );
}

function SummaryPanel({ points, preset, totalSteps, epochs, stepsPerEpoch, showVal }: { points: Point[]; preset: TrainingPreset; totalSteps: number; epochs: number; stepsPerEpoch: number; showVal: boolean }) {
  const final = points[points.length - 1];
  if (!final) return null;

  const valPoints = points.filter((p) => p.val !== undefined).map((p) => ({ step: p.step, val: p.val! }));
  const bestVal = valPoints.length ? valPoints.reduce((a, b) => (b.val < a.val ? b : a)) : null;
  const overfit = bestVal && final.val !== undefined ? final.val - bestVal.val > 0.15 || final.val - final.train > 0.3 : false;

  const totalTokens = totalSteps * preset.tokensPerStep;
  const simSeconds = totalTokens / preset.throughput;

  return (
    <div className="px-4 py-3 border-t border-border bg-secondary/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Run summary</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <Tile label="final train loss" value={final.train.toFixed(3)} />
        <Tile label={showVal ? "final val loss" : "val loss"} value={final.val !== undefined ? final.val.toFixed(3) : "n/a"} />
        <Tile label="best val loss" value={bestVal ? `${bestVal.val.toFixed(3)} @ ${bestVal.step}` : "n/a"} />
        <Tile label="overfit verdict" value={showVal ? (overfit ? "likely overfit" : "looks healthy") : "n/a (no val curve)"} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="epochs completed" value={`${epochs}/${epochs}`} />
        <Tile label="total steps" value={`${totalSteps}`} />
        <Tile label="tokens seen" value={fmtTokens(totalTokens)} />
        <Tile label="simulated wall time" value={fmtDuration(simSeconds)} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {showVal
          ? overfit
            ? "Validation loss rose after its best point or is much higher than train loss. This often means the model is memorizing the training set, so try more data, lower learning rate, or higher dropout."
            : "Training and validation loss moved together. The model is likely generalizing well to held-out data."
          : "Add a validation curve (fine-tuning simulator) to see whether the model overfits."}
      </p>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border px-2 py-1.5">
      <div className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-mono text-foreground">{value}</div>
    </div>
  );
}

function fmtParams(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}
function fmtTokens(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}
function fmtDuration(sec: number) {
  if (!isFinite(sec)) return "n/a";
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}