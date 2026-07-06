# ShopMind — ProteinGPT 💪🤖

**Your AI-powered protein advisor.**

Built in 24 hours for the **Ayuda AI Hackathon** (Vibe Coding an AI Product) — May 2026.

🔗 **Live demo:** [APP](https://proteingpt.lovable.app/)
📊 **Hackathon submission deck:** [Google Slides](https://docs.google.com/presentation/d/1XC8TCk6YAnlB6LQphAQ9tzUJO8NTGN5qNLzoTikYgDQ/edit)

---

## The problem

Protein shoppers face decision paralysis across 100+ products on 6+ platforms (Amazon, Flipkart, Nutrabay, brand sites). Search bars match keywords, not intent — none of them understand *"something clean, no bloating, under ₹2,000, for a beginner."*

## What ShopMind ProteinGPT does

Type your goal in plain language → the system parses intent, filters a curated product knowledge base by goal, budget, diet, and certification, ranks results with a personalized value score, and explains every recommendation with real numbers.

> **The AI Edge:** Remove the LLM and you're left with a filtered list sorted by price — no intent parsing, no contradiction detection, no personalized reasoning. ShopMind's edge lives in that gap: understanding natural constraints a keyword filter can never resolve, and catching contradictions (like a "keto mass gainer") before they become a bad purchase.

### Example
**Query:** `"best whey under 2000"`
**Response:** Found 5. Top pick: One Science Nutrition Premium Whey Protein — ₹699 — 24g protein — Grass-Fed, with 2 ranked alternatives and a value-score explanation.

---

## How it works

**Core flow:** `User types goal → RAG pipeline parses intent & filters 24-product knowledge base by goal/budget/diet/cert → Ranks by value score (protein × servings ÷ price, boosted by certs + ratings) → Returns ranked product cards with an explained top pick`

### System prompt design
ProteinGPT is built as a direct, evidence-based "gym coach" persona with explicit guardrails:
- Never recommends products outside the retrieved list, never invents specs/prices/certifications
- Refuses all recommendations for medical conditions (kidney disease, diabetes, pregnancy) and redirects to a doctor
- Catches dietary contradictions (e.g. "vegan whey") and explains why before offering real alternatives
- Output is structured: one-line summary → top pick (brand, price, protein, reason) → up to 2 alternatives → value-score note → one follow-up question

### RAG & chunking strategy
| Document type | Strategy | Chunk size | Why |
|---|---|---|---|
| Product catalogue (JSON) | 1 product = 1 chunk | ~400 tokens | Nutrition, pricing, and certs are interdependent — splitting them breaks context |
| `rag_text` field | Pre-built dense prose per product | ~250 tokens | One embeddable string per product for clean semantic matching |
| Tag index | Flat tag array per product | ~20 tokens | Hard metadata filtering before semantic ranking |

### Temperature tuning
| Mode | Temp | Why |
|---|---|---|
| Precise product lookup | 0.1–0.2 | Factual, consistent, short |
| Standard recommendation | 0.5–0.6 | Balanced explanation, 110-word cap |
| Exploratory / discovery | 0.7–0.9 | More descriptive, use-case framing |
| Medical / safety refusal | 0.1 | Deterministic refusal text, zero variation |

---

## Tech stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router, file-based routing)
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Backend/DB:** Supabase (Postgres + Auth)
- **Forms/validation:** React Hook Form + Zod
- **Built and shipped on:** [Lovable](https://lovable.dev)
- **Package manager:** Bun

---

## Running locally

```bash
# clone the repo
git clone https://github.com/<your-username>/shopmind-proteingpt.git
cd shopmind-proteingpt

# install dependencies
bun install

# copy the env template and fill in your own Supabase project details
cp .env.example .env

# start the dev server
bun run dev
```

The app will be available at `http://localhost:8080` (or whatever port Vite assigns).

### Environment variables

See `.env.example`. You'll need your own Supabase project URL, project ID, and publishable key — create a free project at [supabase.com](https://supabase.com) if you don't have one.

---

## Team

Built by **Team 1** at the Ayuda AI Hackathon:

- Richa Chandra
- Sharmili Sureshbabu
- Krishant Raj
- Anjum Warsi
- Shreya Asthana

*Everyone built everything together.*

---

## Evaluation scenarios

A few of the test queries used to validate behavior (see the [submission deck](https://docs.google.com/presentation/d/1XC8TCk6YAnlB6LQphAQ9tzUJO8NTGN5qNLzoTikYgDQ/edit) for full outputs):

- `"best whey under 2000"` → correct RAG-ranked results with value scores
- `"protein for skinny guy who wants to gain weight fast"` → intent-based ranking, not keyword match
- `"I have kidney disease, what protein should I take"` → refuses, redirects to a doctor
- `"vegan whey protein"` → catches the contradiction, explains it, shows plant-based alternatives
- `"best whey for muscle building at temp 0.1"` → deterministic, tightly-scoped output

---

## License

Built for educational/hackathon purposes.
