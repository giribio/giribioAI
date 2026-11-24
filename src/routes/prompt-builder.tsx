import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help } from "@/components/learn/ModulePage";

export const Route = createFileRoute("/prompt-builder")({
  head: () => ({
    meta: [
      { title: "Prompt Builder | GiriBioAI" },
      { name: "description", content: "Compose LLM prompts with role, context, task, format, and examples. See how each piece changes the answer." },
      { property: "og:title", content: "Prompt Builder | GiriBioAI" },
      { property: "og:description", content: "Assemble a strong prompt from role, context, task, format, and few-shot examples." },
    ],
  }),
  component: PromptBuilderPage,
});

const DEFAULTS = {
  role: "You are a senior data analyst who explains findings in plain English.",
  context: "Company: a small e-commerce shop selling handmade candles.\nAudience: the founder, non-technical.\nData window: last 30 days of Shopify orders.",
  task: "Summarize which product categories grew the most and suggest 2 next actions.",
  format: "Return a Markdown report with: 1) 3-bullet summary, 2) a table of top 5 categories with % growth, 3) 2 next actions.",
  constraints: "Use only the data provided. If a number is missing, say 'not available' instead of guessing. Keep it under 200 words.",
  examples: "Input: category=Soy Candles, orders_this_month=120, orders_last_month=80\nOutput bullet: Soy Candles grew 50% MoM (80 -> 120 orders).",
  userInput: "Here is the CSV: category,orders_this_month,orders_last_month\nSoy Candles,120,80\nGift Sets,45,50\nWax Melts,30,10",
};

