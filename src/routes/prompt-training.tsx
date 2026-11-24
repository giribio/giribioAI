import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm } from "@/components/learn/ModulePage";

export const Route = createFileRoute("/prompt-training")({
  head: () => ({
    meta: [
      { title: "Prompt Training for Beginners | GiriBioAI" },
      { name: "description", content: "Learn to prompt LLMs effectively. Roles, context, format, few-shot, and a quiz with bad, good, best examples." },
      { property: "og:title", content: "Prompt Training for Beginners | GiriBioAI" },
      { property: "og:description", content: "Beginner lessons on prompting, with quiz and worked examples." },
    ],
  }),
  component: PromptTrainingPage,
});

type Lesson = {
  id: string;
  title: string;
  idea: string;
  detail: string;
  bad: string;
  good: string;
  best: string;
  takeaway: string;
};

const LESSONS: Lesson[] = [
  {
    id: "role",
    title: "1. Give the model a role",
    idea: "A role sets tone, vocabulary, and depth. Without one, you get a bland average of the internet.",
    detail: "Roles are not magic spells. They are shortcuts that bias the model's next-word probabilities toward a domain. 'You are a kindergarten teacher' picks simpler words. 'You are a senior tax lawyer' pulls in statutes and caveats.",
    bad: "Explain compound interest.",
    good: "You are a math tutor. Explain compound interest.",
    best: "You are a patient math tutor for a 12-year-old. Explain compound interest with one relatable analogy, then a 3-line worked example using $100 at 5% for 3 years.",
    takeaway: "Name the persona and the audience. Both change the answer.",
  },
  {
    id: "context",
    title: "2. Load the context",
    idea: "The model does not know your world. Paste the facts it needs, do not assume it can guess.",
    detail: "Context is anything that is true today but was not in the training data: your codebase, this week's sales, the customer's name, the policy PDF. Retrieval augmented generation (RAG) is just automated context loading.",
    bad: "Is our refund policy okay for this case?",
    good: "Our refund policy: full refund within 14 days. The customer bought 20 days ago. Is a refund appropriate?",
    best: "Policy: 'Full refund within 14 days; store credit within 30 days; no refunds after 30 days.'\nCustomer: bought on Day 20, product is unopened, first-time buyer.\nQuestion: Which option applies and how should we phrase the reply?",
    takeaway: "Facts on the page beat facts in your head. Always paste the source of truth.",
  },
  {
    id: "task",
    title: "3. Say the task as a verb",
    idea: "Vague verbs get vague output. Pick summarize, extract, classify, rewrite, translate, critique, draft.",
    detail: "The task is the single most important sentence. If a colleague could not do the job from that one line, the model cannot either. Split multi-step jobs into sequential prompts or numbered subtasks.",
    bad: "Do something with this meeting transcript.",
    good: "Summarize this transcript.",
    best: "From this transcript, extract: 1) decisions made, 2) action items with owner and due date, 3) unresolved questions. Return as three bulleted lists.",
    takeaway: "One clear verb, one clear deliverable. Split, do not stuff.",
  },
  {
    id: "format",
    title: "4. Pin the output format",
    idea: "If you will parse it, ask for JSON. If a human reads it, ask for structure.",
    detail: "Models drift toward prose. Explicit format instructions ('Return only valid JSON matching this schema…') dramatically reduce follow-up cleanup and API errors.",
    bad: "Give me the details of this invoice.",
    good: "Give me the invoice details as a Markdown table.",
    best: "Return ONLY a JSON object with keys: invoice_number (string), date (YYYY-MM-DD), total_usd (number), line_items (array of {name, qty, price}). No prose.",
    takeaway: "Show the shape. Better yet, show a filled example.",
  },
  {
    id: "constraints",
    title: "5. Add guardrails",
    idea: "Tell the model what NOT to do. 'Do not guess' is worth its weight in gold.",
    detail: "Constraints reduce hallucinations, control length, and enforce safety. Common ones: 'Use only the sources provided', 'If unsure, reply I do not know', 'Under 100 words', 'British English', 'No emojis'.",
    bad: "Write a bio for our website.",
    good: "Write a 100-word bio for our website in a friendly tone.",
    best: "Write a bio for our website. Rules: exactly 80 to 100 words; friendly but professional; British English; only use facts from the notes below; if a fact is missing, leave a [TODO] placeholder rather than invent.",
    takeaway: "Every guardrail you skip is a bug you will find in review.",
  },
  {
    id: "fewshot",
    title: "6. Show, do not tell (few-shot)",
    idea: "One or two examples of input -> desired output often beat a paragraph of rules.",
    detail: "Models are excellent pattern matchers. If the format is tricky (a niche JSON schema, a specific tone, a translation style), demonstrate with 1 to 3 examples then present the real input.",
    bad: "Classify these tickets as urgent, normal, or low.",
    good: "Classify each ticket as urgent, normal, or low. Reply with just the label.",
    best: "Classify each ticket. Reply with only the label.\n\nExample 1\nTicket: 'Site is down, no one can log in.'\nLabel: urgent\n\nExample 2\nTicket: 'Typo on the pricing page.'\nLabel: low\n\nNow classify:\nTicket: 'Checkout button broken on mobile only.'\nLabel:",
    takeaway: "Two examples usually beat two paragraphs of instructions.",
  },
  {
    id: "iterate",
    title: "7. Iterate, do not restart",
    idea: "Bad first answer? Do not rewrite the whole prompt. Reply with a targeted correction.",
    detail: "Treat the conversation like pair-programming. 'Good, but shorten section 2 and drop the bullet on pricing' is faster than a whole new prompt. Save the winning prompt in a doc for next time.",
    bad: "(after a weak answer) Try again.",
    good: "That was too long. Redo in 100 words.",
    best: "Keep the structure. Cut section 2 by half, remove the pricing bullet, and add one concrete example in section 3.",
    takeaway: "Specific feedback beats 'try again' every time.",
  },
];

