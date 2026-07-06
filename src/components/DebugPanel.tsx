import { ChevronDown, Settings, Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ParsedQuery, Product } from "@/types/product";
import { valueScore } from "@/lib/search";
import { useUser } from "@/lib/user-context";

interface DebugProps {
  parsed: ParsedQuery | null;
  matched: number;
  results: Product[];
  temperature: number;
  onTemperatureChange: (v: number) => void;
  tokens?: { input: number; output: number; model: string } | null;
}

export function DebugPanel({ parsed, matched, results, temperature, onTemperatureChange, tokens }: DebugProps) {
  const { isAdmin } = useUser();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <div className="border-t border-border bg-bg-secondary">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 text-[11px] text-text-muted hover:text-accent transition-colors font-medium uppercase tracking-wider"
      >
        <Settings className="w-3.5 h-3.5" />
        RAG Debug
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-out"
        style={{ height: open ? 240 : 0 }}
      >
        <div className="relative bg-[#0A0F1A] h-[240px] overflow-auto p-4 font-mono text-[11px] grid grid-cols-1 md:grid-cols-4 gap-4">
          <span className="absolute top-2 right-2 bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
            LIVE — Lovable AI ✅
          </span>
          <div>
            <div className="text-cyan-400 mb-2"># Query Parsed</div>
            {parsed ? (
              <pre className="text-green-400 whitespace-pre-wrap">
{`intent:       ${parsed.intent}
budget_max:   ${parsed.budget_max ?? "—"}
budget_min:   ${parsed.budget_min ?? "—"}
goal:         ${parsed.goal ?? "—"}
category:     ${parsed.category ?? "—"}
platform:     ${parsed.platform ?? "all"}
vegan:        ${parsed.vegan ?? false}
min_protein:  ${parsed.min_protein ?? "—"}
keywords:     [${parsed.keywords.slice(0, 5).join(", ")}]`}
              </pre>
            ) : (
              <div className="text-text-muted">// waiting for query…</div>
            )}
          </div>
          <div>
            <div className="text-cyan-400 mb-2"># RAG Pipeline</div>
            {parsed ? (
              <pre className="text-green-400 whitespace-pre-wrap">
{`-- Chunking --
chunks:       124 total
chunk_unit:   1 product = 1 chunk
chunk_fields: rag_text + brand +
              product_name + tags

-- Retrieval --
method:       keyword + tag filter
              + value score rank
top_k:        5
filter_tags:  [${[parsed.goal, parsed.category, parsed.vegan ? "vegan" : null].filter(Boolean).join(", ") || "none"}]
matched:      ${matched} products
returned:     ${results.length}

-- Model --
${tokens
  ? `model:        ${tokens.model}
tokens_in:    ${tokens.input}
tokens_out:   ${tokens.output}`
  : "model:        waiting..."
}`}
              </pre>
            ) : (
              <div className="text-text-muted">// no retrieval yet</div>
            )}
          </div>
          <div>
            <div className="text-cyan-400 mb-2"># Ranking</div>
            {results.length > 0 ? (
              <pre className="text-green-400 whitespace-pre-wrap">
{results
  .map(
    (r) =>
      `[${valueScore(r).toFixed(2)}] ${r.brand.split(" ")[0]} ${r.product_name.slice(0, 24)}`,
  )
  .join("\n")}
              </pre>
            ) : (
              <div className="text-text-muted">// no ranking yet</div>
            )}
          </div>
          <div>
            <div className="text-cyan-400 mb-2"># Temperature</div>
            <pre className="text-green-400 whitespace-pre-wrap">
{`value:  ${temperature.toFixed(2)}
low  → deterministic
high → creative`}
            </pre>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
              className="w-full mt-2 accent-accent"
            />
            <div className="text-text-muted mt-1">
              {temperature < 0.3
                ? "🎯 Precise / factual"
                : temperature < 0.6
                  ? "⚖️ Balanced"
                  : temperature < 0.8
                    ? "💡 Creative"
                    : "🎲 Exploratory"}
            </div>
            <pre className="text-green-400 whitespace-pre-wrap mt-2">
{`AI Engine: Lovable AI (Gemini 2.5 Flash)
Status:    Connected ✅`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InputProps {
  onSend: (q: string) => void;
  onSendRaw: (q: string) => void;
  disabled?: boolean;
  isAdmin?: boolean;
  responseLength?: "short" | "medium" | "descriptive";
  onResponseLengthChange?: (l: "short" | "medium" | "descriptive") => void;
}

const QUICK = [
  { emoji: "💰", label: "Under ₹1,500", q: "Best protein under 1500" },
  { emoji: "🏆", label: "Highest rated", q: "Top rated whey protein with 4.5 stars" },
  { emoji: "⚡", label: "30g+ protein", q: "Whey with 30g+ protein per serving" },
  { emoji: "🥛", label: "Best isolate", q: "Best whey isolate for lean muscle" },
  { emoji: "🌱", label: "Best vegan", q: "Best vegan plant protein powder" },
  { emoji: "💪", label: "Mass gainer", q: "Best mass gainer for weight gain" },
];

export function ChatInput({ onSend, onSendRaw, disabled, isAdmin, responseLength = "medium", onResponseLengthChange }: InputProps) {
  const [val, setVal] = useState("");
  const [chipsVisible, setChipsVisible] = useState(true);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = val.trim();
    if (!v || disabled) return;
    setChipsVisible(false);
    onSend(v);
    setVal("");
  };

  const handleChip = (q: string) => {
    if (disabled) return;
    setChipsVisible(false);
    onSendRaw(q);
  };

  return (
    <div className="bg-bg-secondary border-t border-border p-3 md:p-4">
      <form onSubmit={submit} className="relative">
        <div className="input-glow flex items-center bg-bg-input border border-border rounded-full pl-5 pr-1.5 py-1.5 transition-all">
          <input
            ref={ref}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            placeholder="Ask about any protein powder..."
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted py-1.5"
          />
          <button
            type="submit"
            disabled={disabled || !val.trim()}
            className="w-9 h-9 rounded-full bg-accent hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-orange"
            aria-label="Send"
          >
            <Send className="w-4 h-4 text-bg-primary" />
          </button>
        </div>
      </form>
      {!isAdmin && onResponseLengthChange && (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Response:</span>
          {(["short", "medium", "descriptive"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onResponseLengthChange(l)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all capitalize ${
                responseLength === l
                  ? "bg-accent text-bg-primary border-accent font-semibold"
                  : "bg-bg-card text-text-secondary border-border hover:border-accent"
              }`}
            >
              {l === "short" ? "⚡ Short" : l === "medium" ? "⚖️ Medium" : "📝 Detailed"}
            </button>
          ))}
        </div>
      )}
      {chipsVisible && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => handleChip(q.q)}
              disabled={disabled}
              className="text-[11px] text-text-secondary hover:text-text-primary bg-bg-card border border-border hover:border-accent rounded-full px-2.5 py-1 transition-all focus-orange disabled:opacity-40"
            >
              <span className="mr-1">{q.emoji}</span>
              {q.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
