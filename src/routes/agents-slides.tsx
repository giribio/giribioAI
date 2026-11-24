import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/agents-slides")({
  head: () => ({
    meta: [
      { title: "Agentic AI, RAG & MCPs Slides | GiriBioAI" },
      { name: "description", content: "Interactive slide deck covering Agentic AI, RAG, and MCPs." },
      { property: "og:title", content: "Agentic AI, RAG & MCPs Slides | GiriBioAI" },
      { property: "og:description", content: "Interactive slide deck covering Agentic AI, RAG, and MCPs." },
    ],
  }),
  component: AgentsSlidesPage,
});

function AgentsSlidesPage() {
  return (
    <div className="w-full h-[calc(100vh-4rem)] bg-background">
      <iframe
        src="/agents.html"
        title="Agentic AI, RAG & MCPs Slides"
        className="w-full h-full border-0"
      />
    </div>
  );
}