import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import { ChatInput, DebugPanel } from "./DebugPanel";
import { EmptyState } from "./EmptyState";
import { searchProducts, generateAIResponse } from "@/lib/search";
import { askClaude } from "@/lib/api/claude.functions";
import { useUser } from "@/lib/user-context";
import type { FilterState, Message, ParsedQuery, Product, Thread, UserPrefs } from "@/types/product";

interface Props {
  thread: Thread;
  filters: FilterState;
  platform: string;
  onAddMessage: (threadId: string, m: Message, titleFromUser?: string) => void;
}

export function ChatArea({ thread, filters, platform, onAddMessage }: Props) {
  const { isAdmin } = useUser();
  const [typing, setTyping] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [matched, setMatched] = useState(0);
  const [lastResults, setLastResults] = useState<Product[]>([]);
  const [responseLength, setResponseLength] = useState<"short" | "medium" | "descriptive">("medium");
  const [temperature, setTemperature] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem(`temp_${thread.id}`) || "0.7"); } catch { return 0.7; }
  });
  // FIX 1: re-load saved temperature when switching threads
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`temp_${thread.id}`);
      setTemperature(saved ? parseFloat(saved) : 0.7);
    } catch { setTemperature(0.7); }
  }, [thread.id]);
  const handleTemperatureChange = (v: number) => {
    setTemperature(v);
    try { localStorage.setItem(`temp_${thread.id}`, String(v)); } catch {}
  };
  const [userPrefs, setUserPrefs] = useState<UserPrefs | undefined>(undefined);
  const [activeFilterDesc, setActiveFilterDesc] = useState<string | null>(null);
  const [lastTokens, setLastTokens] = useState<{ input: number; output: number; model: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFilterKey = useRef("");
  const isFirstMount = useRef(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.messages.length, typing]);

  const buildFilterDesc = useCallback((f: FilterState, p: string): string => {
    const parts: string[] = [];
    if (f.categories.length > 0) parts.push(f.categories.join(", "));
    if (f.vegan) parts.push("Vegan");
    else if (f.vegetarian) parts.push("Vegetarian");
    if (f.minProtein > 0) parts.push(`${f.minProtein}g+ Protein`);
    if (f.maxBudget < 15000) parts.push(`Under ₹${f.maxBudget.toLocaleString("en-IN")}`);
    if (f.minBudget > 500) parts.push(`Over ₹${f.minBudget.toLocaleString("en-IN")}`);
    if (f.goals.length > 0) parts.push(f.goals.join(", "));
    if (f.certifications.length > 0) parts.push(f.certifications.join(", "));
    if (p !== "All") parts.push(p);
    return parts.join(" · ");
  }, []);

  const buildFilterQuery = useCallback((f: FilterState, p: string): string => {
    const parts: string[] = ["Show me protein powders"];
    if (f.categories.length > 0) parts.push(f.categories[0].toLowerCase());
    if (f.vegan) parts.push("vegan");
    if (f.goals.length > 0) parts.push(f.goals[0].toLowerCase());
    if (f.maxBudget < 15000) parts.push(`under ${f.maxBudget}`);
    if (f.minProtein > 0) parts.push(`${f.minProtein}g+ protein`);
    if (p !== "All") parts.push(`on ${p}`);
    return parts.join(" ");
  }, []);

  const runSearch = useCallback(
    (query: string, f: FilterState, p: string, desc: string) => {
      setTyping(true);
      // FIX 19: merge query-parsed budget into filters so it overrides sidebar
      const preParsed = (() => {
        try {
          // lightweight parse — only need budget hints; do full parse in searchProducts
          const ql = query.toLowerCase();
          const between = ql.match(/between\s*[₹rs.]?\s*(\d{3,5})\s*(?:and|to|-)\s*[₹rs.]?\s*(\d{3,5})/);
          const under = ql.match(/(?:under|below|less\s*than|<)\s*[₹rs.]?\s*(\d{3,5})/);
          const over = ql.match(/(?:above|over|more\s*than|>)\s*[₹rs.]?\s*(\d{3,5})/);
          return {
            max: between ? parseInt(between[2],10) : (under ? parseInt(under[1],10) : null),
            min: between ? parseInt(between[1],10) : (over ? parseInt(over[1],10) : null),
          };
        } catch { return { max: null, min: null }; }
      })();
      const mergedFilters: FilterState = {
        ...f,
        maxBudget: preParsed.max ?? f.maxBudget,
        minBudget: preParsed.min ?? f.minBudget,
      };
      const { results, parsed: parsedQ, matchedBeforeRank, contextMessage } = searchProducts(query, mergedFilters, p, userPrefs);
      setParsed(parsedQ);
      setMatched(matchedBeforeRank);
      setLastResults(results);
      setActiveFilterDesc(desc || null);

      const lengthToTemp = { short: 0.2, medium: 0.5, descriptive: 0.9 } as const;
      const effectiveTemperature = isAdmin ? temperature : lengthToTemp[responseLength];

      // Accumulate constraints from prior conversation
      const priorUserMessages = thread.messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .slice(-6);
      const constraintKeywords = [
        "vegan","dairy allerg","lactose","no creatine","not from","avoid","budget",
        "under ₹","beginner","cutting","muscle","bulk","keto","grass fed",
        "no sweetener","no sucralose","isolate","casein","plant","digestive enzyme",
      ];
      const accumulated = priorUserMessages
        .filter(msg => constraintKeywords.some(k => msg.toLowerCase().includes(k)))
        .slice(-3)
        .join("; ");

      askClaude({
        data: {
          query,
          products: results,
          isCompare: !!parsedQ.compare && results.length >= 2,
          temperature: effectiveTemperature,
          responseLength,
          userGoal: userPrefs?.goal,
          contextMessage: contextMessage,
          conversationHistory: accumulated || undefined,
        },
      })
        .then((res) => {
          setLastTokens({ input: res.input_tokens, output: res.output_tokens, model: res.model });
          const aiMsg: Message = {
            id: `m_${Date.now()}_a`,
            role: "assistant",
            content: res.text,
            products: results,
            isComparison: !!parsedQ.compare && results.length >= 2,
            timestamp: new Date().toISOString(),
            filterDesc: desc || undefined,
          };
          onAddMessage(thread.id, aiMsg);
        })
        .catch(() => {
          const content = generateAIResponse(query, results, !!parsedQ.compare, userPrefs, contextMessage);
          const aiMsg: Message = {
            id: `m_${Date.now()}_a`,
            role: "assistant",
            content,
            products: results,
            isComparison: !!parsedQ.compare && results.length >= 2,
            timestamp: new Date().toISOString(),
            filterDesc: desc || undefined,
          };
          onAddMessage(thread.id, aiMsg);
        })
        .finally(() => {
          setTyping(false);
        });
    },
    [thread.id, onAddMessage, temperature, userPrefs, isAdmin, responseLength],
  );

  const DEFAULT_F: FilterState = {
    categories: [], minBudget: 0, maxBudget: 15000, minProtein: 0,
    goals: [], certifications: [], vegan: false, vegetarian: false,
    sortBy: "price_asc",
  };

  const sendRaw = useCallback(
    (query: string) => {
      if (typing) return;
      setActiveFilterDesc(null);
      const userMsg: Message = {
        id: `m_${Date.now()}_u`,
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      };
      onAddMessage(thread.id, userMsg, query);
      runSearch(query, DEFAULT_F, "All", "");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typing, thread.id, onAddMessage, runSearch],
  );

  const hasActiveFilters = useCallback((f: FilterState, p: string): boolean => {
    return (
      f.categories.length > 0 ||
      f.goals.length > 0 ||
      f.certifications.length > 0 ||
      f.vegan ||
      f.vegetarian ||
      f.minProtein > 0 ||
      f.maxBudget < 15000 ||
      p !== "All"
    );
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      lastFilterKey.current = JSON.stringify({ filters, platform });
      return;
    }
    const key = JSON.stringify({ filters, platform });
    if (key === lastFilterKey.current) return;
    lastFilterKey.current = key;
    if (typing) return;

    if (!hasActiveFilters(filters, platform)) {
      setActiveFilterDesc(null);
      return;
    }

    const desc = buildFilterDesc(filters, platform);
    const query = buildFilterQuery(filters, platform);
    runSearch(query, filters, platform, desc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, platform]);

  const send = useCallback(
    (query: string) => {
      if (typing) return;
      setActiveFilterDesc(null);
      const userMsg: Message = {
        id: `m_${Date.now()}_u`,
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      };
      onAddMessage(thread.id, userMsg, query);
      const desc = buildFilterDesc(filters, platform);
      runSearch(query, filters, platform, desc);
    },
    [typing, filters, platform, thread.id, onAddMessage, buildFilterDesc, runSearch],
  );

  const isEmpty = thread.messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {activeFilterDesc && (
        <div className="flex items-center justify-between gap-3 px-3 py-1 bg-accent-muted border-b border-border text-[11px]">
          <div className="text-text-secondary truncate">
            <span className="text-accent font-semibold">Active filters:</span> {activeFilterDesc}
          </div>
          <span className={`shrink-0 font-medium ${matched === 0 ? "text-red-400" : "text-text-muted"}`}>
            {matched === 0 ? "No results — try wider filters" : `${matched} matched`}
          </span>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
        {isEmpty ? (
          <EmptyState onPick={send} onPrefsSet={setUserPrefs} />
        ) : (
          <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
            {thread.messages.map((m) => (
              <ChatMessage key={m.id} message={m} onFollowUp={m.role === "assistant" ? send : undefined} />
            ))}
            {typing && <TypingIndicator />}
          </div>
        )}
      </div>
      <ChatInput
        onSend={send}
        onSendRaw={sendRaw}
        disabled={typing}
        isAdmin={isAdmin}
        responseLength={responseLength}
        onResponseLengthChange={setResponseLength}
      />
      {isAdmin && (
        <DebugPanel
          parsed={parsed}
          matched={matched}
          results={lastResults}
          temperature={temperature}
          onTemperatureChange={handleTemperatureChange}
          tokens={lastTokens}
        />
      )}
    </div>
  );
}
