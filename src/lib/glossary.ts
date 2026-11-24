import type { ModuleId } from "./curriculum";

export type GlossaryTerm = { term: string; def: string; module: ModuleId };

/**
 * Every key term taught across GiriBioAI, with the module that explains it.
 * Pages render their KeyTerm cards from here via `termsFor()` so the glossary
 * and the modules never drift apart.
 */
export const GLOSSARY: GlossaryTerm[] = [
  // Neural networks
  { term: "neuron", def: "Multiplies inputs by weights, adds a bias, then applies an activation function.", module: "neural-networks" },
  { term: "activation function", def: "The non-linear squash (ReLU, sigmoid, tanh) that lets networks learn curves, not just lines.", module: "neural-networks" },
  { term: "gradient descent", def: "Repeatedly nudge every weight a little in the direction that lowers the loss.", module: "neural-networks" },
  { term: "backpropagation", def: "The chain-rule bookkeeping that computes how much each weight contributed to the error.", module: "neural-networks" },
  { term: "hidden layer", def: "Neurons between input and output. They build intermediate features the output layer combines.", module: "neural-networks" },
  // Tokens
  { term: "token", def: "A chunk of text mapped to an integer ID.", module: "tokens" },
  { term: "context window", def: "Max number of tokens a model can read at once.", module: "tokens" },
  { term: "BPE", def: "Byte-Pair Encoding, which learns frequent subwords.", module: "tokens" },
  // Vocabulary
  { term: "vocab size", def: "Count of unique tokens the model recognizes.", module: "vocabulary" },
  { term: "OOV", def: "Out-of-vocabulary, meaning a word the tokenizer can't represent.", module: "vocabulary" },
  { term: "coverage", def: "% of corpus words representable by the vocab.", module: "vocabulary" },
  // Pre-training
  { term: "loss", def: "How wrong predictions are. Lower = better.", module: "pretraining" },
  { term: "parameters", def: "The learned numbers (weights) inside the model.", module: "pretraining" },
  // Fine-tuning
  { term: "learning rate", def: "How aggressively weights change per step. Too high = chaos; too low = stuck.", module: "finetuning" },
  { term: "overfitting", def: "Train loss falls, val loss rises. The model memorized your data.", module: "finetuning" },
  { term: "LoRA", def: "Low-Rank Adaptation. Trains < 1% of the params.", module: "finetuning" },
  // Embeddings & attention
  { term: "embedding", def: "A vector that captures meaning. Similar text → close vectors.", module: "embeddings" },
  { term: "cosine similarity", def: "How aligned two vectors are, from -1 (opposite) to 1 (same direction).", module: "embeddings" },
  { term: "self-attention", def: "Each token builds its new representation as a weighted mix of every other token.", module: "embeddings" },
  { term: "attention head", def: "One independent attention pattern. Models run many heads in parallel, each spotting different relations.", module: "embeddings" },
  { term: "softmax", def: "Turns raw scores into probabilities that sum to 1.", module: "embeddings" },
  // Transformer
  { term: "positional encoding", def: "A vector added to each token embedding so the model knows word order.", module: "transformer" },
  { term: "query, key, value", def: "Three projections of each token: the question it asks, the label it offers and the content it shares.", module: "transformer" },
  { term: "residual connection", def: "Adding a layer's input back to its output, so information and gradients flow through deep stacks.", module: "transformer" },
  { term: "layer norm", def: "Rescales each token vector to zero mean and unit variance to keep training stable.", module: "transformer" },
  { term: "MLP / feed-forward", def: "The per-token two-layer network inside each block that stores much of the model's knowledge.", module: "transformer" },
  { term: "unembedding", def: "The final matrix that turns a token's vector into one logit per vocabulary entry.", module: "transformer" },
  // Sampling
  { term: "logits", def: "Raw, unnormalized scores the model gives every token in the vocabulary.", module: "sampling" },
  { term: "temperature", def: "Sampling randomness. Low for facts, higher for brainstorming. 0 = greedy.", module: "sampling" },
  { term: "top-p (nucleus)", def: "Keep the smallest set of tokens whose probabilities add up to p, then sample from those.", module: "sampling" },
  { term: "top-k (sampling)", def: "Only the k most likely next tokens are allowed.", module: "sampling" },
  { term: "beam search", def: "Keeps several candidate continuations at once and picks the best overall sequence.", module: "sampling" },
  { term: "repetition penalty", def: "Lowers the odds of tokens that were already generated, to avoid loops.", module: "sampling" },
  // Context, KV cache, MoE
  { term: "KV cache", def: "Stored keys and values of earlier tokens, so each new token only computes its own.", module: "context" },
  { term: "grouped-query attention", def: "Several query heads share one key/value head, shrinking the KV cache (used by Llama 3).", module: "context" },
  { term: "lost in the middle", def: "Models recall facts at the start and end of a long context better than those in the middle.", module: "context" },
  { term: "mixture of experts", def: "Many expert MLPs per layer; a router sends each token to only a few, so compute stays low.", module: "context" },
  { term: "router / gate", def: "The small network in an MoE layer that scores experts for each token.", module: "context" },
  // Prompting
  { term: "role", def: "Who the model should act as. Sets tone, expertise, vocabulary.", module: "prompt-builder" },
  { term: "context", def: "Background facts, data, and constraints from your world.", module: "prompt-builder" },
  { term: "task", def: "The exact job to do, phrased as an instruction.", module: "prompt-builder" },
  { term: "format", def: "Shape of the output such as JSON, table, bullet list, essay.", module: "prompt-builder" },
  { term: "constraints", def: "What to avoid, length limits, safety rules, refusal policy.", module: "prompt-builder" },
  { term: "few-shot", def: "1 to 3 example input/output pairs the model can imitate.", module: "prompt-builder" },
  { term: "hallucination", def: "A confident answer that is not supported by the input or reality.", module: "prompt-training" },
  { term: "system prompt", def: "The instruction the model sees before every user turn. Great place for role and rules.", module: "prompt-training" },
  { term: "chain of thought", def: "Asking the model to think step by step before answering.", module: "prompt-training" },
  { term: "refusal policy", def: "Explicit rules for when to say 'I do not know' instead of guessing.", module: "prompt-training" },
  // RAG
  { term: "top-k (retrieval)", def: "How many retrieved chunks to send to the LLM.", module: "rag" },
  { term: "grounding", def: "Forcing answers to come from retrieved or pasted context, reducing hallucinations.", module: "rag" },
  // Orchestration
  { term: "tool / function call", def: "Structured output the LLM emits to trigger an external action.", module: "orchestration" },
  { term: "ReAct loop", def: "Reason → Act → Observe → repeat until the agent answers.", module: "orchestration" },
  { term: "guardrails", def: "Checks on inputs and outputs: hide personal data (PII), enforce the expected format, block unsafe content.", module: "orchestration" },
  // Agent loop
  { term: "agent loop", def: "Call the model, run any tool it asks for, append the result, repeat until it gives a final answer.", module: "agent-loop" },
  { term: "tool schema", def: "A JSON Schema describing a tool's name and arguments, sent to the model so it can call it correctly.", module: "agent-loop" },
  { term: "MCP", def: "Model Context Protocol: a standard JSON-RPC way for AI apps to discover and call tools and data sources.", module: "agent-loop" },
  { term: "max steps", def: "A hard cap on loop iterations so a confused agent cannot run (and spend) forever.", module: "agent-loop" },
  // Evals
  { term: "eval", def: "A repeatable test set plus a scoring rule that tells you if a change made the model better.", module: "evals" },
  { term: "LLM-as-judge", def: "Using a model with a written rubric to grade another model's answers.", module: "evals" },
  { term: "prompt injection", def: "Untrusted text (a web page, a document) that tries to override your instructions.", module: "evals" },
  { term: "quantization", def: "Storing weights with fewer bits (16 → 8 → 4) to cut memory, at a small quality cost.", module: "evals" },
  // Bio-AI
  { term: "k-mer", def: "A DNA substring of length k. Overlapping k-mers are a common way to tokenize genomes.", module: "bio-ai" },
  { term: "protein language model", def: "A model trained on millions of protein sequences, learning which residues fit where (e.g. ESM).", module: "bio-ai" },
  { term: "masked language modeling", def: "Hide a token and train the model to guess it from both sides. How BERT and ESM learn.", module: "bio-ai" },
  { term: "SMILES", def: "A line notation that writes a molecule as text, e.g. CCO for ethanol.", module: "bio-ai" },
  { term: "residue", def: "One amino acid inside a protein chain, written as a single letter such as A, K or W.", module: "bio-ai" },
];

export function termsFor(module: ModuleId): GlossaryTerm[] {
  return GLOSSARY.filter((t) => t.module === module);
}

/** Stable anchor id for a glossary term, used by /glossary and the command palette. */
export function slug(term: string) {
  return "term-" + term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
