
# Local LLM Setup Simulator

Add a new route `/local-llm-sim` that walks users through setting up a local LLM as an interactive, step-by-step simulator. Each step shows realistic config, generated commands/code, and live "compatibility" feedback (VRAM fit, OS notes, etc.). Linked from the root nav.

## Steps in the wizard

1. **Choose GPU** — cards for **A100 80GB**, **H100 80GB**, **RTX 5090 32GB**, **RTX 5060 8GB**. Each shows VRAM, FP16 TFLOPs, rough $/hr or MSRP, and a "good for" blurb.
2. **Choose OS** — **Windows**, **Linux (Ubuntu)**, **macOS (Apple Silicon)**. Drives the install commands shown later (winget / apt / brew) and notes (e.g. macOS → llama.cpp / MLX, no CUDA).
3. **Choose Model** — grouped small vs large:
   - Small: Llama 3.2 3B, Phi-3 Mini 3.8B, Qwen2.5 7B, Mistral 7B
   - Large: Llama 3.1 70B, Qwen2.5 72B, Mixtral 8x22B, Llama 3.1 405B
   Each shows params, quantization options (Q4_K_M / Q8 / FP16), estimated VRAM. A **fit badge** computes "fits / tight / needs offload / won't fit" against the chosen GPU.
4. **Choose Runtime** — Ollama, llama.cpp, vLLM, LM Studio. Filtered by OS (vLLM hidden on macOS/Windows-native, etc.).
5. **Install & Run** — generates copy-paste commands for the chosen OS + runtime + model (e.g. `ollama pull llama3.1:70b-instruct-q4_K_M` then `ollama run ...`).
6. **API Keys & Local Endpoint** — explains that local runtimes expose an OpenAI-compatible endpoint (`http://localhost:11434/v1` for Ollama). Shows how to set a dummy `OPENAI_API_KEY`, and how to also wire a real provider key (OpenAI/Anthropic) as fallback via `.env`. Includes curl + Python + JS examples calling the local endpoint.
7. **MCP Integration** — explains MCP in one paragraph (host ↔ client ↔ server). Shows:
   - Sample `mcp.json` / Claude Desktop config registering a local server
   - A minimal Node MCP server snippet (`@modelcontextprotocol/sdk`) exposing one tool
   - Commands to run the server and connect from the local LLM runtime/client
   - Diagram (ASCII) of LLM client → MCP server → tool/data source

## UI / Layout

- Top: stepper showing 1–7 with current step highlighted, click to jump.
- Left: option cards / selectors for current step.
- Right: **live summary panel** persisting all choices, plus a **generated artifact** box that updates per step (commands, config JSON, code).
- Sticky "Compatibility" chip (e.g. "Llama 70B Q4 on RTX 5060 8GB — won't fit, needs CPU offload").
- Copy-to-clipboard buttons on every code block.

## Technical notes

- New file: `src/routes/local-llm-sim.tsx` using `createFileRoute("/local-llm-sim")` with `head()` meta.
- Pure client-side state (`useState`) — no backend, no Cloud needed.
- Static data tables for GPUs, OSes, models, runtimes inlined as typed consts.
- Reuse existing Tailwind tokens / card styling from `chat-sim.tsx` for visual consistency.
- Add nav link in `src/routes/__root.tsx` next to the existing Chat Sim link.
- No long dashes in copy (per existing project rule).
