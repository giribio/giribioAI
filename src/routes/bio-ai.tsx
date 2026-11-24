import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModulePage, Section, Lab, KeyTerm, Help, ResetButton } from "@/components/learn/ModulePage";
import { termsFor } from "@/lib/glossary";
import { useShareState } from "@/lib/shareState";

export const Route = createFileRoute("/bio-ai")({
  head: () => ({
    meta: [
      { title: "Bio-AI with LLMs | GiriBioAI" },
      { name: "description", content: "Language models for biology: tokenize DNA into k-mers and codons, color protein residues, split SMILES molecules and try a toy protein language model." },
      { property: "og:title", content: "Bio-AI with LLMs | GiriBioAI" },
      { property: "og:description", content: "DNA, protein and SMILES tokenizers plus a masked residue predictor, all in your browser." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          headline: "Bio-AI with LLMs",
          description: "How LLM ideas apply to DNA, proteins and molecules.",
          inLanguage: "en",
          isPartOf: { "@type": "Course", name: "GiriBioAI curriculum" },
          author: { "@type": "Person", name: "Girinath G Pillai" },
          url: "https://llm.giribio.in/bio-ai",
        }),
      },
    ],
  }),
  component: BioAIPage,
});

// ----------------------------- DNA ---------------------------------------
const DEFAULT_DNA = "ATGGCCCTGTGGATGCGCCTCCTGCCCCTGCTGGCGCTGCTGGCCCTCTGGGGACCTGACCCAGCCGCAGCC";
const BASES = "TCAG";
const AA_TABLE = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
function translateCodon(c: string) {
  if (c.length !== 3 || /[^TCAG]/.test(c)) return "?";
  return AA_TABLE[BASES.indexOf(c[0]) * 16 + BASES.indexOf(c[1]) * 4 + BASES.indexOf(c[2])];
}
const BASE_CLASS: Record<string, string> = {
  A: "bg-chart-1/25", C: "bg-chart-2/25", G: "bg-chart-3/30", T: "bg-chart-4/25",
};

function kmers(seq: string, k: number, overlap: boolean) {
  const out: string[] = [];
  const step = overlap ? 1 : k;
  for (let i = 0; i + k <= seq.length; i += step) out.push(seq.slice(i, i + k));
  return out;
}

