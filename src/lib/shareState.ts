import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lab state that mirrors itself into the URL query string, so learners can
 * share the exact experiment they are looking at.
 *
 * - Keys are namespaced (`prefix.key`) so several labs on one page coexist.
 * - Values are restored after hydration (server render always uses defaults).
 * - The URL is updated with history.replaceState: no navigation, no history spam.
 * - Only values that differ from the defaults are written, keeping links short.
 */

type Primitive = string | number | boolean;

function parse<T extends Primitive>(raw: string, fallback: T): T {
  if (typeof fallback === "number") {
    const n = Number(raw);
    return (Number.isFinite(n) ? n : fallback) as T;
  }
  if (typeof fallback === "boolean") return (raw === "1" || raw === "true") as T;
  return raw as T;
}

function serialize(v: Primitive) {
  return typeof v === "boolean" ? (v ? "1" : "0") : String(v);
}

type Widen<T> = { [K in keyof T]: T[K] extends boolean ? boolean : T[K] extends number ? number : T[K] extends string ? string : T[K] };

export function useShareState<D extends Record<string, Primitive>>(prefix: string, initial: D) {
  type S = Widen<D>;
  const defaults = initial as unknown as S;
  const defaultsRef = useRef(defaults);
  const [state, setStateRaw] = useState<S>(defaults);
  const hydrated = useRef(false);

  // Restore from URL once on the client.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = { ...defaultsRef.current };
      let changed = false;
      for (const k of Object.keys(next) as (keyof S)[]) {
        const raw = params.get(`${prefix}.${String(k)}`);
        if (raw != null) {
          next[k] = parse(raw as string, defaultsRef.current[k] as Primitive) as S[keyof S];
          changed = true;
        }
      }
      if (changed) setStateRaw(next);
    } catch {
      /* malformed URL: keep defaults */
    }
    hydrated.current = true;
  }, [prefix]);

  // Write to URL whenever state changes (debounced).
  useEffect(() => {
    if (!hydrated.current) return;
    const t = window.setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        for (const k of Object.keys(state)) {
          const key = `${prefix}.${k}`;
          if (state[k] === defaultsRef.current[k]) url.searchParams.delete(key);
          else url.searchParams.set(key, serialize(state[k] as Primitive));
        }
        window.history.replaceState(window.history.state, "", url.toString());
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [state, prefix]);

  const setState = useCallback((patch: Partial<S> | ((s: S) => Partial<S>)) => {
    setStateRaw((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => setStateRaw(defaultsRef.current), []);

  return [state, setState, reset] as const;
}
