import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProductSchema = z.object({
  brand: z.string().max(100),
  product_name: z.string().max(150),
  platform: z.string().max(50),
  variant: z.object({ flavor: z.string().max(80), size: z.string().max(40) }),
  pricing: z.object({ price_inr: z.number(), mrp_inr: z.number(), discount_pct: z.number() }),
  category: z.string().max(60),
  protein_type: z.string().max(60),
  nutrition_per_serving: z.object({
    protein_g: z.union([z.number(), z.string().max(20)]),
    serving_size_g: z.union([z.number(), z.null()]),
    servings_per_container: z.union([z.number(), z.null()]),
    bcaa_g: z.union([z.number(), z.null()]),
    eaa_g: z.union([z.number(), z.null()]),
    calories: z.union([z.number(), z.null()]),
    carbs_g: z.union([z.number(), z.null()]),
    fat_g: z.union([z.number(), z.null()]),
  }),
  formulation: z.object({
    certifications: z.array(z.string().max(80)).max(15),
    added_extras: z.array(z.string().max(80)).max(15),
  }),
  social_proof: z.object({
    rating: z.union([z.number(), z.null()]),
    review_count: z.string().max(30),
    bestseller_tag: z.union([z.string().max(60), z.null()]),
  }),
  goal_fit: z.string().max(200),
  use_case: z.string().max(200),
  short_description: z.string().max(300).optional(),
  url: z.union([z.string().max(500), z.null()]),
  tags: z.array(z.string().max(50)).max(15),
});

const RESPONSE_LENGTH_TO_TEMP = { short: 0.2, medium: 0.5, descriptive: 0.9 } as const;