// ----------------------------- Protein -----------------------------------
const DEFAULT_PROTEIN = "FVNQHLCGSHLVEALYLVCGERGFFYTPKT"; // human insulin B chain
type ResClass = "hydrophobic" | "polar" | "positive" | "negative" | "special";
const RES_CLASS: Record<string, ResClass> = {
  A: "hydrophobic", V: "hydrophobic", I: "hydrophobic", L: "hydrophobic", M: "hydrophobic", F: "hydrophobic", W: "hydrophobic", C: "hydrophobic",
  S: "polar", T: "polar", N: "polar", Q: "polar", Y: "polar",
  K: "positive", R: "positive", H: "positive",
  D: "negative", E: "negative",
  G: "special", P: "special",
};
const CLASS_STYLE: Record<ResClass, { bg: string; dot: string; label: string }> = {
  hydrophobic: { bg: "bg-chart-1/25 text-foreground", dot: "bg-chart-1", label: "hydrophobic" },
  polar: { bg: "bg-chart-2/25 text-foreground", dot: "bg-chart-2", label: "polar" },
  positive: { bg: "bg-chart-4/30 text-foreground", dot: "bg-chart-4", label: "+ charged" },
  negative: { bg: "bg-chart-3/35 text-foreground", dot: "bg-chart-3", label: "− charged" },
  special: { bg: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground", label: "G / P (special)" },
};
const AMINO = Object.keys(RES_CLASS);

/** Toy masked-LM: favours the same residue's class and the neighbours' class. */
function maskedPrediction(seq: string, idx: number) {
  const truth = seq[idx];
  const tc = RES_CLASS[truth];
  const neighbours = [seq[idx - 2], seq[idx - 1], seq[idx + 1], seq[idx + 2]].filter(Boolean).map((r) => RES_CLASS[r]);
  const scores = AMINO.map((a) => {
    let s = 0;
    if (RES_CLASS[a] === tc) s += 2.2;          // learned: similar chemistry is tolerated
    if (a === truth) s += 1.6;                   // learned: the observed residue is common here
    s += neighbours.filter((n) => n === RES_CLASS[a]).length * 0.35; // local context
    if ((a === "C" || a === "W") && a !== truth) s -= 0.8; // rare residues
    return { a, s };
  });
  const max = Math.max(...scores.map((x) => x.s));
  const exps = scores.map((x) => ({ a: x.a, e: Math.exp(x.s - max) }));
  const sum = exps.reduce((t, x) => t + x.e, 0);
  return exps.map((x) => ({ a: x.a, p: x.e / sum })).sort((p, q) => q.p - p.p);
}

// ----------------------------- SMILES ------------------------------------
const SMILES_RE = /(\[[^\]]+\]|Br|Cl|N|O|S|P|F|I|B|C|b|c|n|o|s|p|\(|\)|\.|=|#|-|\+|\\|\/|:|~|@|\?|>|\*|\$|%[0-9]{2}|[0-9])/g;
type SmiKind = "atom" | "aromatic" | "bond" | "branch" | "ring" | "bracket" | "other";
function smilesKind(t: string): SmiKind {
  if (t.startsWith("[")) return "bracket";
  if (/^(Br|Cl|[BCNOSPFI])$/.test(t)) return "atom";
  if (/^[bcnosp]$/.test(t)) return "aromatic";
  if (/^[=#\-:~/\\]$/.test(t)) return "bond";
  if (t === "(" || t === ")") return "branch";
  if (/^(%\d\d|\d)$/.test(t)) return "ring";
  return "other";
}
const SMI_STYLE: Record<SmiKind, string> = {
  atom: "bg-chart-1/25",
  aromatic: "bg-chart-4/30",
  bond: "bg-chart-3/35",
  branch: "bg-secondary text-muted-foreground",
  ring: "bg-chart-2/25",
  bracket: "bg-accent text-accent-foreground",
  other: "bg-secondary",
};
const MOLECULES = [
  { name: "Aspirin", smi: "CC(=O)OC1=CC=CC=C1C(=O)O" },
  { name: "Caffeine", smi: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
  { name: "Ibuprofen", smi: "CC(C)CC1=CC=C(C=C1)C(C)C(=O)O" },
  { name: "Paracetamol (aromatic)", smi: "CC(=O)Nc1ccc(O)cc1" },
  { name: "Ethanol", smi: "CCO" },
];

function BioAIPage() {
  // DNA
  const [dnaS, setDnaS, resetDnaS] = useShareState("dna", { seq: DEFAULT_DNA, k: 3, overlap: false });
  const { seq: dna, k, overlap } = dnaS;
  const setDna = (v: string) => setDnaS({ seq: v });
  const setK = (v: number) => setDnaS({ k: v });
  const setOverlap = (v: boolean) => setDnaS({ overlap: v });
  const cleanDna = dna.toUpperCase().replace(/\s+/g, "");
  const invalid = (cleanDna.match(/[^ACGT]/g) ?? []).length;
  const dnaToks = useMemo(() => kmers(cleanDna, k, overlap), [cleanDna, k, overlap]);
  const gc = cleanDna.length ? ((cleanDna.match(/[GC]/g) ?? []).length / cleanDna.length) * 100 : 0;
  const resetDna = resetDnaS;

  // Protein
  const [protein, setProtein] = useState(DEFAULT_PROTEIN);
  const [maskIdx, setMaskIdx] = useState(11);
  const cleanProt = protein.toUpperCase().replace(/[^A-Z]/g, "").split("").filter((c) => RES_CLASS[c]).join("");
  const safeMask = Math.min(maskIdx, Math.max(0, cleanProt.length - 1));
  const preds = useMemo(() => (cleanProt.length ? maskedPrediction(cleanProt, safeMask) : []), [cleanProt, safeMask]);
  const comp = useMemo(() => {
    const c: Record<ResClass, number> = { hydrophobic: 0, polar: 0, positive: 0, negative: 0, special: 0 };
    for (const r of cleanProt) c[RES_CLASS[r]]++;
    return c;
  }, [cleanProt]);
  const truthRank = preds.findIndex((p) => p.a === cleanProt[safeMask]) + 1;
  const resetProt = () => { setProtein(DEFAULT_PROTEIN); setMaskIdx(11); };

  // SMILES
  const [smiS, setSmiS, resetSmiS] = useShareState("smiles", { smi: MOLECULES[0].smi });
  const smi = smiS.smi;
  const setSmi = (v: string) => setSmiS({ smi: v });
  const smiToks = useMemo(() => smi.match(SMILES_RE) ?? [], [smi]);
  const leftover = smi.length - smiToks.join("").length;
  const heavyAtoms = smiToks.filter((t) => ["atom", "aromatic", "bracket"].includes(smilesKind(t))).length;
  const resetSmi = resetSmiS;

  return (
    <ModulePage
      moduleId="bio-ai"
      title="Bio-AI with LLMs"
      intro="Life is written in text. DNA is a string over four letters, proteins are strings over twenty, and molecules can be written as SMILES. Once something is text, everything you learned about tokens, embeddings and attention applies, which is why language models now help read genomes, design proteins and screen drugs."
    >
      <Section title="Same machinery, new alphabets" kicker="concept">
        <p>The big question is again <span className="font-mono text-foreground">tokenization</span>. English has natural word boundaries; DNA does not. Genomic models chop sequences into <span className="font-mono text-foreground">k-mers</span> (DNABERT), learn BPE merges over bases, or read one base at a time with very long context (HyenaDNA, Evo). Protein models such as <span className="font-mono text-foreground">ESM</span> and ProtBERT usually use one token per amino acid.</p>
      </Section>

      <div className="grid sm:grid-cols-3 gap-3">
        {termsFor("bio-ai").slice(0, 3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>

      {/* DNA lab */}
      <Lab title="DNA k-mer tokenizer">
        <ResetButton onClick={resetDna} share />
        <label htmlFor="dna-input" className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          DNA sequence (A, C, G, T)
          <Help label="DNA">The default is the start of the human insulin gene coding sequence. Paste any sequence; spaces are ignored.</Help>
        </label>
        <textarea id="dna-input" value={dna} onChange={(e) => setDna(e.target.value)} rows={2} className="w-full font-mono text-sm rounded-md border border-input bg-background p-3 mb-3 break-all" />
        <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono mb-4">
          <label className="block">
            <span className="inline-flex items-center">k = <span className="text-primary ml-1">{k}</span>
              <Help label="k">Length of each chunk. The vocabulary is every possible k-mer: 4^k. Larger k means fewer, more specific tokens but a vocabulary that explodes.</Help>
            </span>
            <input type="range" min={1} max={8} value={k} onChange={(e) => setK(+e.target.value)} className="w-full accent-primary" />
          </label>
          <label className="inline-flex items-center gap-2 self-end">
            <input type="checkbox" checked={overlap} onChange={(e) => setOverlap(e.target.checked)} className="accent-primary" />
            overlapping (stride 1, as in DNABERT)
            <Help label="Overlapping">Overlapping k-mers keep every position but repeat information. Non-overlapping with k = 3 gives codons, the unit the ribosome reads.</Help>
          </label>
        </div>
        {invalid > 0 && <p className="text-xs text-warning mb-2">{invalid} character(s) are not A, C, G or T. They still appear in tokens but a real model would map them to an unknown token.</p>}
        <div className="rounded-md border border-border bg-background p-3 font-mono text-xs leading-7 max-h-44 overflow-y-auto">
          {dnaToks.map((t, i) => (
            <span key={i} className="inline-flex flex-col items-center mr-1 my-0.5 align-top">
              <span className={`rounded px-1 ${BASE_CLASS[t[0]] ?? "bg-secondary"}`}>{t}</span>
              {k === 3 && !overlap && <span className="text-[10px] text-primary leading-3">{translateCodon(t)}</span>}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <Stat label="bases" value={cleanDna.length.toString()} />
          <Stat label="tokens" value={dnaToks.length.toString()} />
          <Stat label="vocab size 4^k" value={Math.pow(4, k).toLocaleString()} />
          <Stat label="GC content" value={`${gc.toFixed(0)}%`} />
        </div>
        {k === 3 && !overlap && (
          <p className="mt-3 text-xs text-muted-foreground">With k = 3 and no overlap each token is a codon, and the blue letter under it is the amino acid it encodes. Reading frame matters: delete the first base and every codon changes.</p>
        )}
      </Lab>

      {/* Protein lab */}
      <Lab title="Protein tokens & masked prediction">
        <ResetButton onClick={resetProt} />
        <label htmlFor="prot-input" className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          Protein sequence (one-letter amino acid codes)
          <Help label="Protein">Default: the 30-residue B chain of human insulin. Letters that are not standard amino acids are dropped.</Help>
        </label>
        <input id="prot-input" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-3" />
        <p className="text-xs text-muted-foreground mb-2">Click a residue to <b>mask</b> it, the same way ESM is trained: hide a token, predict it from both sides.</p>
        <div className="flex flex-wrap gap-1 font-mono text-sm mb-3">
          {cleanProt.split("").map((r, i) => (
            <button key={i} onClick={() => setMaskIdx(i)} title={`${r} · ${RES_CLASS[r]} · position ${i + 1}`} className={`h-8 w-7 rounded ${i === safeMask ? "bg-primary text-primary-foreground font-bold ring-2 ring-ring" : CLASS_STYLE[RES_CLASS[r]].bg} hover:ring-1 hover:ring-ring`}>
              {i === safeMask ? "?" : r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-mono mb-5">
          {(Object.keys(CLASS_STYLE) as ResClass[]).map((c) => (
            <span key={c} className="inline-flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${CLASS_STYLE[c].dot}`} />{CLASS_STYLE[c].label} · {comp[c]}</span>
          ))}
        </div>
        {preds.length > 0 && (
          <div className="grid md:grid-cols-[1fr_240px] gap-5">
            <div className="space-y-1">
              {preds.slice(0, 8).map((p) => (
                <div key={p.a} className="grid grid-cols-[28px_1fr_48px] items-center gap-2 font-mono text-xs">
                  <span className={p.a === cleanProt[safeMask] ? "text-success font-bold" : ""}>{p.a}</span>
                  <div className="h-4 rounded bg-secondary overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${p.p * 100}%`, background: p.a === cleanProt[safeMask] ? "var(--g-green)" : "var(--chart-1)" }} />
                  </div>
                  <span className="text-right text-muted-foreground">{(p.p * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background p-3 text-xs space-y-1.5">
              <div className="font-mono text-muted-foreground">position {safeMask + 1}</div>
              <div>True residue: <span className="font-mono font-bold text-success">{cleanProt[safeMask]}</span> ({RES_CLASS[cleanProt[safeMask]]})</div>
              <div>Rank in prediction: <span className="font-mono text-primary">#{truthRank}</span></div>
              <p className="text-muted-foreground pt-1">The top guesses share chemistry with the hidden residue. Real protein LMs learn this from evolution alone, and a low score for a mutation often flags it as harmful.</p>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Toy model: scores come from a hand-made rule (same chemical class, neighbours' class), not from a trained network.</p>
      </Lab>

      {/* SMILES lab */}
      <Lab title="SMILES molecule tokenizer">
        <ResetButton onClick={resetSmi} share />
        <div className="flex flex-wrap gap-2 mb-3">
          {MOLECULES.map((m) => (
            <button key={m.name} onClick={() => setSmi(m.smi)} className={`px-3 py-1.5 rounded-md text-xs font-mono border transition ${smi === m.smi ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"}`}>{m.name}</button>
          ))}
        </div>
        <label htmlFor="smi-input" className="text-xs font-mono text-muted-foreground mb-1 inline-flex items-center">
          SMILES string
          <Help label="SMILES">Simplified Molecular Input Line Entry System. Letters are atoms (lower case = aromatic), = and # are double and triple bonds, parentheses are branches, digits open and close rings.</Help>
        </label>
        <input id="smi-input" value={smi} onChange={(e) => setSmi(e.target.value)} className="w-full font-mono rounded-md border border-input bg-background px-3 py-2 mb-3" />
        <div className="rounded-md border border-border bg-background p-3 font-mono text-sm leading-8">
          {smiToks.map((t, i) => (
            <span key={i} className={`inline-block rounded px-1.5 mr-0.5 ${SMI_STYLE[smilesKind(t)]}`} title={smilesKind(t)}>{t}</span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono">
          {(Object.keys(SMI_STYLE) as SmiKind[]).filter((x) => x !== "other").map((x) => (
            <span key={x} className={`px-1.5 rounded ${SMI_STYLE[x]}`}>{x}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <Stat label="characters" value={smi.length.toString()} />
          <Stat label="tokens" value={smiToks.length.toString()} />
          <Stat label="heavy atoms" value={heavyAtoms.toString()} />
          <Stat label="ring closures" value={String(smiToks.filter((t) => smilesKind(t) === "ring").length / 2)} />
        </div>
        {leftover > 0 && <p className="mt-2 text-xs text-warning">{leftover} character(s) did not match any SMILES token.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Note how "Cl" and "Br" must be one token: a character-level split would read them as carbon + l. Chemistry LMs (ChemBERTa, MolGPT) use this kind of regex tokenizer before training.</p>
      </Lab>

      <Section title="Where LLM ideas show up in biology" kicker="landscape">
        <ul className="list-disc pl-5 space-y-2">
          <li><span className="text-foreground font-medium">Protein language models</span> (ESM-2, ProtBERT, ProGen) learn from hundreds of millions of sequences. Their embeddings predict function, stability and the effect of mutations; ESMFold predicts 3D structure from them.</li>
          <li><span className="text-foreground font-medium">Structure models</span> such as AlphaFold combine attention over sequences with geometry. They are not chat LLMs, but they use the same <Link to="/embeddings" className="text-primary hover:underline">attention</Link> building block.</li>
          <li><span className="text-foreground font-medium">Genomic models</span> (DNABERT, Nucleotide Transformer, HyenaDNA, Evo) read DNA to find promoters, splice sites and variant effects; long context matters because genes span thousands of bases.</li>
          <li><span className="text-foreground font-medium">Chemistry models</span> generate or rank SMILES for drug discovery and predict properties such as solubility or toxicity.</li>
          <li><span className="text-foreground font-medium">Research agents</span> combine a chat LLM with <Link to="/rag" className="text-primary hover:underline">RAG</Link> over papers and tools such as PubMed, ChEMBL or UniProt, the same pattern as the <Link to="/orchestration" className="text-primary hover:underline">orchestration</Link> module.</li>
        </ul>
        <p className="text-xs">Caution: model predictions in biology are hypotheses. They need wet-lab or clinical validation before anyone relies on them.</p>
      </Section>

      <div className="grid sm:grid-cols-2 gap-3">
        {termsFor("bio-ai").slice(3).map((t) => <KeyTerm key={t.term} term={t.term} def={t.def} />)}
      </div>
    </ModulePage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-secondary/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base text-primary">{value}</div>
    </div>
  );
}