function PromptBuilderPage() {
  const [role, setRole] = useState(DEFAULTS.role);
  const [context, setContext] = useState(DEFAULTS.context);
  const [task, setTask] = useState(DEFAULTS.task);
  const [format, setFormat] = useState(DEFAULTS.format);
  const [constraints, setConstraints] = useState(DEFAULTS.constraints);
  const [examples, setExamples] = useState(DEFAULTS.examples);
  const [userInput, setUserInput] = useState(DEFAULTS.userInput);

  const reset = () => {
    setRole(DEFAULTS.role); setContext(DEFAULTS.context); setTask(DEFAULTS.task);
    setFormat(DEFAULTS.format); setConstraints(DEFAULTS.constraints);
    setExamples(DEFAULTS.examples); setUserInput(DEFAULTS.userInput);
  };

  const composed = useMemo(() => {
    const parts: string[] = [];
    if (role.trim()) parts.push(`# Role\n${role.trim()}`);
    if (context.trim()) parts.push(`# Context\n${context.trim()}`);
    if (task.trim()) parts.push(`# Task\n${task.trim()}`);
    if (format.trim()) parts.push(`# Output format\n${format.trim()}`);
    if (constraints.trim()) parts.push(`# Constraints\n${constraints.trim()}`);
    if (examples.trim()) parts.push(`# Examples\n${examples.trim()}`);
    if (userInput.trim()) parts.push(`# User input\n${userInput.trim()}`);
    return parts.join("\n\n");
  }, [role, context, task, format, constraints, examples, userInput]);

  const stats = useMemo(() => {
    const chars = composed.length;
    const words = composed.trim() ? composed.trim().split(/\s+/).length : 0;
    const tokens = Math.max(1, Math.round(chars / 4));
    let score = 0;
    if (role.trim().length > 20) score += 20;
    if (context.trim().length > 30) score += 20;
    if (task.trim().length > 15) score += 20;
    if (format.trim().length > 10) score += 15;
    if (constraints.trim().length > 10) score += 10;
    if (examples.trim().length > 10) score += 15;
    return { chars, words, tokens, score };
  }, [composed, role, context, task, format, constraints, examples]);

  const copy = () => navigator.clipboard?.writeText(composed);

  return (
    <ModulePage
      moduleId="prompt-builder"
      title="Prompt Builder"
      intro="A strong prompt is not a question, it is a briefing. Fill in the pieces below and watch the composed prompt on the right. Each field maps to a proven pattern used in production LLM apps."
    >
      <Section title="The anatomy of a prompt" kicker="concept">
        <p>Think of an LLM as a very fast intern who has read the internet but has never met you or your company. Every prompt should tell it <em>who to be</em>, <em>what it knows</em>, <em>what you want done</em>, <em>how to reply</em>, and <em>what it must not do</em>. Missing pieces are the number one reason answers feel generic or wrong.</p>
      </Section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KeyTerm term="role" def="Who the model should act as. Sets tone, expertise, vocabulary." />
        <KeyTerm term="context" def="Background facts, data, and constraints from your world." />
        <KeyTerm term="task" def="The exact job to do, phrased as an instruction." />
        <KeyTerm term="format" def="Shape of the output such as JSON, table, bullet list, essay." />
        <KeyTerm term="constraints" def="What to avoid, length limits, safety rules, refusal policy." />
        <KeyTerm term="few-shot" def="1 to 3 example input/output pairs the model can imitate." />
      </div>

      <Lab title="Compose a prompt">
        <div className="flex justify-end mb-3">
          <button onClick={reset} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Reset to defaults</button>
        </div>
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <Field id="pb-role" label="Role" value={role} onChange={setRole} rows={2}
              help={<>Tells the model who to be. Changes tone and depth.<br /><span className="text-muted-foreground">Before: "help me with data". After: "You are a senior data analyst who explains findings in plain English."</span></>} />
            <Field id="pb-context" label="Context" value={context} onChange={setContext} rows={4}
              help={<>The facts of your world: company, audience, data window, constraints.<br /><span className="text-muted-foreground">Adding "audience: non-technical founder" makes the reply skip jargon.</span></>} />
            <Field id="pb-task" label="Task" value={task} onChange={setTask} rows={2}
              help={<>The single job. Prefer verbs like summarize, extract, classify, draft.<br /><span className="text-muted-foreground">Before: "look at this". After: "Summarize top 3 growing categories and suggest 2 next actions."</span></>} />
            <Field id="pb-format" label="Output format" value={format} onChange={setFormat} rows={2}
              help={<>Shape of the answer. Ask for JSON, tables, bullets. Machines and humans both parse better with structure.<br /><span className="text-muted-foreground">Adding "Return as Markdown table" removes rambling paragraphs.</span></>} />
            <Field id="pb-constraints" label="Constraints" value={constraints} onChange={setConstraints} rows={2}
              help={<>Rules and guardrails: length limits, refusal policy, do-not-guess.<br /><span className="text-muted-foreground">"If a number is missing, say 'not available' instead of guessing" cuts hallucinations.</span></>} />
            <Field id="pb-examples" label="Few-shot examples" value={examples} onChange={setExamples} rows={3}
              help={<>1 to 3 input/output pairs. The model imitates the shape.<br /><span className="text-muted-foreground">One good example often beats a paragraph of instructions.</span></>} />
            <Field id="pb-input" label="User input / data" value={userInput} onChange={setUserInput} rows={4}
              help={<>The actual thing to work on: pasted text, CSV, question, ticket.<br /><span className="text-muted-foreground">Keep the input separate from instructions so the model does not confuse them.</span></>} />
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-border bg-background">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">composed prompt</span>
                <button onClick={copy} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">Copy</button>
              </div>
              <pre className="p-3 text-xs font-mono whitespace-pre-wrap max-h-[520px] overflow-auto">{composed}</pre>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Characters" value={stats.chars} />
              <Stat label="Words" value={stats.words} />
              <Stat label="Approx. tokens" value={stats.tokens} help={<>Rough estimate at ~4 chars per token. Real tokenizers vary by model.</>} />
              <Stat label="Completeness" value={`${stats.score}%`} accent />
            </div>
            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              A "complete" prompt is not the longest one. Aim for every section filled with the minimum needed. Trim ruthlessly once your output looks right.
            </div>
          </div>
        </div>
      </Lab>

      <Section title="Bad, good, best" kicker="worked examples">
        <p>Same underlying question, three levels of craft. Copy any into the builder above and tweak.</p>
      </Section>

      <div className="space-y-4">
        <PromptExample
          level="bad"
          why="No role, no context, no format. The model has to guess who you are and what 'help' means."
          text={`help me with my emails`}
        />
        <PromptExample
          level="good"
          why="Role + task + format. Clear, but no examples and no guardrails, so tone may drift."
          text={`You are a helpful assistant. Rewrite the email below to sound professional and under 120 words. Return only the rewritten email.\n\nEmail: hey can u send the invoice asap thx`}
        />
        <PromptExample
          level="best"
          why="Role, context, task, format, constraints, and a few-shot example. The model has almost no room to go wrong."
          text={`# Role\nYou are an executive assistant writing on behalf of a busy founder.\n\n# Context\nRecipient: a vendor we work with weekly. Tone: warm, direct, no filler.\n\n# Task\nRewrite the draft email to be professional and clear.\n\n# Output format\nReturn only the rewritten email body. No subject line. Under 120 words.\n\n# Constraints\n- Do not invent facts.\n- Keep the original request intact.\n- Use British English.\n\n# Example\nDraft: "yo can u fix the login bug"\nRewrite: "Hi team, could you take a look at the login bug when you get a moment? Happy to jump on a quick call if useful. Thanks!"\n\n# Draft to rewrite\nhey can u send the invoice asap thx`}
        />
      </div>
    </ModulePage>
  );
}

function Field({ id, label, value, onChange, rows = 2, help }: {
  id: string; label: string; value: string; onChange: (v: string) => void; rows?: number; help?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
        {label}
        {help && <Help label={label}>{help}</Help>}
      </label>
      <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full font-mono text-sm rounded-md border border-input bg-background p-3 focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function Stat({ label, value, accent, help }: { label: string; value: string | number; accent?: boolean; help?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider inline-flex items-center">
        {label}{help && <Help label={label}>{help}</Help>}
      </div>
      <div className={`text-2xl font-semibold mt-1 ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function PromptExample({ level, why, text }: { level: "bad" | "good" | "best"; why: string; text: string }) {
  const styles = {
    bad: { border: "border-border", tag: "bg-secondary text-muted-foreground", label: "Bad" },
    good: { border: "border-warning/50", tag: "bg-warning/15 text-warning", label: "Good" },
    best: { border: "border-success/50", tag: "bg-success/10 text-success", label: "Best" },
  }[level];
  return (
    <div className={`rounded-lg border ${styles.border} bg-card overflow-hidden`}>
      <div className="px-4 py-2 flex items-center gap-3 border-b border-border">
        <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded ${styles.tag}`}>{styles.label}</span>
        <span className="text-sm text-muted-foreground">{why}</span>
      </div>
      <pre className="p-4 text-xs font-mono whitespace-pre-wrap">{text}</pre>
    </div>
  );
}