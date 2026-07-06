import ReactMarkdown from "react-markdown";
import type { Message } from "@/types/product";
import { ProductCard } from "./ProductCard";
import { ComparisonTable } from "./ComparisonTable";
import { valueScore } from "@/lib/search";

export function ChatMessage({ message, onFollowUp }: { message: Message; onFollowUp?: (q: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end fade-in-up">
        <div className="max-w-[70%] bg-bg-input border border-border rounded-2xl px-4 py-2.5 text-sm text-text-primary">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  const products = message.products || [];
  let topPickIdx = -1;
  let bestValueIdx = -1;
  let bestProteinIdx = -1;
  let topRatedIdx = -1;
  if (products.length > 0) {
    topPickIdx = 0;
    const scores = products.map((p) => valueScore(p));
    bestValueIdx = scores.indexOf(Math.max(...scores));
    bestProteinIdx = products
      .map((p) => p.nutrition_per_serving.protein_g)
      .indexOf(Math.max(...products.map((p) => p.nutrition_per_serving.protein_g)));
    topRatedIdx = products
      .map((p) => p.social_proof.rating)
      .indexOf(Math.max(...products.map((p) => p.social_proof.rating)));
  }

  // Extract trailing follow-up question (last line ending in ?) — render below cards
  const rawContent = message.content || "";
  let mainContent = rawContent;
  let followUp: string | null = null;
  if (products.length > 0) {
    const lines = rawContent.trimEnd().split(/\n+/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i].trim();
      if (!ln) continue;
      if (ln.endsWith("?")) {
        followUp = ln.replace(/^[*_>\-\s]+/, "").replace(/[*_]+$/, "").trim();
        mainContent = lines.slice(0, i).join("\n").trimEnd();
      }
      break;
    }
  }

  return (
    <div className="flex gap-3 fade-in-up">
      <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center font-display font-extrabold text-bg-primary text-sm shrink-0 shadow-[0_0_8px_rgba(255,107,53,0.3)]">
        S
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="prose prose-invert prose-sm max-w-none text-text-primary [&_strong]:text-accent [&_strong]:font-semibold [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5">
          <ReactMarkdown>{mainContent}</ReactMarkdown>
        </div>

        {message.filterDesc && products.length > 0 && (
          <div className="text-[11px] text-text-muted border-l-2 border-accent pl-2">
            Showing {products.length} result{products.length !== 1 ? "s" : ""} · {message.filterDesc}
          </div>
        )}

        {message.isComparison && products.length >= 2 ? (
          <ComparisonTable products={products} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 w-full">
            {products.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                badges={{
                  topPick: i === topPickIdx,
                  bestValue: i === bestValueIdx,
                  bestProtein: i === bestProteinIdx && i !== bestValueIdx,
                  topRated: i === topRatedIdx && i !== bestValueIdx && i !== bestProteinIdx,
                }}
              />
            ))}
          </div>
        ) : null}

        {followUp && (
          <div className="mt-3 text-sm text-accent font-medium border-l-2 border-accent pl-3">
            {followUp}
          </div>
        )}

        {onFollowUp && products.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              products[0] && products[1] && `Compare ${products[0].brand.split(" ")[0]} vs ${products[1].brand.split(" ")[0]}`,
              products[0] && `What are the ingredients in ${products[0].brand.split(" ")[0]} ${products[0].product_name.split(" ").slice(0,2).join(" ")}?`,
              `Show me cheaper alternatives`,
              `Show me higher protein options`,
            ].filter(Boolean).slice(0, 3).map((suggestion) => (
              <button
                key={suggestion as string}
                onClick={() => onFollowUp(suggestion as string)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-bg-input border border-border text-text-muted hover:border-accent hover:text-accent transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 fade-in-up">
      <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center font-display font-extrabold text-bg-primary text-sm shrink-0">
        S
      </div>
      <div className="flex items-center gap-1.5 h-7">
        <span className="w-2 h-2 rounded-full bg-accent dot-bounce" />
        <span className="w-2 h-2 rounded-full bg-accent dot-bounce" style={{ animationDelay: "0.2s" }} />
        <span className="w-2 h-2 rounded-full bg-accent dot-bounce" style={{ animationDelay: "0.4s" }} />
      </div>
    </div>
  );
}
