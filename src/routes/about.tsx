import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, KeyRound, Lock, Sparkles, Bot, Dna } from "lucide-react";
import { TRACKS, modulesInTrack } from "@/lib/curriculum";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About | GiriBioAI" },
      { name: "description", content: "About GiriBioAI, an in-browser lab for learning AI, LLMs and Bio-AI. Developed by Girinath G Pillai with AI assistance." },
      { property: "og:title", content: "About | GiriBioAI" },
    ],
  }),
  component: AboutPage,
});

const PRINCIPLES = [
  { icon: Cpu, title: "No GPU required", body: "Every simulator runs as plain JavaScript in your browser. Toy models are small on purpose so the ideas stay visible.", color: "text-g-blue" },
  { icon: KeyRound, title: "No API keys", body: "Nothing calls a paid model. The labs are deterministic simulations, so they are free, fast and work offline once loaded.", color: "text-g-green" },
  { icon: Lock, title: "Private by default", body: "Your theme and progress are stored only in this browser's local storage. Nothing is sent to a server.", color: "text-g-yellow" },
  { icon: Sparkles, title: "Learn by playing", body: "Every concept comes with a live lab: change a knob, see the effect. Short concept notes and help tooltips explain why.", color: "text-g-cyan" },
];

function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="font-mono text-xs text-primary uppercase tracking-wider">/ about</p>
      <h1 className="text-4xl md:text-5xl font-bold mt-2 tracking-tight">
        About Giri<span className="text-g-green">Bio</span><span className="text-primary">AI</span>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-3xl">
        GiriBioAI is a hands-on lab for anyone who wants to understand how modern AI and large language models work,
        from the first token to agents, evaluation and the use of language models on DNA, proteins and molecules.
      </p>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:items-center">
        <div className="h-16 w-16 shrink-0 rounded-2xl grid place-items-center text-2xl font-bold text-primary-foreground bg-primary shadow-[var(--shadow-glow)]">GP</div>
        <div>
          <p className="font-mono text-xs text-success uppercase tracking-wider">developer</p>
          <h2 className="text-2xl font-semibold mt-1">Developed by Girinath G Pillai</h2>
          <p className="text-muted-foreground mt-2 flex items-start gap-2">
            <Bot className="h-4 w-4 mt-1 shrink-0 text-primary" />
            Designed and built with AI assistance: AI coding assistants helped write the simulators, content and interface,
            with every module reviewed and shaped by the developer.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Principles</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PRINCIPLES.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className={`h-6 w-6 ${color}`} />
              <h3 className="font-semibold mt-3">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">What's inside</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {TRACKS.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${t.dot}`} />
                <h3 className="font-semibold">{t.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{t.blurb}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {modulesInTrack(t.id).map((m) => (
                  <li key={m.id}>
                    <Link to={m.to} className="text-xs font-mono px-2 py-1 rounded-full border border-border hover:bg-secondary hover:text-primary">{m.short}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-secondary/40 p-6">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Dna className="h-5 w-5 text-g-yellow" /> Why "Bio"?</h2>
        <p className="text-muted-foreground mt-2">
          The same machinery that reads English also reads the language of life. DNA, proteins and molecules can be written as
          text and tokenized, so the Bio-AI track shows how LLM ideas carry over to biology and drug discovery.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Built with</h2>
        <p className="text-sm text-muted-foreground mt-2">
          React 19, TanStack Start and Router, Tailwind CSS v4, Radix UI / shadcn components, Recharts and Lucide icons.
          Colours follow the Google palette, with red kept for genuine errors.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Simulations are simplified for teaching. Numbers such as prices, speeds and memory are illustrative estimates, not benchmarks.
        </p>
      </section>
    </div>
  );
}
