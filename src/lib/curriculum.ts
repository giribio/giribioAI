import type { LucideIcon } from "lucide-react";
import {
  Binary,
  BookOpenText,
  BrainCircuit,
  GraduationCap,
  Network,
  Search,
  Orbit,
  Dices,
  Dna,
  ShieldCheck,
  Wand2,
  NotebookPen,
  MessagesSquare,
  Cpu,
  Presentation,
  Share2,
  Layers,
  Boxes,
  Workflow,
} from "lucide-react";

/**
 * Single source of truth for the GiriBioAI curriculum.
 * Header nav, home grid, learning path, sitemap, command palette and the
 * prev/next links in ModulePage all read from here.
 */

export type TrackId = "foundations" | "inside" | "building" | "bio" | "labs";

export type Track = {
  id: TrackId;
  title: string;
  blurb: string;
  /** Tailwind text colour class for the track accent. */
  color: string;
  /** Tailwind background class for chips/dots. */
  dot: string;
};

export const TRACKS: Track[] = [
  { id: "foundations", title: "Foundations", blurb: "Start here: neurons, then how text becomes numbers and meaning.", color: "text-g-blue", dot: "bg-g-blue" },
  { id: "inside", title: "Inside the model", blurb: "How a model is built, trained, and how it picks each next word.", color: "text-g-cyan", dot: "bg-g-cyan" },
  { id: "building", title: "Building with LLMs", blurb: "Prompting, retrieval, agents and checking the output.", color: "text-g-green", dot: "bg-g-green" },
  { id: "bio", title: "Bio-AI", blurb: "Language models for DNA, proteins and molecules.", color: "text-g-yellow", dot: "bg-g-yellow" },
  { id: "labs", title: "Hands-on labs", blurb: "Bigger sandboxes and slides to explore freely.", color: "text-muted-foreground", dot: "bg-muted-foreground" },
];

export type ModuleId =
  | "neural-networks"
  | "tokens"
  | "vocabulary"
  | "embeddings"
  | "transformer"
  | "context"
  | "agent-loop"
  | "pretraining"
  | "sampling"
  | "finetuning"
  | "prompt-builder"
  | "prompt-training"
  | "rag"
  | "orchestration"
  | "evals"
  | "bio-ai"
  | "chat-sim"
  | "local-llm-sim"
  | "agents-slides";

export type ModuleInfo = {
  id: ModuleId;
  to: string;
  title: string;
  short: string;
  desc: string;
  icon: LucideIcon;
  track: TrackId;
  /** true for new modules, shows a small badge */
  isNew?: boolean;
};

