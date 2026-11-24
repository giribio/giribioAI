import type { ModuleId } from "./curriculum";

/**
 * Beginner signposting for each guided module: a time estimate and 3 "by the
 * end you can…" goals. ModulePage shows the goals at the top, then again at the
 * bottom as a self-check before "Mark as complete".
 */
export type ModuleGuide = { minutes: number; goals: string[]; tryFirst: string };

export const GUIDE: Partial<Record<ModuleId, ModuleGuide>> = {
  "neural-networks": {
    minutes: 15,
    goals: [
      "Explain what a neuron's weights, bias and activation do",
      "Say why one neuron can only draw a straight line",
      "Describe how gradient descent lowers the loss step by step",
    ],
    tryFirst: "Drag weight 1 below zero and watch the colored boundary flip.",
  },
  tokens: {
    minutes: 10,
    goals: [
      "Explain what a token is and why models need them",
      "Compare character, word and subword (BPE) tokenizers",
      "Predict why emoji, code and other languages cost more tokens",
    ],
    tryFirst: "Switch to GPT-4o mode and type your name in two languages.",
  },
  vocabulary: {
    minutes: 8,
    goals: [
      "Define vocabulary size, coverage and out-of-vocabulary words",
      "Explain the trade-off between a small and a large vocabulary",
      "Say why subword vocabularies rarely hit unknown words",
    ],
    tryFirst: "Move the vocab size slider down and watch coverage fall.",
  },
  embeddings: {
    minutes: 15,
    goals: [
      "Explain how embeddings turn meaning into distance and direction",
      "Use cosine similarity and the king − man + woman example",
      "Describe what one attention head does for a token like 'it'",
    ],
    tryFirst: "Click two dots on the map, then try a vector arithmetic button.",
  },
  transformer: {
    minutes: 20,
    goals: [
      "Name the steps inside one transformer block, in order",
      "Explain queries, keys, values and the causal mask",
      "Say what residual connections and the MLP add",
    ],
    tryFirst: "Press 'Next step' seven times, reading one sentence per step.",
  },
  pretraining: {
    minutes: 12,
    goals: [
      "State the next-token prediction objective",
      "Explain loss as 'how surprised the model was'",
      "Generate text from a tiny bigram model and see its limits",
    ],
    tryFirst: "Press Sample a few times, then change the training text.",
  },
  sampling: {
    minutes: 12,
    goals: [
      "Explain logits and how softmax turns them into probabilities",
      "Predict the effect of temperature, top-k and top-p",
      "Say when greedy, sampling or beam search fits best",
    ],
    tryFirst: "Click the 'greedy' preset, sample 10 times, then try 'wild'.",
  },
  context: {
    minutes: 15,
    goals: [
      "Explain why chatbots forget early messages",
      "Estimate KV cache memory and say why it speeds generation",
      "Describe how Mixture-of-Experts routes each token",
    ],
    tryFirst: "Slide the context window up until the bot remembers the project code.",
  },
  finetuning: {
    minutes: 12,
    goals: [
      "Compare full fine-tuning, LoRA and RLHF/DPO",
      "Spot overfitting from train and validation loss curves",
      "Pick a learning rate that is neither chaotic nor stuck",
    ],
    tryFirst: "Set dataset size very small and learning rate high, then Re-run.",
  },
  "prompt-builder": {
    minutes: 10,
    goals: [
      "List the parts of a strong prompt: role, context, task, format, constraints",
      "Turn a vague request into a clear briefing",
      "Use few-shot examples to show the format you want",
    ],
    tryFirst: "Fill only the Task field first, then add the others one by one.",
  },
  "prompt-training": {
    minutes: 15,
    goals: [
      "Apply seven habits that make prompts reliable",
      "Recognise bad, good and best versions of a prompt",
      "Reduce hallucinations with grounding and a refusal policy",
    ],
    tryFirst: "Open any lesson, compare Bad vs Best, then take the quiz.",
  },
  rag: {
    minutes: 12,
    goals: [
      "Name the four RAG steps: chunk, embed, retrieve, generate",
      "Explain how top-k changes what the model sees",
      "Say why grounding reduces hallucinations",
    ],
    tryFirst: "Add your own one-line fact to the knowledge base, then ask about it.",
  },
  orchestration: {
    minutes: 8,
    goals: [
      "Name the parts of an LLM app: router, tools, retriever, memory",
      "Compose a flow that matches a type of question",
      "Explain why guardrails sit around the model",
    ],
    tryFirst: "Pick the 'Math agent' preset and press Run agent.",
  },
  "agent-loop": {
    minutes: 15,
    goals: [
      "Explain the agent loop: think, call a tool, read the result, repeat",
      "Read a tool call and an MCP message",
      "Say why input tokens grow each turn and why max steps matters",
    ],
    tryFirst: "Choose 'Tool error and retry' and press Step until it finishes.",
  },
  evals: {
    minutes: 20,
    goals: [
      "Check an answer against its source for unsupported claims",
      "Explain LLM-as-judge and its position and length biases",
      "Describe prompt injection and three defenses; size a quantized model",
    ],
    tryFirst: "In the injection lab, tick the defenses one at a time.",
  },
  "bio-ai": {
    minutes: 20,
    goals: [
      "Tokenize DNA into k-mers and codons",
      "Explain masked prediction in protein language models",
      "Read a SMILES string and name its token types",
    ],
    tryFirst: "Keep k = 3 and read the amino acid letters under each codon.",
  },
};

export const totalMinutes = Object.values(GUIDE).reduce((s, g) => s + (g?.minutes ?? 0), 0);
