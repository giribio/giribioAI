import { useEffect, useState } from "react";

/**
 * Exact OpenAI tokenizers via the `gpt-tokenizer` package. Each vocabulary is
 * 0.5 to 2.4 MB, so it is code-split and only downloaded when first used.
 * Runs fully offline in the browser; nothing is sent anywhere.
 */

export type RealEncoding = "o200k_base" | "cl100k_base" | "r50k_base";

export const REAL_ENCODINGS: { id: RealEncoding; label: string; models: string; vocab: string }[] = [
  { id: "o200k_base", label: "GPT-4o", models: "GPT-4o, GPT-4.1, o-series", vocab: "~200k" },
  { id: "cl100k_base", label: "GPT-4", models: "GPT-4, GPT-3.5 Turbo", vocab: "~100k" },
  { id: "r50k_base", label: "GPT-2", models: "GPT-2, GPT-3 (davinci)", vocab: "~50k" },
];

type Codec = { encode: (t: string) => number[]; decode: (ids: number[]) => string };

const loaders: Record<RealEncoding, () => Promise<Codec>> = {
  o200k_base: () => import("gpt-tokenizer/encoding/o200k_base"),
  cl100k_base: () => import("gpt-tokenizer/encoding/cl100k_base"),
  r50k_base: () => import("gpt-tokenizer/encoding/r50k_base"),
};

const cache = new Map<RealEncoding, Promise<Codec>>();

export function loadEncoding(enc: RealEncoding): Promise<Codec> {
  let p = cache.get(enc);
  if (!p) {
    p = loaders[enc]();
    cache.set(enc, p);
  }
  return p;
}

export type RealToken = { id: number; text: string; partial: boolean };

/** Splits text into real tokens. A token holding only part of a multi-byte character is marked partial. */
export function tokenizeReal(codec: Codec, text: string): RealToken[] {
  return codec.encode(text).map((id) => {
    const t = codec.decode([id]);
    return { id, text: t, partial: t.includes("�") };
  });
}

/** Loads an encoding on demand. Returns null while loading (or if `enabled` is false). */
export function useRealTokenizer(enc: RealEncoding, enabled = true) {
  const [codec, setCodec] = useState<{ enc: RealEncoding; codec: Codec } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setError(null);
    loadEncoding(enc)
      .then((c) => alive && setCodec({ enc, codec: c }))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [enc, enabled]);
  return { codec: codec && codec.enc === enc ? codec.codec : null, error };
}
