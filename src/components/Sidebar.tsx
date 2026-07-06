import { ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FilterState, Thread } from "@/types/product";
import { useNavigate } from "@tanstack/react-router";

const CATEGORIES = [
  { name: "Whey Protein", emoji: "🥛", count: 92 },
  { name: "Plant-Based Protein", emoji: "🌱", count: 12 },
  { name: "Casein Protein", emoji: "🌙", count: 7 },
  { name: "Mass Gainer", emoji: "💪", count: 13 },
];

const PROTEIN_LEVELS = [
  { label: "Any", value: 0 },
  { label: "20g+", value: 20 },
  { label: "24g+", value: 24 },
  { label: "27g+", value: 27 },
  { label: "30g+", value: 30 },
];

const GOALS = ["Muscle Building", "Lean/Cutting", "Beginners", "Keto", "Weight Gain", "Overnight Recovery", "Vegan"];
const CERTS = ["Labdoor USA", "NABL Tested", "FSSAI", "WADA Approved", "Informed Sport"];

interface Props {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  threads: Thread[];
  activeThreadId?: string;
  onNewChat: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onClearPlatform: () => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3.6e6);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

export function Sidebar({ filters, setFilters, threads, activeThreadId, onNewChat, onDeleteThread, onRenameThread, onClearPlatform }: Props) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const activeFilterCount = [
    filters.categories.length > 0,
    filters.goals.length > 0,
    filters.certifications.length > 0,
    filters.vegan,
    filters.vegetarian,
    filters.minProtein > 0,
    filters.maxBudget < 15000,
    filters.minBudget > 0,
  ].filter(Boolean).length;
  const toggleCategory = (c: string) => {
    const has = filters.categories.includes(c);
    setFilters({ ...filters, categories: has ? filters.categories.filter((x) => x !== c) : [...filters.categories, c] });
  };
  const toggleGoal = (g: string) => {
    const has = filters.goals.includes(g);
    setFilters({ ...filters, goals: has ? filters.goals.filter((x) => x !== g) : [...filters.goals, g] });
  };
  const toggleCert = (c: string) => {
    const has = filters.certifications.includes(c);
    setFilters({ ...filters, certifications: has ? filters.certifications.filter((x) => x !== c) : [...filters.certifications, c] });
  };
  const clear = () => {
    setFilters({
      categories: [], minBudget: 0, maxBudget: 15000, minProtein: 0,
      goals: [], certifications: [], vegan: false, vegetarian: false,
      sortBy: "price_asc",
    });
    onClearPlatform();
  };

  return (
    <aside className={`hidden md:flex shrink-0 flex-col bg-bg-secondary border-r border-border h-full overflow-y-auto transition-all duration-200 ${collapsed ? "w-[44px]" : "w-[240px]"}`}>
      <div className="flex items-center px-2 py-2 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">Filters</span>
            {activeFilterCount > 0 && (
              <span className="text-[9px] bg-accent text-bg-primary font-bold px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ml-auto text-text-muted hover:text-accent transition-colors p-1 rounded"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      {collapsed ? null : (
      <div className="p-3 space-y-4">
        <button
          onClick={onNewChat}
          aria-label="New chat"
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-soft text-bg-primary font-semibold text-sm py-2 rounded-lg transition-colors focus-orange"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> New chat
        </button>


        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Categories</div>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const active = filters.categories.includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => toggleCategory(c.name)}
                  className={`text-left rounded-full border px-3 py-2 text-xs transition-all focus-orange ${
                    active
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border text-text-secondary hover:border-text-muted"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span>{c.emoji}</span>
                    <span className="truncate font-medium">{c.name}</span>
                  </div>
                  <span className="text-[10px] text-text-muted">({c.count})</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Budget Range</div>
          <div className="text-xs text-text-primary mb-2 font-medium">
            {filters.maxBudget >= 15000
              ? "Any budget"
              : `Up to ₹${filters.maxBudget.toLocaleString("en-IN")}`}
          </div>
          <input
            type="range" min={649} max={15000} step={100}
            value={Math.max(filters.maxBudget, 649)}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setFilters({ ...filters, maxBudget: v >= 15000 ? 15000 : v, minBudget: 0 });
            }}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>₹649</span>
            <span>Any</span>
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Protein / Serving</div>
          <div className="flex flex-wrap gap-1.5">
            {PROTEIN_LEVELS.map((l) => (
              <button
                key={l.label}
                onClick={() => setFilters({ ...filters, minProtein: l.value })}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all focus-orange ${
                  filters.minProtein === l.value
                    ? "border-accent bg-accent text-bg-primary"
                    : "border-border text-text-secondary hover:border-text-muted"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Goal</div>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.map((g) => {
              const active = filters.goals.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => toggleGoal(g)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all focus-orange ${
                    active
                      ? "border-accent bg-accent-muted text-accent"
                      : "border-border text-text-secondary hover:border-text-muted"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Certifications</div>
          <div className="space-y-1.5">
            {CERTS.map((c) => (
              <label key={c} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={filters.certifications.includes(c)}
                  onChange={() => toggleCert(c)}
                  className="accent-accent w-3.5 h-3.5"
                />
                {c}
              </label>
            ))}
          </div>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Sort By</div>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState["sortBy"] })}
            className="w-full bg-bg-input border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent transition-colors"
          >
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="rating_desc">Rating: Best first</option>
            <option value="protein_desc">Protein: Most first</option>
            <option value="value_desc">Value Score: Best first</option>
          </select>
        </section>

        <section>
          <div className="text-[10px] uppercase tracking-widest text-text-muted mb-2 font-semibold">Recent Chats</div>
          <ul className="space-y-1">
            {threads.slice(0, 8).map((t) => {
              const active = t.id === activeThreadId;
              return (
                <li
                  key={t.id}
                  className={`group flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                    active ? "bg-accent-muted" : "hover:bg-bg-input"
                  }`}
                  onClick={() => navigate({ to: "/chat/$threadId", params: { threadId: t.id } })}
                >
                  <Clock className="w-3 h-3 mt-1 text-text-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    {editingId === t.id ? (
                      <input
                        autoFocus
                        defaultValue={t.title}
                        onBlur={(e) => {
                          onRenameThread(t.id, e.target.value);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onRenameThread(t.id, (e.target as HTMLInputElement).value);
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-bg-input border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary outline-none"
                      />
                    ) : (
                      <div className={`text-xs truncate ${active ? "text-text-primary" : "text-text-secondary"}`}>
                        {t.title}
                      </div>
                    )}
                    <div className="text-[10px] text-text-muted">{timeAgo(t.updatedAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(t.id);
                      }}
                      className="text-text-muted hover:text-accent transition-colors"
                      aria-label="Rename chat"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteThread(t.id);
                      }}
                      className="text-text-muted hover:text-accent transition-colors"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <button onClick={clear} aria-label="Clear filters" className="text-xs text-accent/80 hover:text-accent transition-colors">
            Clear filters
          </button>
          <span className="text-[10px] text-text-muted">v1.0 beta</span>
        </div>
      </div>
      )}
    </aside>
  );
}