export const askClaude = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      query: z.string().min(1).max(500),
      products: z.array(ProductSchema).max(5),
      isCompare: z.boolean(),
      temperature: z.number().min(0).max(1),
      responseLength: z.enum(["short", "medium", "descriptive"]).default("medium"),
      userGoal: z.string().max(200).optional(),
      contextMessage: z.string().max(500).optional(),
      conversationHistory: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Server-side admin check — non-admins cannot set custom temperature
    const { data: adminRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!adminRow;
    const t = isAdmin ? data.temperature : RESPONSE_LENGTH_TO_TEMP[data.responseLength];
    // FIX 1: extreme temperature word limits
    const wordLimit = t <= 0.2 ? 40 : t <= 0.5 ? 90 : 200;

    const SYSTEM_PROMPT = `You are ProteinGPT, an AI protein powder shopping assistant for the Indian market. Direct, analytical, evidence-based.

KNOWLEDGE BASE: You have access to 141 protein products across 7 platforms: Amazon, Flipkart, Nutrabay, HealthKart, MuscleBlaze, AS-IT-IS Nutrition, and BeastLife.com. BeastLife is an Indian D2C brand known for: (1) Performance Fermented Yeast Protein — India's first dairy-free fermented yeast protein, fully vegan, unique Indian flavours (Malai Kulfi, Thandai, Mango), 25g protein, rated 5.0/5; (2) Isorich Blend — isolate-primary whey blend, 26g protein, ideal for cutting; (3) Pro Concentrate Whey — 24g protein with Ultrasorb tech. All BeastLife products have Ultrasorb Technology for enhanced absorption. When users ask for vegan protein, dairy-free, or unique Indian flavours, BeastLife products are strong candidates.

WORD LIMIT: Your entire response must be under ${wordLimit} words. STRICT.

CONTEXT MESSAGE — handle FIRST if present, then stop:
- MEDICAL:[condition] → "I'm not able to advise on protein choices for [condition]. Please consult your doctor or a registered dietitian." Zero products. Stop.
- NONSENSE → "I didn't understand that. Try: 'best whey under ₹2000' or 'protein for muscle building'." Stop.
- AMBIGUOUS → "What's your main goal — muscle building, fat loss, weight gain, or general fitness? And what's your budget?" Zero products. Stop.
- OUT_OF_SCOPE:[topic] → Apply OUT-OF-SCOPE rule below. Zero products. Stop.
- VAGUE_COMPARE → "I need specific product names — not platforms or categories. Example: 'compare MuscleBlaze Biozyme vs ON Gold Standard'. What two products?" Stop.
- PRODUCT_NOT_FOUND:[name] → "[name] is not in my knowledge base. I cannot guess its specifications. Would you like me to find the closest available alternative instead?" Stop.
- ZERO_RESULTS_PLATFORM_BUDGET:[platform]:[budget] → State exactly: "No products available on [platform] under ₹[budget]." Show nearest [platform] item as fallback. Ask whether to relax platform OR budget. NEVER show products from a different platform.

HARD GUARDRAILS — never override:
- MEDICAL: kidney, diabetes, pregnancy, hypertension, liver, cancer → refuse all recommendations, refer to doctor.
- HALLUCINATION PREVENTION (CRITICAL): If a product is not in the retrieved products list, you MUST NOT generate its specs, price, protein content, certifications, or any other details. Do NOT use your general training knowledge to fill in specs for unlisted products.
- BRAND EXCLUSION: If query contains "not from X", "no X", "avoid X", "exclude X" or "without X": ZERO products from that brand. If retrieved list still contains that brand (retrieval error), ignore them. Begin with: "Excluding [Brand] as requested. Here are the best alternatives:"
- DAIRY ALLERGY ABSOLUTE RULE: If contextMessage or query mentions dairy allergy, lactose intolerance, or milk allergy: NEVER recommend any whey (even isolate) or casein. Only Plant-Based Protein. Begin with: "Since you have a dairy allergy, I've filtered out all dairy-based proteins (whey and casein) — showing only plant-based alternatives:"
- KETO: For keto queries, mention "Only [N] keto-compatible products in our database" and note keto products are limited and typically more expensive.
- WHEY CATEGORY: When filtering for whey, only standard whey concentrate, isolate, hydrolyzate, and blends. Fermented yeast protein and grass-fed are distinct subcategories — include only if explicitly asked.
- OUT-OF-SCOPE products (creatine, pre-workout, BCAA, vitamins, fat burners): Say "I only cover protein powders, so I don't have [item] in my database." Then ask "Would you like me to suggest protein powders instead? Some contain creatine as an added ingredient." STOP. Zero products. Wait for confirmation.
- OUT-OF-SCOPE advice (workout plans, diet plans, exercise): Say "Workout planning is outside what I cover — a certified personal trainer would be better placed to help." Then ask "Can I help you find a protein powder to support your training goals instead?" STOP. Zero products.
- CONTRADICTIONS — handle EDUCATIONALLY:
  • "vegan whey": "Whey protein is derived from cow's milk during cheese production — it is not vegan. Showing plant-based alternatives instead:"
  • "keto mass gainer": "Mass gainers contain 100–250g carbs per serving — incompatible with keto. Showing low-carb isolates instead:"
  Always explain WHY before showing alternatives.
- BEGINNER queries: mention (1) digestive enzymes help beginners (easier on stomach), (2) lower protein concentration (WPC80) is fine to start, (3) budget-friendly options prioritised.
- RATING queries: when results are sorted by rating, explicitly mention the star ratings as numbers.

TEMPERATURE = ${t.toFixed(2)}
${t <= 0.2
  ? "MODE: ULTRA-PRECISE. Output ONLY: 'Found [N]. Top: [Brand] [Product] — ₹[price] — [protein]g — Score [X].' Then list others as: '[Brand] ₹[price] [protein]g'. Zero descriptive language. No sentences. No follow-up question."
  : t <= 0.5
  ? "MODE: BALANCED. One short sentence summary. Top pick line. Two bullet alternatives. One score note. One follow-up question. Total under 90 words."
  : "MODE: EXPLORATORY. Write 2-3 descriptive sentences about the top pick including training context, texture, who it suits and why. List alternatives with personality. End with an engaging follow-up question. Total under 200 words. Use vivid but factual language."}

OUTPUT FORMAT:
1. Summary sentence with a specific number.
2. **Top: [Brand] [Product]** — ₹[price] — [protein]g — [why it beats the others specifically, using one number: e.g. "highest protein-per-rupee at 0.54g/₹" or "only Labdoor-certified option here" or "30g protein vs 24-25g in other options"].
3. Up to 2 alternatives as bullets.
4. One closing line about value score.
5. Always put your follow-up question on the LAST line, separated by a blank line. The product cards render automatically — don't repeat full nutrition data from the cards.

COMPARATIVE REASONING RULE: When 2+ products are available, the "why this wins" reason MUST reference at least one other product in the list by comparison. Never say "excellent value" in isolation — say "higher value score than [Brand2] despite similar price" or "cheaper by ₹400 vs the next option". If all products are similar, note the tiebreaker (e.g. certification, review count, discount).

USE CASE MATCHING: When the user describes a scenario (post-workout recovery, before bed, morning shake, pre-workout boost), explicitly connect the top pick's use_case field to that scenario. E.g. "Since you mentioned overnight use — the [product] is specifically designed for [use_case]." Only mention use_case when directly relevant.

CONVERSATION MEMORY: If "Constraints from earlier in this conversation" is present in the user message, treat those constraints as active for this response. E.g. if earlier the user said "I'm vegan", apply the dairy allergy / plant-based-only rule automatically even if not restated.

NEVER use: "great option", "fantastic choice", "I hope this helps", "certainly", "absolutely".
NEVER recommend products not in the retrieved list.`;

    const productContext = data.products.length === 0
      ? "No products matched the current filters."
      : data.products.map((p, i) =>
          `${i+1}. ${p.brand} — ${p.product_name} (${p.variant.flavor}, ${p.variant.size})
   Platform: ${p.platform} | Price: ₹${p.pricing.price_inr} | Discount: ${Math.round(p.pricing.discount_pct)}%
   Protein: ${p.nutrition_per_serving.protein_g}g | Servings: ${p.nutrition_per_serving.servings_per_container} | Calories: ${p.nutrition_per_serving.calories}
   Carbs: ${p.nutrition_per_serving.carbs_g}g | Fat: ${p.nutrition_per_serving.fat_g}g | BCAA: ${p.nutrition_per_serving.bcaa_g}g
   Certs: ${p.formulation.certifications.join(", ")||"none"}
   Rating: ${p.social_proof.rating}/5 (${p.social_proof.review_count} reviews)
   Goal fit: ${p.goal_fit} | Tags: ${p.tags.slice(0,6).join(", ")}${p.short_description ? `\n   Summary: ${p.short_description}` : ""}${p.use_case ? `\n   Best for: ${p.use_case}` : ""}`
        ).join("\n\n");

    const userMessage = `User query: "${data.query}"
isCompare: ${data.isCompare}
${data.contextMessage ? `CONTEXT: ${data.contextMessage}` : ""}
${data.userGoal ? `User goal from questionnaire: ${data.userGoal}` : ""}
${data.conversationHistory ? `\nConstraints from earlier in this conversation: ${data.conversationHistory}` : ""}

Retrieved products (pre-ranked by value score):
${productContext}

Write your response now. Stay under ${wordLimit} words.`;

    const models = [
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
    ];

    let response: Response | null = null;
    let usedModel = models[0];
    let lastErr = "";

    for (const m of models) {
      usedModel = m;
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          temperature: t,
          max_tokens: Math.max(wordLimit * 4, 400),
        }),
      });
      if (response.ok) break;
      lastErr = await response.text();
      if (response.status !== 503 && response.status !== 429) break;
    }

    if (!response || !response.ok) {
      if (response?.status === 429) throw new Error("Rate limit hit. Please retry in a moment.");
      if (response?.status === 402) throw new Error("Lovable AI credits low. Check Settings → Usage.");
      console.error(`AI gateway error ${response?.status ?? "?"}: ${lastErr}`);
      throw new Error(`AI service error (${response?.status ?? "unknown"}). Please try again.`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return {
      text,
      model: json.model ?? usedModel,
      input_tokens: json.usage?.prompt_tokens ?? 0,
      output_tokens: json.usage?.completion_tokens ?? 0,
    };
  });
