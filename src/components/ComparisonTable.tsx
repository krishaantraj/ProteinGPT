import type { Product } from "@/types/product";
import { valueScore } from "@/lib/search";

interface Props {
  products: Product[];
}

export function ComparisonTable({ products }: Props) {
  if (products.length < 2) return null;

  const rows: Array<{ label: string; values: (string | number)[]; winner: "max" | "min" | null }> = [
    { label: "Price", values: products.map((p) => p.pricing.price_inr), winner: "min" },
    { label: "Cost/serving", values: products.map((p) => Math.round(p.pricing.price_inr / (p.nutrition_per_serving.servings_per_container || 1))), winner: "min" },
    { label: "Monthly (5x/wk)", values: products.map((p) => Math.round((p.pricing.price_inr / (p.nutrition_per_serving.servings_per_container || 1)) * 20)), winner: "min" },
    { label: "Protein / serving", values: products.map((p) => p.nutrition_per_serving.protein_g), winner: "max" },
    { label: "Protein/₹", values: products.map((p) => +((Number(p.nutrition_per_serving.protein_g) / p.pricing.price_inr) * 1000).toFixed(2)), winner: "max" },
    { label: "BCAA", values: products.map((p) => p.nutrition_per_serving.bcaa_g), winner: "max" },
    { label: "EAA", values: products.map((p) => p.nutrition_per_serving.eaa_g), winner: "max" },
    { label: "Calories", values: products.map((p) => p.nutrition_per_serving.calories), winner: null },
    { label: "Carbs", values: products.map((p) => p.nutrition_per_serving.carbs_g), winner: "min" },
    { label: "Fat", values: products.map((p) => p.nutrition_per_serving.fat_g), winner: "min" },
    { label: "Servings", values: products.map((p) => p.nutrition_per_serving.servings_per_container), winner: "max" },
    { label: "Certifications", values: products.map((p) => p.formulation.certifications.join(", ") || "—"), winner: null },
    { label: "Rating", values: products.map((p) => p.social_proof.rating), winner: "max" },
    { label: "Value Score", values: products.map((p) => +valueScore(p).toFixed(2)), winner: "max" },
    { label: "Best For", values: products.map((p) => p.goal_fit), winner: null },
  ];

  const winnerIdx = (vals: (string | number)[], mode: "max" | "min") => {
    const nums = vals.map((v) => (typeof v === "number" ? v : NaN));
    const target = mode === "max" ? Math.max(...nums) : Math.min(...nums.filter((x) => !isNaN(x)));
    return nums.indexOf(target);
  };

  // overall winner: most rows won
  const winCount = new Array(products.length).fill(0);
  rows.forEach((r) => {
    if (r.winner) winCount[winnerIdx(r.values, r.winner)]++;
  });
  const overallWinner = winCount.indexOf(Math.max(...winCount));

  return (
    <div className="card-in overflow-x-auto bg-bg-card border border-border rounded-xl">
      <table className="w-full text-xs min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <th className="sticky left-0 bg-bg-card text-left p-3 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
              Attribute
            </th>
            {products.map((p) => (
              <th key={p.id} className="text-left p-3 min-w-[160px]">
                <div className="text-[10px] text-text-secondary">{p.brand}</div>
                <div className="text-[13px] font-display font-bold text-text-primary leading-tight line-clamp-2">
                  {p.product_name}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">{p.variant.size}</div>
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1.5 text-[10px] font-semibold text-accent hover:underline"
                  >
                    Buy ↗
                  </a>
                ) : (
                  <span className="inline-block mt-1.5 text-[10px] text-text-muted">No link</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const win = row.winner ? winnerIdx(row.values, row.winner) : -1;
            return (
              <tr key={ri} className="border-b border-border/50">
                <td className="sticky left-0 bg-bg-card p-3 text-text-secondary font-medium">{row.label}</td>
                {row.values.map((v, ci) => (
                  <td
                    key={ci}
                    className={`p-3 ${
                      ci === win
                        ? "win-flash bg-accent-muted text-accent font-bold"
                        : "text-text-primary"
                    }`}
                  >
                    {typeof v === "number" && ["Price", "Cost/serving", "Monthly (5x/wk)"].includes(row.label)
                      ? `₹${v.toLocaleString("en-IN")}`
                      : typeof v === "number" && ["Protein / serving", "BCAA", "EAA", "Carbs", "Fat"].includes(row.label)
                        ? `${v}g`
                        : typeof v === "number" && row.label === "Protein/₹"
                          ? `${v}g/₹`
                          : v}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr className="border-t-2 border-accent/40 bg-bg-secondary">
            <td className="sticky left-0 bg-bg-secondary p-3 text-[10px] uppercase tracking-widest text-text-muted font-semibold">
              Winner
            </td>
            {products.map((p, i) => (
              <td key={p.id} className="p-3">
                {i === overallWinner ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-accent text-bg-primary px-2 py-1 rounded">
                    🏆 Best Overall
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted">{winCount[i]} wins</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