/** Ordered: the learning sequence follows this array (labs excluded from prev/next). */
export const MODULES: ModuleInfo[] = [
  { id: "neural-networks", to: "/neural-networks", title: "Neural Network Basics", short: "Neural nets", desc: "Tune a single neuron, then watch a tiny network learn XOR and circles live.", icon: Share2, track: "foundations", isNew: true },
  { id: "tokens", to: "/tokens", title: "Tokens", short: "Tokens", desc: "See how text becomes numbers with a live BPE-style tokenizer.", icon: Binary, track: "foundations" },
  { id: "vocabulary", to: "/vocabulary", title: "Vocabulary", short: "Vocabulary", desc: "Build a vocab from a corpus and watch coverage grow.", icon: BookOpenText, track: "foundations" },
  { id: "embeddings", to: "/embeddings", title: "Embeddings & Attention", short: "Embeddings", desc: "Explore a word map, do vector arithmetic and see which tokens attend to which.", icon: Orbit, track: "foundations", isNew: true },
  { id: "transformer", to: "/transformer", title: "Transformer Walkthrough", short: "Transformer", desc: "Step through one GPT block: embeddings, positions, Q/K/V attention, MLP and logits.", icon: Layers, track: "inside", isNew: true },
  { id: "pretraining", to: "/pretraining", title: "Pre-training", short: "Pre-training", desc: "Train a tiny next-token predictor in your browser.", icon: BrainCircuit, track: "inside" },
  { id: "sampling", to: "/sampling", title: "Sampling & Decoding", short: "Sampling", desc: "Turn temperature, top-k and top-p knobs and watch the next-token odds change.", icon: Dices, track: "inside", isNew: true },
  { id: "context", to: "/context", title: "Context, KV Cache & MoE", short: "Context & MoE", desc: "Fit chats in a context window, see why the KV cache speeds generation, route tokens to experts.", icon: Boxes, track: "inside", isNew: true },
  { id: "finetuning", to: "/finetuning", title: "Fine-tuning", short: "Fine-tuning", desc: "Watch loss curves move as you teach a model new behavior.", icon: GraduationCap, track: "inside" },
  { id: "prompt-builder", to: "/prompt-builder", title: "Prompt Builder", short: "Prompt Builder", desc: "Compose role, context, task and format into a strong prompt.", icon: Wand2, track: "building" },
  { id: "prompt-training", to: "/prompt-training", title: "Prompt Training", short: "Prompt Training", desc: "Seven habits of good prompts, with a quick quiz.", icon: NotebookPen, track: "building" },
  { id: "rag", to: "/rag", title: "Retrieval (RAG)", short: "RAG", desc: "Index documents, embed queries, and rank chunks live.", icon: Search, track: "building" },
  { id: "orchestration", to: "/orchestration", title: "Orchestration", short: "Orchestration", desc: "Compose agents, tools, and routers into a flow.", icon: Network, track: "building" },
  { id: "agent-loop", to: "/agent-loop", title: "Agent Loop Tracer", short: "Agent loop", desc: "Step through a tool-calling agent: thought, JSON call, MCP result, retry, with a token meter.", icon: Workflow, track: "building", isNew: true },
  { id: "evals", to: "/evals", title: "Evals, Safety & Quantization", short: "Evals & Safety", desc: "Catch hallucinations, score with a judge, block prompt injection, shrink models.", icon: ShieldCheck, track: "building", isNew: true },
  { id: "bio-ai", to: "/bio-ai", title: "Bio-AI with LLMs", short: "Bio-AI", desc: "Tokenize DNA, proteins and SMILES, and play with a toy protein language model.", icon: Dna, track: "bio", isNew: true },
  { id: "chat-sim", to: "/chat-sim", title: "Chat Simulator", short: "Chat Sim", desc: "A chat sandbox that shows tokens, cost and latency of every message.", icon: MessagesSquare, track: "labs" },
  { id: "local-llm-sim", to: "/local-llm-sim", title: "Local LLM Setup", short: "Local LLM", desc: "Pick GPU, OS, model and runtime, then get the exact setup commands.", icon: Cpu, track: "labs" },
  { id: "agents-slides", to: "/agents-slides", title: "Agentic AI, RAG & MCP Slides", short: "Slides", desc: "A 50-slide deck on agents, retrieval and the Model Context Protocol.", icon: Presentation, track: "labs" },
];

/**
 * The guided order used for prev/next and module numbers: every non-lab module,
 * in MODULES order. Keep MODULES grouped by track so numbers run 01, 02, 03…
 * inside each track on the home page.
 */
export const SEQUENCE: ModuleId[] = MODULES.filter((m) => m.track !== "labs").map((m) => m.id);

export function getModule(id: ModuleId): ModuleInfo {
  const m = MODULES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown module ${id}`);
  return m;
}

export function modulesInTrack(track: TrackId): ModuleInfo[] {
  return MODULES.filter((m) => m.track === track);
}

export function moduleByPath(path: string): ModuleInfo | undefined {
  const clean = path.replace(/\/+$/, "") || "/";
  return MODULES.find((m) => m.to === clean);
}

export function sequenceNeighbours(id: ModuleId) {
  const i = SEQUENCE.indexOf(id);
  if (i < 0) return { index: -1, prev: undefined, next: undefined };
  const prev = i > 0 ? getModule(SEQUENCE[i - 1]) : undefined;
  const next = i < SEQUENCE.length - 1 ? getModule(SEQUENCE[i + 1]) : undefined;
  return { index: i, prev, next };
}

/** Static non-module pages, used by the sitemap and command palette. */
export const PAGES = [
  { to: "/", title: "Home" },
  { to: "/path", title: "Learning path" },
  { to: "/glossary", title: "Glossary" },
  { to: "/about", title: "About GiriBioAI" },
] as const;
