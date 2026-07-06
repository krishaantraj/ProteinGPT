import type { Product } from "@/types/product";
import { valueScore } from "@/lib/search";
import { ExternalLink, Star } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "Whey Protein": "#4A90D9",
  "Plant-Based Protein": "#27AE60",
  "Casein Protein": "#8E44AD",
  "Mass Gainer": "#E67E22",
};

const PLATFORM_COLORS: Record<string, string> = {
  Amazon: "#FF9900",
  Flipkart: "#2874F0",
  Nutrabay: "#00B5AD",
  HealthKart: "#E31E25",
  MuscleBlaze: "#FF6B35",
};

interface Props {
  product: Product;
  badges?: { topPick?: boolean; bestValue?: boolean; bestProtein?: boolean; topRated?: boolean };
  index: number;
}

export function ProductCard({ product, badges = {}, index }: Props) {
  const score = valueScore(product);
  const platformColor = PLATFORM_COLORS[product.platform] || "#FF6B35";
  const n = product.nutrition_per_serving;
  const costPerServing = product.pricing.price_inr / (n.servings_per_container || 1);
  const monthlyTrainingCost = costPerServing * 4 * 5;
  const proteinPerRupee = (Number(n.protein_g) / product.pricing.price_inr) * 1000;
  const catColor = CATEGORY_COLORS[product.category] || "#FF6B35";
  const brandInitials = product.brand.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const goalPills: { tag: string; label: string }[] = [
    { tag: "beginner", label: "🔰 Beginner" },
    { tag: "keto", label: "🥑 Keto" },
    { tag: "overnight", label: "🌙 Overnight" },
    { tag: "casein", label: "🌙 Overnight" },
    { tag: "grass-fed", label: "🌿 Grass Fed" },
    { tag: "digestive-enzymes", label: "💊 Easy Digest" },
    { tag: "vegan", label: "🌱 Vegan" },
  ];
  const seenPill = new Set<string>();
  const pills = goalPills.filter(p => {
    if (!product.tags.includes(p.tag)) return false;
    if (seenPill.has(p.label)) return false;
    seenPill.add(p.label);
    return true;
  });

  return (
    <div
      className={`relative card-in glow-card bg-bg-card border border-border rounded-xl p-4 w-full flex flex-col gap-3 ${
        badges.topPick ? "glow-top" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms`, overflow: "visible" }}
    >
      {badges.bestValue && (
        <div className="absolute top-2 right-2 z-20 bg-success text-bg-primary text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded shadow-md">
          Best Value
        </div>
      )}
      {!badges.bestValue && badges.bestProtein && (
        <div className="absolute top-2 right-2 z-20 bg-info text-bg-primary text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded shadow-md">
          Best Protein
        </div>
      )}
      {!badges.bestValue && !badges.bestProtein && badges.topRated && (
        <div className="absolute top-2 right-2 z-20 bg-warning text-bg-primary text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded shadow-md">
          Top Rated
        </div>
      )}

      {/* Branded placeholder image */}
      <div
        className="relative w-full h-20 rounded-lg overflow-hidden border flex flex-col items-center justify-center gap-1"
        style={{ background: `${catColor}18`, borderColor: `${catColor}30` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: catColor }}
        >
          {brandInitials}
        </div>
        <span className="text-[9px] font-medium" style={{ color: catColor }}>
          {product.category}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded text-bg-primary"
          style={{ background: platformColor }}
        >
          {product.platform}
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-bg-input text-text-secondary border border-border">
          {product.category}
        </span>
      </div>

      <div>
        <div className="text-[11px] text-text-secondary font-medium">{product.brand}</div>
        <div className="text-[15px] font-display font-bold text-text-primary leading-tight line-clamp-2">
          {product.product_name}
        </div>
        <div className="text-[12px] text-text-muted mt-0.5">
          {product.variant.flavor} · {product.variant.size}
        </div>
        {product.short_description && (
          <p className="mt-1 text-[10px] text-text-secondary leading-snug line-clamp-2">
            {product.short_description}
          </p>
        )}
      </div>

      <div className="bg-bg-input/50 border border-border rounded-lg p-2.5">
        <div className="text-[9px] uppercase tracking-widest text-text-muted mb-1.5 font-semibold">Nutrition</div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            { v: `${n.protein_g}g`, l: "Protein", hl: true },
            { v: `${n.bcaa_g}g`, l: "BCAA" },
            { v: n.servings_per_container, l: "Servings" },
            { v: n.calories, l: "Calories" },
            { v: `${n.carbs_g}g`, l: "Carbs" },
            { v: `${n.fat_g}g`, l: "Fat" },
          ].map((s, i) => (
            <div key={i}>
              <div className={`text-[13px] font-bold ${s.hl ? "text-accent" : "text-text-primary"}`}>{s.v}</div>
              <div className="text-[9px] text-text-muted uppercase">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-warning fill-warning" />
          <span className="font-semibold text-text-primary">{product.social_proof.rating}</span>
          <span className="text-text-muted">· {product.social_proof.review_count}</span>
        </div>
        {product.social_proof.bestseller_tag && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-semibold">
            {product.social_proof.bestseller_tag}
          </span>
        )}
      </div>

      {product.formulation.certifications.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.formulation.certifications.slice(0, 3).map((c) => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-info/10 text-info border border-info/20">
              {c}
            </span>
          ))}
        </div>
      )}

      {pills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pills.map((p) => (
            <span key={p.label} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-medium">
              {p.label}
            </span>
          ))}
        </div>
      )}

      {product.use_case && (
        <div className="text-[9px] px-2 py-0.5 rounded-full bg-bg-input border border-border text-text-muted inline-block w-fit">
          {product.use_case.split(";")[0].trim()}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
          <span className="uppercase tracking-wider font-semibold">Value Score</span>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">{proteinPerRupee.toFixed(2)}g/₹</span>
            <span className="text-accent font-bold">{score.toFixed(1)}</span>
          </div>
        </div>
        <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-soft rounded-full transition-all"
            style={{ width: `${Math.min(100, score * 3)}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-display font-bold text-text-primary">
            ₹{product.pricing.price_inr.toLocaleString("en-IN")}
          </span>
          {product.pricing.mrp_inr > product.pricing.price_inr && (
            <>
              <span className="text-xs text-text-muted line-through">
                ₹{product.pricing.mrp_inr.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-success font-semibold">
                {Math.round(product.pricing.discount_pct)}% off
              </span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-text-muted mt-0.5">
          <span>₹{costPerServing.toFixed(0)}/serving</span>
          <span title="Estimated cost training 5x/week">~₹{monthlyTrainingCost.toFixed(0)}/month</span>
        </div>
      </div>

      {product.formulation.ingredients.length > 0 && (
        <details className="group">
          <summary className="text-[10px] text-text-muted cursor-pointer hover:text-accent transition-colors list-none flex items-center gap-1">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            Ingredients ({product.formulation.ingredients.length})
          </summary>
          <div className="mt-1.5 text-[9px] text-text-muted leading-relaxed max-h-20 overflow-y-auto">
            {product.formulation.ingredients.join(", ")}
          </div>
        </details>
      )}

      <div className="flex gap-2 mt-auto">
        {product.url ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-soft text-bg-primary text-xs font-semibold py-2 rounded-md transition-colors focus-orange"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Buy on {product.platform}
          </a>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 bg-bg-input border border-border text-text-muted text-xs py-2 rounded-md cursor-not-allowed select-none">
            <span className="text-red-400 text-sm">🔗</span>
            Link Unavailable
          </div>
        )}
      </div>
    </div>
  );
}