const QUIZ = [
  {
    q: "You want the model to reply in strict JSON. What matters most?",
    options: [
      { label: "A polite tone in the request", correct: false, why: "Politeness does not force structure." },
      { label: "An explicit schema and 'reply only with JSON'", correct: true, why: "Explicit format + a schema example is the single biggest lever for parseable output." },
      { label: "A longer role description", correct: false, why: "Roles change tone, not structure." },
    ],
  },
  {
    q: "The answer keeps making up facts. Best first fix?",
    options: [
      { label: "Ask it to 'be accurate'", correct: false, why: "The model already thinks it is being accurate." },
      { label: "Paste the source and add 'use only the text above; if missing, say not available'", correct: true, why: "Grounding + refusal policy directly reduces hallucinations." },
      { label: "Use a bigger model", correct: false, why: "Helpful sometimes, but bigger models still hallucinate without grounding." },
    ],
  },
  {
    q: "The output is close but too long. What do you send next?",
    options: [
      { label: "'Try again'", correct: false, why: "Vague. You will get another random-length answer." },
      { label: "A new prompt from scratch", correct: false, why: "Wastes the good parts you already have." },
      { label: "'Keep the structure, cut section 2 in half, remove the pricing bullet'", correct: true, why: "Targeted diff-style feedback preserves what worked." },
    ],
  },
];

