/** Shared GPU table used by the Local LLM simulator and the quantization explorer. */
export type GPU = { id: string; name: string; vramGB: number; fp16Tflops: number; price: string; cuda: boolean; blurb: string };

export const GPUS: GPU[] = [
  { id: "a100",    name: "NVIDIA A100 80GB",  vramGB: 80, fp16Tflops: 312, price: "~$2.0 / hr cloud", cuda: true,  blurb: "Data center workhorse. Great for 70B class at Q4 or 13B at FP16." },
  { id: "h100",    name: "NVIDIA H100 80GB",  vramGB: 80, fp16Tflops: 989, price: "~$3.5 / hr cloud", cuda: true,  blurb: "Top tier inference. Pairs well with vLLM for high throughput serving." },
  { id: "rtx5090", name: "NVIDIA RTX 5090",   vramGB: 32, fp16Tflops: 419, price: "~$1,999 MSRP",     cuda: true,  blurb: "Strongest consumer card. Runs 30B class comfortably, 70B with offload." },
  { id: "rtx5060", name: "NVIDIA RTX 5060",   vramGB: 8,  fp16Tflops: 80,  price: "~$299 MSRP",       cuda: true,  blurb: "Entry level. Best for 3B to 8B models at Q4 quantization." },
];

export type FitTone = "good" | "tight" | "offload" | "bad";

/** Tailwind classes for each fit verdict. Red only for "won't fit". */
export const FIT_TONE_CLASS: Record<FitTone, string> = {
  good: "border-success/40 bg-success/10 text-success",
  tight: "border-warning/50 bg-warning/10 text-warning",
  offload: "border-info/40 bg-info/10 text-info",
  bad: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function fitVerdict(gpu: GPU | null, sizeGb: number): { label: string; tone: FitTone } {
  if (!gpu) return { label: "Pick a GPU first", tone: "tight" };
  const v = gpu.vramGB;
  if (sizeGb <= v * 0.7) return { label: `Fits comfortably on ${v}GB VRAM`, tone: "good" };
  if (sizeGb <= v)       return { label: `Tight fit on ${v}GB VRAM`, tone: "tight" };
  if (sizeGb <= v * 2)   return { label: `Needs CPU offload (~${Math.round(sizeGb)}GB vs ${v}GB)`, tone: "offload" };
  return { label: `Will not fit on ${v}GB VRAM (~${Math.round(sizeGb)}GB needed)`, tone: "bad" };
}
