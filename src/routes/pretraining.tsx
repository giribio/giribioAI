import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help } from "@/components/learn/ModulePage";
import { TrainingRunner, type TrainingPreset } from "@/components/learn/TrainingRunner";

export const Route = createFileRoute("/pretraining")({
  head: () => ({
    meta: [
      { title: "Pre-training | GiriBioAI" },
      { name: "description", content: "How LLMs learn from raw text. Train a tiny bigram next-token predictor in the browser." },
      { property: "og:title", content: "Pre-training | GiriBioAI" },
      { property: "og:description", content: "Train a tiny next-token model live." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Pre-training",
          description: "How LLMs learn from raw text by predicting the next token.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/pretraining",
        }),
      },
    ],
  }),
  component: PretrainingPage,
});

const CORPUS = `the cat sat on the mat the cat ate a fish the dog sat on the log the dog ate a bone a brown fox ran over the lazy dog the quick fox jumps the cat naps on the mat`;

type Bigram = Map<string, Map<string, number>>;
function trainBigram(text: string): Bigram {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const m: Bigram = new Map();
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1];
    if (!m.has(a)) m.set(a, new Map());
    const inner = m.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + 1);
  }
  return m;
}
function topNext(m: Bigram, word: string, k = 5): { tok: string; p: number }[] {
  const inner = m.get(word.toLowerCase());
  if (!inner) return [];
  const total = [...inner.values()].reduce((a, b) => a + b, 0);
  return [...inner.entries()]
    .map(([tok, c]) => ({ tok, p: c / total }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k);
}
function sample(m: Bigram, seed: string, n: number, temp: number): string {
  let out = [seed.toLowerCase()];
  for (let i = 0; i < n; i++) {
    const choices = topNext(m, out[out.length - 1], 10);
    if (!choices.length) break;
    // temperature scaling
    const weights = choices.map((c) => Math.pow(c.p, 1 / Math.max(0.05, temp)));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    let idx = 0;
    for (let j = 0; j < weights.length; j++) { r -= weights[j]; if (r <= 0) { idx = j; break; } }
    out.push(choices[idx].tok);
  }
  return out.join(" ");
}

const DEFAULT_SEED = "the";
const DEFAULT_TEMP = 0.8;
const DEFAULT_STEPS = 12;

function PretrainingPage() {
  const [corpus, setCorpus] = useState(CORPUS);
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [temp, setTemp] = useState(DEFAULT_TEMP);
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [gen, setGen] = useState("");

  const reset = () => { setCorpus(CORPUS); setSeed(DEFAULT_SEED); setTemp(DEFAULT_TEMP); setSteps(DEFAULT_STEPS); setGen(""); };

  const model = useMemo(() => trainBigram(corpus), [corpus]);
  const preview = useMemo(() => topNext(model, seed, 6), [model, seed]);

  return (
    <ModulePage
      moduleId="pretraining"
      title="Pre-training"
      intro="Pre-training is when a model learns the statistics of language from raw text. The objective is simple: given the tokens so far, predict the next one. Repeat trillions of times across the internet."
    >
      <Section title="Next-token prediction" kicker="objective">
        <p>Every modern LLM is trained on one task: given a context, output a probability distribution over the next token. Loss = how surprised the model was by the actual next token (cross-entropy).</p>
        <p>Real models use deep transformers and learn long-range patterns. The toy below uses a <span className="font-mono text-foreground">bigram</span>, which only remembers the last word, but the mechanic is the same.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        <KeyTerm term="loss" def="How wrong predictions are. Lower = better." />
        <KeyTerm term="temperature" def="Sampling randomness. 0 = greedy, >1 = wild." />
        <KeyTerm term="parameters" def="The learned numbers (weights) inside the model." />
      </div>

      <Lab title="Train a bigram model">
        <div className="flex justify-end mb-2">
          <button onClick={reset} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
        </div>
        <label htmlFor="pretrain-corpus" className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          Training corpus
          <Help label="Training corpus">
            The text the model learns from. The bigram counts how often word B follows word A. More varied text → richer next-word distributions.<br />
            <span className="text-muted-foreground">Example: add "the cat sleeps" and P(sleeps | the) rises from 0% to a visible bar.</span>
          </Help>
        </label>
        <textarea id="pretrain-corpus" value={corpus} onChange={(e) => setCorpus(e.target.value)} rows={4} className="w-full font-mono text-sm rounded-md border border-input bg-background p-3" />
        <div className="mt-4 grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2 inline-flex items-center">
              P(next word | seed)
              <Help label="Probability distribution">
                The model's learned probability for each candidate next word, given the seed word. This is exactly what a real LLM outputs at every step, just over ~100k tokens instead of a handful.<br />
                <span className="text-muted-foreground">Example: seed "the" → P(cat) ≈ 30%, P(dog) ≈ 25%, P(fox) ≈ 10%.</span>
              </Help>
            </div>
            <input aria-label="Seed word" value={seed} onChange={(e) => setSeed(e.target.value)} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-3" />
            <div className="space-y-2">
              {preview.length === 0 && <p className="text-xs text-muted-foreground">No data, try "the", "a", "cat".</p>}
              {preview.map((c) => (
                <div key={c.tok}>
                  <div className="flex justify-between text-xs font-mono mb-0.5">
                    <span>{c.tok}</span>
                    <span className="text-primary">{(c.p * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded bg-secondary overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${c.p * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">Generate</div>
            <div className="space-y-3">
              <label className="block text-xs font-mono inline-flex items-center w-full flex-wrap">
                <span className="inline-flex items-center">
                  Steps: <span className="text-primary ml-1">{steps}</span>
                  <Help label="Steps">
                    How many tokens to generate, one at a time. Each new token is fed back as the next input, which is called autoregressive sampling.<br />
                    <span className="text-muted-foreground">Example: 5 steps → "the cat sat on the"; 20 steps → a longer, more meandering sentence.</span>
                  </Help>
                </span>
                <input type="range" min={3} max={40} value={steps} onChange={(e) => setSteps(+e.target.value)} className="w-full accent-primary" />
              </label>
              <label className="block text-xs font-mono inline-flex items-center w-full flex-wrap">
                <span className="inline-flex items-center">
                  Temperature: <span className="text-primary ml-1">{temp.toFixed(2)}</span>
                  <Help label="Temperature">
                    Controls randomness. <b>0</b> = always pick the most likely word (deterministic, repetitive). <b>1</b> = sample from the true distribution. <b>&gt;1</b> = flatten probabilities → more creative but more chaotic.<br />
                    <span className="text-muted-foreground">Example: temp 0.1 repeats "the cat sat"; temp 1.2 invents unlikely phrases.</span>
                  </Help>
                </span>
                <input type="range" min={0.1} max={2} step={0.05} value={temp} onChange={(e) => setTemp(+e.target.value)} className="w-full accent-primary" />
              </label>
              <button onClick={() => setGen(sample(model, seed, steps, temp))} className="w-full px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">
                Sample
              </button>
              <div className="rounded-md border border-border bg-background p-3 font-mono text-sm min-h-16">
                {gen || <span className="text-muted-foreground">Click Sample to generate text.</span>}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">A real LLM does this with billions of parameters, attention over thousands of tokens, and a vocabulary of ~100k. The principle stays identical: predict the next token.</p>
      </Lab>

      <Lab title="Animated training run · A100 GPU">
        <p className="text-sm text-muted-foreground mb-4">
          What does pre-training <i>feel</i> like? Below is a simulated job on an NVIDIA A100. Watch loss drop epoch by epoch, GPU utilization spike, VRAM fill up, and tokens stream through, all without a real GPU.
        </p>
        <PretrainRunnerPanel />
        <p className="mt-4 text-xs text-muted-foreground">Real pre-training of a frontier model takes weeks across thousands of GPUs. The shape of the loss curve and the rhythm of epoch logs look just like this, only zoomed out.</p>
      </Lab>
    </ModulePage>
  );
}

const PRETRAIN_PRESETS: Record<string, TrainingPreset> = {
  nano: { name: "GPT-nano (10M)", params: 10_000_000, tokensPerStep: 16_384, throughput: 145_000, vramGB: 6.2, startLoss: 8.6, endLoss: 3.2 },
  mini: { name: "GPT-mini (124M)", params: 124_000_000, tokensPerStep: 32_768, throughput: 85_000, vramGB: 22.4, startLoss: 9.1, endLoss: 2.6 },
  small: { name: "GPT-small (350M)", params: 350_000_000, tokensPerStep: 32_768, throughput: 48_000, vramGB: 41.8, startLoss: 9.3, endLoss: 2.3 },
};

function PretrainRunnerPanel() {
  const [presetKey, setPresetKey] = useState<keyof typeof PRETRAIN_PRESETS>("mini");
  const [epochs, setEpochs] = useState(6);
  const [stepsPerEpoch, setStepsPerEpoch] = useState(40);
  const [speed, setSpeed] = useState(60);
  const preset = PRETRAIN_PRESETS[presetKey];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground inline-flex items-center">
          Model
          <Help label="Model size">
            Bigger models need more VRAM and more tokens to converge. Try GPT-nano for a fast finish, GPT-small to watch VRAM climb past 40GB.
          </Help>
          :
        </span>
        {(Object.keys(PRETRAIN_PRESETS) as (keyof typeof PRETRAIN_PRESETS)[]).map((k) => (
          <button key={k} onClick={() => setPresetKey(k)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition ${presetKey === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>
            {PRETRAIN_PRESETS[k].name}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="block text-xs font-mono">
          <span className="text-muted-foreground inline-flex items-center">
            Epochs: <span className="text-primary ml-1">{epochs}</span>
            <Help label="Epochs">One pass over the dataset. Pre-training usually runs 1 to 3 epochs over trillions of tokens.</Help>
          </span>
          <input type="range" min={1} max={12} value={epochs} onChange={(e) => setEpochs(+e.target.value)} className="w-full accent-primary" />
        </label>
        <label className="block text-xs font-mono">
          <span className="text-muted-foreground inline-flex items-center">
            Steps/epoch: <span className="text-primary ml-1">{stepsPerEpoch}</span>
            <Help label="Steps per epoch">Each step processes one batch. More steps = more compute per epoch.</Help>
          </span>
          <input type="range" min={10} max={120} step={5} value={stepsPerEpoch} onChange={(e) => setStepsPerEpoch(+e.target.value)} className="w-full accent-primary" />
        </label>
        <label className="block text-xs font-mono">
          <span className="text-muted-foreground inline-flex items-center">
            Animation speed: <span className="text-primary ml-1">{speed}ms/step</span>
            <Help label="Animation speed">How fast the simulator ticks. Slide left to fast-forward; right to watch in slow motion.</Help>
          </span>
          <input type="range" min={15} max={200} step={5} value={speed} onChange={(e) => setSpeed(+e.target.value)} className="w-full accent-primary" />
        </label>
      </div>
      <TrainingRunner preset={preset} epochs={epochs} stepsPerEpoch={stepsPerEpoch} msPerStep={speed} />
    </div>
  );
}