function PromptTrainingPage() {
  return (
    <ModulePage
      moduleId="prompt-training"
      title="Prompt Training for Beginners"
      intro="Seven short lessons that turn a beginner into someone who reliably gets useful answers from an LLM. Each lesson has a bad, good, and best version of the same prompt, plus a takeaway you can steal today."
    >
      <Section title="The mental model" kicker="start here">
        <p>An LLM is not a database and not a search engine. It is a next-word predictor with a huge memory of patterns. Your prompt is a stage: set the scene (role and context), give the actor a line (task), tell them the shape of the scene (format), and mark the exits (constraints). Do that and the performance is almost always usable.</p>
      </Section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <KeyTerm term="grounding" def="Pasting the source text so the model answers from it, not from memory." />
        <KeyTerm term="hallucination" def="A confident answer that is not supported by the input or reality." />
        <KeyTerm term="temperature" def="How random the output is. Low for facts, higher for brainstorming." />
        <KeyTerm term="system prompt" def="The instruction the model sees before every user turn. Great place for role and rules." />
        <KeyTerm term="chain of thought" def="Asking the model to think step by step before answering." />
        <KeyTerm term="refusal policy" def="Explicit rules for when to say 'I do not know' instead of guessing." />
      </div>

      <div className="space-y-6">
        {LESSONS.map((l) => (
          <LessonCard key={l.id} lesson={l} />
        ))}
      </div>

      <Lab title="Quick quiz">
        <div className="space-y-6">
          {QUIZ.map((q, i) => (
            <QuizItem key={i} index={i + 1} q={q.q} options={q.options} />
          ))}
        </div>
      </Lab>

      <Section title="Cheat sheet" kicker="print this">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>R</strong>ole: who is speaking</li>
          <li><strong>C</strong>ontext: facts from your world</li>
          <li><strong>T</strong>ask: one clear verb</li>
          <li><strong>F</strong>ormat: JSON, table, bullets, length</li>
          <li><strong>C</strong>onstraints: what to avoid, refusal rule</li>
          <li><strong>E</strong>xamples: 1 to 3 few-shot pairs</li>
          <li><strong>I</strong>terate: send targeted diffs, not new prompts</li>
        </ul>
      </Section>
    </ModulePage>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-lg font-semibold">{lesson.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{lesson.idea}</p>
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">{lesson.detail}</p>
        <div className="grid md:grid-cols-3 gap-3">
          <Example level="bad" text={lesson.bad} />
          <Example level="good" text={lesson.good} />
          <Example level="best" text={lesson.best} />
        </div>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-mono px-2 py-1 rounded border border-border hover:bg-secondary">
          {open ? "Hide takeaway" : "Show takeaway"}
        </button>
        {open && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
            <span className="font-mono text-xs text-primary uppercase tracking-wider">Takeaway · </span>
            {lesson.takeaway}
          </div>
        )}
      </div>
    </div>
  );
}

function Example({ level, text }: { level: "bad" | "good" | "best"; text: string }) {
  const styles = {
    bad: { border: "border-border", tag: "bg-secondary text-muted-foreground", label: "Bad" },
    good: { border: "border-warning/50", tag: "bg-warning/15 text-warning", label: "Good" },
    best: { border: "border-success/50", tag: "bg-success/10 text-success", label: "Best" },
  }[level];
  return (
    <div className={`rounded-md border ${styles.border} bg-background overflow-hidden flex flex-col`}>
      <div className="px-3 py-1.5 border-b border-border">
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${styles.tag}`}>{styles.label}</span>
      </div>
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap flex-1">{text}</pre>
    </div>
  );
}

function QuizItem({ index, q, options }: {
  index: number; q: string;
  options: { label: string; correct: boolean; why: string }[];
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = useMemo(() => (picked == null ? null : options[picked]), [picked, options]);
  return (
    <div>
      <div className="font-medium mb-2">Q{index}. {q}</div>
      <div className="space-y-2">
        {options.map((o, i) => {
          const isPicked = picked === i;
          const state = picked == null ? "" : o.correct ? "border-success/60 bg-success/10" : isPicked ? "border-warning/60 bg-warning/10" : "opacity-60";
          return (
            <button
              key={i}
              onClick={() => setPicked(i)}
              disabled={picked != null}
              className={`w-full text-left rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary/50 transition ${state}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className={`mt-2 text-xs rounded-md p-2 ${chosen.correct ? "text-success" : "text-warning"}`}>
          {chosen.correct ? "Correct · " : "Not quite · "}{chosen.why}
        </div>
      )}
    </div>
  );
}