import { useEffect, useState, useCallback } from "react";
import type { Thread, Message } from "@/types/product";

const KEY = "shopmind:threads:v1";

const SEED_THREADS: Thread[] = [
  { id: "seed-1", title: "Best protein for gym beginners under ₹2000", updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), messages: [] },
  { id: "seed-2", title: "Compare MuscleBlaze Biozyme vs ON Gold Standard", updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), messages: [] },
  { id: "seed-3", title: "Vegan protein with digestive enzymes", updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), messages: [] },
  { id: "seed-4", title: "High protein isolate for cutting phase", updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), messages: [] },
];

function load(): Thread[] {
  if (typeof window === "undefined") return SEED_THREADS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED_THREADS));
      return SEED_THREADS;
    }
    return JSON.parse(raw) as Thread[];
  } catch {
    return SEED_THREADS;
  }
}

function save(threads: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(threads));
}

let listeners: Array<() => void> = [];
function notify() {
  listeners.forEach((l) => l());
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    setThreads(load());
    const l = () => setThreads(load());
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);

  const persist = useCallback((next: Thread[]) => {
    save(next);
    setThreads(next);
    notify();
  }, []);

  const createThread = useCallback((): Thread => {
    const t: Thread = {
      id: `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: "New chat",
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    persist([t, ...load()]);
    return t;
  }, [persist]);

  const renameThread = useCallback(
    (id: string, newTitle: string) => {
      const current = load();
      const title = newTitle.trim().slice(0, 60) || "New chat";
      persist(current.map((t) => (t.id === id ? { ...t, title } : t)));
    },
    [persist],
  );

  const deleteThread = useCallback(
    (id: string) => {
      persist(load().filter((t) => t.id !== id));
    },
    [persist],
  );

  const addMessage = useCallback(
    (threadId: string, message: Message, titleFromUser?: string) => {
      const current = load();
      const next = current.map((t) => {
        if (t.id !== threadId) return t;
        let title = t.title;
        const isFirstUserMessage = titleFromUser && t.messages.filter(m => m.role === "user").length === 0;
        if (isFirstUserMessage || (titleFromUser && t.title === "New chat")) {
          const cleaned = titleFromUser!
            .replace(/[""'']/g, "")
            .replace(/\s+/g, " ")
            .trim();
          title = cleaned.slice(0, 42) + (cleaned.length > 42 ? "…" : "");
        }
        return {
          ...t,
          title,
          updatedAt: new Date().toISOString(),
          messages: [...t.messages, message],
        };
      });
      persist(next);
    },
    [persist],
  );

  const getThread = useCallback(
    (id: string): Thread | undefined => threads.find((t) => t.id === id),
    [threads],
  );

  return { threads, createThread, deleteThread, renameThread, addMessage, getThread };
}
