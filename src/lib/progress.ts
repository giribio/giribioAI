import { useCallback, useSyncExternalStore } from "react";
import type { ModuleId } from "./curriculum";

/**
 * Per-browser learning progress. Stored in localStorage only (never sent
 * anywhere). Every access is wrapped so private windows / blocked storage
 * simply fall back to an empty, in-memory state.
 */

const KEY = "giribioai.progress.v1";

export type ProgressState = {
  visited: ModuleId[];
  completed: ModuleId[];
  last?: ModuleId;
};

const EMPTY: ProgressState = { visited: [], completed: [] };

let memory: ProgressState = EMPTY;
let cachedRaw: string | null | undefined;
let cachedState: ProgressState = EMPTY;
const listeners = new Set<() => void>();

function read(): ProgressState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<ProgressState>) : {};
    cachedState = {
      visited: Array.isArray(parsed.visited) ? parsed.visited : [],
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      last: parsed.last,
    };
  } catch {
    cachedState = EMPTY;
  }
  return cachedState;
}

function write(next: ProgressState) {
  memory = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep in memory */
    cachedRaw = undefined;
    cachedState = next;
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);

  const markVisited = useCallback((id: ModuleId) => {
    const cur = read();
    if (cur.visited.includes(id) && cur.last === id) return;
    write({
      ...cur,
      visited: cur.visited.includes(id) ? cur.visited : [...cur.visited, id],
      last: id,
    });
  }, []);

  const toggleComplete = useCallback((id: ModuleId) => {
    const cur = read();
    const done = cur.completed.includes(id);
    write({
      ...cur,
      visited: cur.visited.includes(id) ? cur.visited : [...cur.visited, id],
      completed: done ? cur.completed.filter((x) => x !== id) : [...cur.completed, id],
    });
  }, []);

  const reset = useCallback(() => write(EMPTY), []);

  return {
    ...state,
    isComplete: (id: ModuleId) => state.completed.includes(id),
    isVisited: (id: ModuleId) => state.visited.includes(id),
    markVisited,
    toggleComplete,
    reset,
  };
}
