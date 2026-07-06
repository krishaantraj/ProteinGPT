import proteinData from "@/data/shopmind_protein_kb.json";
import type { Product, FilterState, ParsedQuery, UserPrefs } from "@/types/product";

const products = (proteinData as { products: Product[] }).products;

function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const BAD = [
    "https://www.amazon.in",
    "https://www.flipkart.com",
    "https://www.nutrabay.com",
  ];
  if (BAD.includes(url.trim())) return null;
  if (url.includes("/product-category/")) return null;
  if (url.length < 32) return null;
  if (url.includes("healthkart.com/sv/")) {
    const slug = url.split("/sv/")[1] ?? "";
    return `https://www.healthkart.com/search?q=${slug.replace(/\/.*$/, "").replace(/-/g, "+")}`;
  }
  return url;
}

const OUT_OF_SCOPE_PRODUCTS = [
  "creatine","pre-workout","preworkout","pre workout",
  "bcaa supplement","fat burner","weight loss pill","vitamin",
  "multivitamin","fish oil","omega-3","collagen supplement",
];
const OUT_OF_SCOPE_ADVICE = [
  "workout plan","exercise plan","diet plan","meal plan",
  "training program","training plan","fitness program",
];

export function parseQuery(query: string): ParsedQuery {
  const q = query.toLowerCase();
  const parsed: ParsedQuery = { intent: "search", keywords: [] };

  if (/\bcompare\b|\bvs\.?\b|\bversus\b/.test(q)) {
    parsed.compare = true;
    parsed.intent = "compare";
  }

  const MEDICAL = [
    "kidney","renal","diabet","pregnant","pregnancy","hypertension",
    "blood pressure","liver disease","cancer","heart disease","cardiac",
    "dialysis","epilep","thyroid","crohn","ibd","celiac",
  ];
  const foundMedical = MEDICAL.find(k => q.includes(k));
  if (foundMedical) {
    parsed.isMedical = true;
    parsed.medicalCondition = foundMedical;
    parsed.intent = "medical";
    return parsed;
  }

  const englishWords = q.split(/\s+/).filter(w => /^[a-z]{2,}$/.test(w));
  if (englishWords.length === 0 && q.trim().length > 0) {
    parsed.isNonsense = true;
    parsed.intent = "nonsense";
    return parsed;
  }

  // FIX 14: Out-of-scope detection — only trigger when query mentions OOS topic
  // and does NOT also mention protein/whey/supplement context
  const mentionsProtein = /protein|whey|casein|isolate|concentrate|gainer|powder|supplement/.test(q);
  const oosProd = OUT_OF_SCOPE_PRODUCTS.find(k => q.includes(k));
  const oosAdvice = OUT_OF_SCOPE_ADVICE.find(k => q.includes(k));
  if ((oosProd || oosAdvice) && !mentionsProtein) {
    parsed.intent = "out_of_scope";
    // Reuse isNonsense flag pathway is wrong — use a dedicated marker via medicalCondition? No.
    // We'll set isAmbiguous false and rely on contextMessage below; mark via custom field on parsed.
    (parsed as ParsedQuery & { isOutOfScope?: boolean; oosTopic?: string }).isOutOfScope = true;
    (parsed as ParsedQuery & { isOutOfScope?: boolean; oosTopic?: string }).oosTopic = oosProd || oosAdvice;
    return parsed;
  }

  // FIX 9: "protein" alone is NOT useful intent
  const hasUsefulIntent = /under|below|above|over|₹|\d{3,5}|vegan|plant|whey|casein|isolate|concentrate|gainer|keto|beginner|cut|lean|bulk|muscle|recovery|allerg|dairy|certif|labdoor|wada|grass|creatine|enzyme|between|rated|cheap|expensive|hydrolyz/.test(q);
  if (!parsed.compare && englishWords.length <= 3 && !hasUsefulIntent) {
    parsed.isAmbiguous = true;
    parsed.intent = "ambiguous";
  }

  const betweenM = q.match(/between\s*[₹rs.]?\s*(\d{3,5})\s*(?:and|to|-)\s*[₹rs.]?\s*(\d{3,5})/);
  if (betweenM) {
    parsed.budget_min = parseInt(betweenM[1], 10);
    parsed.budget_max = parseInt(betweenM[2], 10);
  } else {
    const underM = q.match(/(?:under|below|less\s*than|<)\s*[₹rs.]?\s*(\d{3,5})/);
    if (underM) parsed.budget_max = parseInt(underM[1], 10);
    const overM = q.match(/(?:above|over|more\s*than|>)\s*[₹rs.]?\s*(\d{3,5})/);
    if (overM) parsed.budget_min = parseInt(overM[1], 10);
  }

  // FIX 18: expanded protein regex
  const proteinM =
    q.match(/(\d{2})\s*g\+?\s*(?:protein|per\s*serving)/) ||
    q.match(/protein\s*(\d{2})\s*g/) ||
    q.match(/(?:above|more\s*than|at\s*least|minimum|min\.?|over)\s*(\d{2})\s*g/) ||
    q.match(/(\d{2})\s*grams?\s*protein/);
  if (proteinM) parsed.min_protein = parseInt(proteinM[1], 10);

  // FIX 5: expanded rating sort detection
  if (/highest.?rated|best.?rated|top.?rated|most.?reviewed|best.?rating|highest.?review|5.?star/.test(q)) parsed.sortHint = "rating_desc";
  else if (/cheapest|lowest.?price|most.?affordable/.test(q)) parsed.sortHint = "price_asc";
  else if (/most.?protein|highest.?protein/.test(q)) parsed.sortHint = "protein_desc";

  if (/dairy.?allerg|milk.?allerg|lactose.?intol|no\s+dairy|dairy.?free/.test(q)) parsed.dairyFree = true;
  if (/no.?creatine|without.?creatine|creatine.?free/.test(q)) parsed.noCreatine = true;
  if (/digestive.?enzyme|digezyme|aminogen|prohydrolase|\benz[iy]me/.test(q)) parsed.needsEnzymes = true;
  if (/grass.?fed|grassfed/.test(q)) parsed.proteinType = "grass-fed";
  if (/no.?artificial.?sweetener|no.?sucralose|no.?aspartame|no.?acesulfame|sweetener.?free|naturally.?sweetened|without.?sweetener/.test(q)) parsed.noSweeteners = true;
  if (/no.?added.?sugar|sugar.?free|zero.?sugar/.test(q)) parsed.noAddedSugar = true;
  if (/\bunflavoured\b|\bunflavored\b|plain\s+protein|no.?flavor/.test(q)) parsed.prefersUnflavoured = true;

  if (/labdoor/.test(q)) parsed.certFilter = "labdoor-certified";
  else if (/\bwada\b|wada.?nada|wada.?approved|drug.?test/.test(q)) parsed.certFilter = "wada-approved";
  else if (/informed.?sport/.test(q)) parsed.certFilter = "informed-sport";
  else if (/\bnabl\b/.test(q)) parsed.certFilter = "nabl-tested";

  // FIX 6: expanded brand exclusion
  const brandExM = q.match(/(?:not\s+from|not\s+by|no\s+(?!added|artificial)|avoid\s+|exclud\w*\s+|except\s+|without\s+|don'?t\s+want\s+|other\s+than\s+)(muscleblaze|nutrabay|flipkart|healthkart|amazon|on\b|optimum|dymatize|gnc|myprotein|nakpro|truebasics|avvatar|bigmuscles|labrada|as.?it.?is|asitis|isopure|nutrabolt|beastlife)/);
  if (brandExM) parsed.excludeBrand = brandExM[1].trim();

  if (/beginner|starter|first.?time|new\s+to|just\s+starting/.test(q)) parsed.goal = "beginner";
  else if (/cut|lean|shred|slim|fat.?loss/.test(q)) parsed.goal = "cutting";
  else if (/bulk|mass|gainer|weight.?gain|gain.?weight|skinny|gain.?fast|put.?on.?weight|want.+gain/.test(q)) parsed.goal = "bulking";
  else if (/recovery|overnight|sleep/.test(q)) parsed.goal = "recovery";
  else if (/muscle|gym|strength|build/.test(q)) parsed.goal = "muscle";

  // FIX 8: mass gainer detection runs before platform (it already does in the
  // category branch below). Keep category detection here.
  if (/mass.?gainer|weight.?gainer|skinny.+gain|gain.?weight.?fast|put.?on.?weight/.test(q)) {
    parsed.category = "Mass Gainer";
  } else if (/keto|low.?carb|zero.?carb/.test(q)) {
    parsed.category = "keto";
  } else if (/vegan|plant.?based|pea.?protein|plant\s+protein|dairy.?free\s+protein/.test(q)) {
    parsed.category = "Plant-Based Protein";
    parsed.vegan = true;
  } else if (/\bcasein\b|overnight\s+protein|slow.?release|micellar/.test(q)) {
    parsed.category = "Casein Protein";
  } else if (/hydrolyz/.test(q)) {
    parsed.category = "Whey Protein";
    parsed.proteinType = parsed.proteinType || "hydrolyzed";
  } else if (/\bisolate\b/.test(q)) {
    parsed.category = "Whey Protein";
    parsed.proteinType = parsed.proteinType || "isolate";
  } else if (/\bconcentrate\b/.test(q)) {
    parsed.category = "Whey Protein";
    parsed.proteinType = parsed.proteinType || "concentrate";
  } else if (/\bwhey\b/.test(q)) {
    parsed.category = "Whey Protein";
  }

  for (const [key] of [["amazon"],["flipkart"],["nutrabay"],["healthkart"],["muscleblaze"],["beastlife"]] as [string][]) {
    if (q.includes(key)) { parsed.platform = key; break; }
  }

  parsed.keywords = q.split(/\s+/).filter(w => w.length > 2);
  if (!parsed.intent || parsed.intent === "search") {
    parsed.intent = parsed.compare ? "compare"
      : parsed.isAmbiguous ? "ambiguous"
      : parsed.category ? `${parsed.category.toLowerCase().replace(/[^a-z]/g,"_")}_search`
      : "general_search";
  }

  return parsed;
}

export function applyFilters(items: Product[], filters: FilterState, platform: string): Product[] {
  return items.filter(p => {
    if (platform !== "All" && !p.platform.toLowerCase().includes(platform.toLowerCase())) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
    if (filters.maxBudget < 15000 && p.pricing.price_inr > filters.maxBudget) return false;
    if (filters.minBudget > 0 && p.pricing.price_inr < filters.minBudget) return false;
    if (filters.minProtein > 0 && Number(p.nutrition_per_serving.protein_g) < filters.minProtein) return false;
    if (filters.vegan && !p.tags.includes("vegan")) return false;
    if (filters.vegetarian && !p.suitable_for.includes("Vegetarian") && !p.suitable_for.includes("Vegan")) return false;
    if (filters.goals.length > 0) {
      const gm: Record<string,string[]> = {
        "Muscle Building":["muscle"],"Lean/Cutting":["lean","cutting"],
        "Beginners":["beginner"],"Keto":["keto","low-carb"],"Vegan":["vegan"],
        "Weight Gain":["weight-gain","mass-gainer","bulk"],
        "Overnight Recovery":["overnight","casein","recovery"],
      };
      const wanted = filters.goals.flatMap(g => gm[g] || []);
      if (!wanted.some(t => p.tags.includes(t))) return false;
    }
    if (filters.certifications.length > 0) {
      const cm: Record<string,string> = {
        "Labdoor USA":"labdoor-certified","NABL Tested":"nabl-tested",
        "FSSAI":"fssai","WADA Approved":"wada-approved","Informed Sport":"informed-sport",
      };
      const wanted = filters.certifications.map(c => cm[c]).filter(Boolean);
      const certText = p.formulation.certifications.join(" ").toLowerCase();
      if (!wanted.some(t => p.tags.includes(t) || certText.includes(t.replace("-"," ")))) {
        if (!filters.certifications.some(c => certText.includes(c.toLowerCase().split(" ")[0]))) return false;
      }
    }
    return true;
  });
}

export function valueScore(p: Product, prefs?: UserPrefs): number {
  const n = p.nutrition_per_serving;
  const protein = parseFloat(String(n.protein_g).replace("+","").replace("g","")) || 0;
  const servings = Number(n.servings_per_container) || 1;
  const price = p.pricing.price_inr || 1;
  const base = (protein * servings / price) * 1000;
  const certBonus = Math.min(p.formulation.certifications.length * 0.03, 0.15);
  const rating = Number(p.social_proof.rating) || 0;
  const ratingBonus = rating >= 4.5 ? 0.05 : rating >= 4.0 ? 0.02 : 0;
  const reviewStr = String(p.social_proof.review_count||"0").replace(/,/g,"").replace("+","");
  const reviews = parseInt(reviewStr,10)||0;
  const reviewBonus = reviews >= 10000 ? 0.05 : reviews >= 1000 ? 0.02 : 0;
  let pref = 1.0;
  if (prefs) {
    const gtm: Record<string,string[]> = {
      muscle:["muscle","whey"],cutting:["lean","cutting","isolate","low-carb"],
      bulk:["bulk","mass-gainer","weight-gain"],general:[],
    };
    if ((gtm[prefs.goal]||[]).some(t => p.tags.includes(t))) pref += 0.12;
    if (prefs.experience==="beginner" && p.tags.includes("digestive-enzymes")) pref += 0.08;
    if (prefs.experience==="advanced" && p.formulation.certifications.length>=2) pref += 0.08;
    if (prefs.vegan && p.tags.includes("vegan")) pref += 0.15;
    if (prefs.budget==="1500" && p.pricing.price_inr<=1500) pref += 0.10;
  }
  return Math.round(base*(1+certBonus+ratingBonus+reviewBonus)*pref*10)/10;
}

export function searchProducts(
  query: string, filters: FilterState, platform: string, prefs?: UserPrefs,
): { results: Product[]; parsed: ParsedQuery; matchedBeforeRank: number; contextMessage?: string } {

  const parsed = parseQuery(query);
  const parsedExt = parsed as ParsedQuery & { isOutOfScope?: boolean; oosTopic?: string };

  if (parsed.isMedical) {
    return { results:[], parsed, matchedBeforeRank:0,
      contextMessage:`MEDICAL:${parsed.medicalCondition}` };
  }
  if (parsed.isNonsense) {
    return { results:[], parsed, matchedBeforeRank:0, contextMessage:"NONSENSE" };
  }
  if (parsedExt.isOutOfScope) {
    return { results:[], parsed, matchedBeforeRank:0,
      contextMessage:`OUT_OF_SCOPE:${parsedExt.oosTopic||"unknown"}` };
  }
  if (parsed.isAmbiguous) {
    return { results:[], parsed, matchedBeforeRank:0, contextMessage:"AMBIGUOUS" };
  }

  const q = query.toLowerCase();
  const hasStructuredFilter = !!(
    parsed.category || parsed.budget_max || parsed.budget_min ||
    parsed.vegan || parsed.platform || parsed.goal || parsed.dairyFree ||
    parsed.certFilter || parsed.proteinType || parsed.needsEnzymes ||
    parsed.noCreatine || parsed.excludeBrand || parsed.min_protein
  );

  let pool = products.slice();

  // FIX 5: ratings sort ignores category filter so high-rated items surface
  const ignoreCategoryForRating = parsed.sortHint === "rating_desc";

  // FIX 2: dairy allergy strict filter (applied before anything else)
  if (parsed.dairyFree) {
    pool = pool.filter(p => {
      const ptype = (p.protein_type || "").toLowerCase();
      const cat = p.category;
      if (cat === "Whey Protein" || cat === "Casein Protein") return false;
      if (/whey|casein|milk|dairy/.test(ptype)) return false;
      return p.tags.includes("vegan") || cat === "Plant-Based Protein";
    });
  }

  // FIX 4: keto includes carbs_g <= 2 fallback
  if (parsed.category === "keto") {
    pool = pool.filter(p =>
      p.tags.includes("keto") ||
      p.tags.includes("low-carb") ||
      (Number(p.nutrition_per_serving.carbs_g) || 99) <= 2
    );
    parsed.category = undefined;
  } else if (parsed.category && !ignoreCategoryForRating) {
    // FIX 20: when proteinType is isolate/concentrate/hydrolyzed, don't double-apply
    // a hard category filter (proteinType filter below is enough).
    const skipCat = parsed.proteinType && parsed.category === "Whey Protein" &&
      ["isolate","concentrate","hydrolyzed"].includes(parsed.proteinType);
    if (!skipCat) {
      const catPool = pool.filter(p => p.category === parsed.category);
      pool = catPool.length > 0 ? catPool : (hasStructuredFilter ? [] : pool);
    }

    // FIX 10: Whey category excludes yeast/grass-fed unless user asked
    if (parsed.category === "Whey Protein" && /\bwhey\b/.test(q)) {
      const wantsYeast = /yeast|fermented/.test(q);
      const wantsGrass = /grass.?fed/.test(q);
      pool = pool.filter(p => {
        const name = p.product_name.toLowerCase();
        const isYeast = name.includes("yeast") || p.tags.includes("yeast-protein");
        const isGrassFed = p.tags.includes("grass-fed");
        if (isYeast && !wantsYeast) return false;
        if (isGrassFed && !wantsGrass && parsed.proteinType !== "grass-fed") return false;
        return true;
      });
    }
  }

  if (parsed.proteinType) {
    const tagMap: Record<string,string> = {
      "isolate":"isolate","concentrate":"concentrate",
      "hydrolyzed":"hydrolyzed","grass-fed":"grass-fed",
    };
    const tag = tagMap[parsed.proteinType];
    if (tag) pool = pool.filter(p => p.tags.includes(tag));
  }

  if (parsed.certFilter) {
    pool = pool.filter(p =>
      p.tags.includes(parsed.certFilter!) ||
      p.formulation.certifications.some(c =>
        c.toLowerCase().includes(parsed.certFilter!.replace("-"," "))
      )
    );
  }

  // FIX 3: enzyme filter is additive
  if (parsed.needsEnzymes) {
    pool = pool.filter(p => p.tags.includes("digestive-enzymes"));
  }

  if (parsed.noSweeteners) {
    const SWEETENERS = ["sucralose","aspartame","acesulfame","saccharin","ace-k","neotame","advantame"];
    pool = pool.filter(p => {
      const ings = p.formulation.ingredients.map(i => i.toLowerCase());
      return !SWEETENERS.some(s => ings.some(i => i.includes(s)));
    });
  }
  if (parsed.noAddedSugar) {
    const SUGARS = ["sugar","dextrose","maltodextrin","fructose","glucose syrup","sucrose"];
    pool = pool.filter(p => {
      const ings = p.formulation.ingredients.map(i => i.toLowerCase());
      return !SUGARS.some(s => ings.some(i => i.includes(s)));
    });
  }
  if (parsed.prefersUnflavoured) {
    const unflavoured = pool.filter(p => p.tags.includes("unflavoured") || p.variant.flavor.toLowerCase().includes("unflavour"));
    const rest = pool.filter(p => !p.tags.includes("unflavoured") && !p.variant.flavor.toLowerCase().includes("unflavour"));
    pool = [...unflavoured, ...rest];
  }

  if (parsed.noCreatine) {
    pool = pool.filter(p => !p.tags.includes("with-creatine"));
  }

  if (parsed.excludeBrand) {
    const excl = parsed.excludeBrand.toLowerCase();
    pool = pool.filter(p => !p.brand.toLowerCase().includes(excl));
  }

  if (parsed.budget_max) pool = pool.filter(p => p.pricing.price_inr <= parsed.budget_max!);
  if (parsed.budget_min) pool = pool.filter(p => p.pricing.price_inr >= parsed.budget_min!);

  if (parsed.min_protein) {
    pool = pool.filter(p => Number(p.nutrition_per_serving.protein_g) >= parsed.min_protein!);
  }

  if (parsed.vegan && !parsed.dairyFree) pool = pool.filter(p => p.tags.includes("vegan"));

  if (parsed.platform) {
    pool = pool.filter(p => p.platform.toLowerCase().includes(parsed.platform!));
  }

  if (parsed.goal && parsed.goal !== "muscle") {
    const goalTags: Record<string,string[]> = {
      beginner:["beginner"], cutting:["lean","cutting","isolate"],
      bulking:["bulk","mass-gainer","weight-gain"], recovery:["overnight","casein","recovery"],
    };
    const wanted = goalTags[parsed.goal] || [];
    if (wanted.length > 0) {
      const goalPool = pool.filter(p => wanted.some(t => p.tags.includes(t)));
      if (goalPool.length > 0) pool = goalPool;
    }
  }

  if (!hasStructuredFilter && pool.length === products.length) {
    const kws = parsed.keywords.filter(w => w.length > 3);
    if (kws.length > 0) {
      const kp = products.filter(p => {
        const txt = (p.rag_text+" "+p.brand+" "+p.product_name+" "+p.tags.join(" ")).toLowerCase();
        return kws.some(k => txt.includes(k));
      });
      if (kp.length > 0) pool = kp;
    }
  }

  if (pool.length === 0) {
    const hasPlatform = !!parsed.platform;
    const hasBudget = !!(parsed.budget_max || parsed.budget_min);
    // FIX 8: When platform+budget zero, fallback is cheapest from SAME platform only
    if (hasPlatform) {
      const samePlat = products.filter(p => p.platform.toLowerCase().includes(parsed.platform!));
      const ctx = hasBudget
        ? `ZERO_RESULTS_PLATFORM_BUDGET:${parsed.platform}:${parsed.budget_max||parsed.budget_min}`
        : `ZERO_RESULTS_PLATFORM:${parsed.platform}`;
      const fallback = samePlat
        .sort((a,b) => a.pricing.price_inr - b.pricing.price_inr)
        .slice(0,2);
      return {
        results: fallback.map(p => ({...p, url:safeUrl(p.url)})),
        parsed, matchedBeforeRank:0, contextMessage:ctx,
      };
    }
    let fallback = products.slice();
    if (parsed.budget_max) fallback = fallback.filter(p => p.pricing.price_inr <= parsed.budget_max!);
    if (parsed.budget_min) fallback = fallback.filter(p => p.pricing.price_inr >= parsed.budget_min!);
    fallback = fallback.sort((a,b) => a.pricing.price_inr - b.pricing.price_inr).slice(0,3);
    return {
      results: fallback.map(p => ({...p, url:safeUrl(p.url)})),
      parsed, matchedBeforeRank:0, contextMessage:"ZERO_RESULTS",
    };
  }

  const filtered = applyFilters(pool, filters, platform);
  const final = filtered.length > 0 ? filtered : pool;

  if (parsed.compare) {
    const vsParts = q.replace(/\bcompare\b/g,"").split(/\bvs\.?\b|\bversus\b/);
    const s1kws = (vsParts[0]||"").trim().split(/\s+/).filter(w=>w.length>2);
    const s2kws = (vsParts[1]||"").trim().split(/\s+/).filter(w=>w.length>2);

    // FIX 12: vague compare detects platform-only or category-only sides
    const platWords = ["amazon","flipkart","nutrabay","healthkart","muscleblaze"];
    const categoryWords = ["whey","protein","casein","isolate","gainer","concentrate","powder"];
    const sideIsVague = (kws: string[]) => {
      if (kws.length === 0) return true;
      return kws.every(k => platWords.includes(k) || categoryWords.includes(k));
    };
    if (sideIsVague(s1kws) || sideIsVague(s2kws)) {
      return { results:[], parsed, matchedBeforeRank:0, contextMessage:"VAGUE_COMPARE" };
    }

    const scoreMatch = (p: Product, kws: string[]) => {
      const h = (p.brand+" "+p.product_name+" "+p.platform+" "+p.tags.join(" ")).toLowerCase();
      return kws.filter(k=>h.includes(k)).length;
    };

    if (s1kws.length>0 && s2kws.length>0) {
      const s1 = [...products].sort((a,b)=>scoreMatch(b,s1kws)-scoreMatch(a,s1kws));
      const s2 = [...products].sort((a,b)=>scoreMatch(b,s2kws)-scoreMatch(a,s2kws));

      // FIX 13: require at least 2 keyword matches
      if (scoreMatch(s1[0],s1kws) < 2) {
        return { results:[], parsed, matchedBeforeRank:0,
          contextMessage:`PRODUCT_NOT_FOUND:${s1kws.join(" ")}` };
      }
      if (scoreMatch(s2[0],s2kws) < 2) {
        return { results:[], parsed, matchedBeforeRank:0,
          contextMessage:`PRODUCT_NOT_FOUND:${s2kws.join(" ")}` };
      }

      // FIX 11: dedupe by product_name, take best-value variant per side, 1 per side
      const pickBestVariant = (sorted: Product[], kws: string[]): Product | null => {
        const matches = sorted.filter(p => scoreMatch(p, kws) >= 2);
        if (matches.length === 0) return null;
        const nameKey = matches[0].product_name.toLowerCase().slice(0,35);
        const variants = matches.filter(p => p.product_name.toLowerCase().slice(0,35) === nameKey);
        return variants.sort((a,b) => valueScore(b) - valueScore(a))[0];
      };
      const p1 = pickBestVariant(s1, s1kws);
      const p2 = pickBestVariant(s2, s2kws);
      const picks: Product[] = [];
      if (p1) picks.push(p1);
      if (p2 && (!p1 || p2.id !== p1.id)) picks.push(p2);

      if (picks.length>=2) {
        return { results:picks.map(p=>({...p,url:safeUrl(p.url)})),
          parsed, matchedBeforeRank:picks.length };
      }
    }
  }

  const qLower = q;
  const qWords = qLower.split(/\s+/).filter(w=>w.length>2);
  const relevance = (p: Product) => {
    const h = (p.product_name+" "+p.brand+" "+p.category).toLowerCase();
    return qWords.filter(w=>h.includes(w)).length;
  };
  const effectiveSort = parsed.sortHint || (parsed.proteinType ? "value_desc" : filters.sortBy);

  const ranked = final.sort((a,b) => {
    switch(effectiveSort) {
      case "price_asc":    return a.pricing.price_inr - b.pricing.price_inr;
      case "price_desc":   return b.pricing.price_inr - a.pricing.price_inr;
      case "rating_desc":  return (Number(b.social_proof.rating)||0)-(Number(a.social_proof.rating)||0);
      case "protein_desc": return (Number(b.nutrition_per_serving.protein_g)||0)-(Number(a.nutrition_per_serving.protein_g)||0);
      default: {
        const rd = relevance(b)-relevance(a);
        if (rd!==0) return rd;
        const vd = valueScore(b,prefs)-valueScore(a,prefs);
        if (Math.abs(vd)<50) {
          const ratingDiff = (Number(b.social_proof.rating)||0)-(Number(a.social_proof.rating)||0);
          if (ratingDiff!==0) return ratingDiff;
        }
        return vd;
      }
    }
  });

  const results = ranked.slice(0,5).map(p=>({...p,url:safeUrl(p.url)}));
  return { results, parsed, matchedBeforeRank:final.length };
}

export function generateAIResponse(
  query: string, results: Product[], isCompare: boolean,
  prefs?: UserPrefs, contextMessage?: string,
): string {
  if (contextMessage?.startsWith("MEDICAL:")) {
    const c = contextMessage.split(":")[1]||"your condition";
    return `I'm not able to advise on protein choices for **${c}**. Please consult your doctor or a registered dietitian before making any supplement decisions.\n\nOnce you have medical clearance, I can help you find the right protein.`;
  }
  if (contextMessage==="NONSENSE") {
    return `I didn't understand that — could you rephrase?\n\nFor example:\n- *"best whey protein under ₹2000"*\n- *"protein for muscle building"*\n- *"vegan protein with digestive enzymes"*`;
  }
  if (contextMessage?.startsWith("OUT_OF_SCOPE:")) {
    const t = contextMessage.split(":")[1] || "that";
    return `I only cover protein powders, so I don't have **${t}** in my database.\n\nWould you like me to suggest protein powders instead?`;
  }
  if (contextMessage==="AMBIGUOUS") {
    return `What's your main goal — **muscle building, fat loss, weight gain, or general fitness**? And what's your budget?`;
  }
  if (contextMessage==="VAGUE_COMPARE") {
    return `I need specific product names to compare — not platforms or categories.\n\nFor example: *"compare MuscleBlaze Biozyme vs ON Gold Standard"*\n\nWhat two products would you like me to compare?`;
  }
  if (contextMessage?.startsWith("PRODUCT_NOT_FOUND:")) {
    const missing = contextMessage.split(":")[1];
    return `**"${missing}"** is not in my knowledge base. I cannot guess its specifications.\n\nWould you like me to find the closest available alternative instead?`;
  }
  if (contextMessage?.startsWith("ZERO_RESULTS_PLATFORM_BUDGET:")) {
    const [,plat,budget] = contextMessage.split(":");
    const nearest = results[0];
    const nearestInfo = nearest
      ? ` Closest on ${plat}: **${nearest.brand} ${nearest.product_name.split(" ").slice(0,4).join(" ")}** at ₹${nearest.pricing.price_inr.toLocaleString("en-IN")}.`
      : "";
    return `No products available on **${plat}** under ₹${Number(budget).toLocaleString("en-IN")}.${nearestInfo}\n\nWould you like options from other platforms under ₹${Number(budget).toLocaleString("en-IN")}, or ${plat} options at any budget?`;
  }
  if (contextMessage?.startsWith("ZERO_RESULTS_PLATFORM:")) {
    const plat = contextMessage.split(":")[1];
    return `No matching products on **${plat}**. Showing cheapest available items on that platform.`;
  }
  if (results.length===0) {
    const ql = query.toLowerCase();
    const suggestions: string[] = [];
    if (ql.includes("informed sport")) suggestions.push("only 3 Informed Sport certified products exist — try 'Labdoor certified' for 16 options");
    if (ql.includes("keto")) suggestions.push("only 5 keto-compatible products in database — keto is very limited");
    if (ql.includes("30g")) suggestions.push("few products exceed 30g protein — try '27g+' instead");
    return `No products matched your filters.${suggestions.length > 0 ? `\n\nNote: ${suggestions[0]}` : ""}\n\nSuggestions:\n- Widen budget range (drag slider right)\n- Remove a category or certification filter\n- Switch platform to "All"\n- Simplify your query`;
  }
  if (isCompare && results.length>=2) {
    const names = results.map(r=>`**${r.brand.split(" ")[0]} ${r.product_name.split(" ").slice(0,3).join(" ")}**`).join(" vs ");
    return `Comparing ${names} — ranked by nutrition density, value score, and certifications.`;
  }
  const top = results[0];
  const topScore = valueScore(top,prefs);
  const cert = top.formulation.certifications.slice(0,2).join(", ");
  const disc = top.pricing.discount_pct>5 ? ` ${Math.round(top.pricing.discount_pct)}% off.` : "";
  const others = results.slice(1,3).map(r=>
    `- **${r.brand.split(" ")[0]} ${r.product_name.split(" ").slice(0,4).join(" ")}** — ₹${r.pricing.price_inr.toLocaleString("en-IN")}, ${r.nutrition_per_serving.protein_g}g protein`
  ).join("\n");
  return `Found **${results.length}** product${results.length===1?"":"s"}.

**Top: ${top.brand} ${top.product_name}** (${top.variant.flavor}, ${top.variant.size})
₹${top.pricing.price_inr.toLocaleString("en-IN")} · **${top.nutrition_per_serving.protein_g}g protein** · ${top.nutrition_per_serving.servings_per_container} servings · Score **${topScore.toFixed(0)}**${cert?` · ${cert}`:""}${disc}

${others}

*Score = protein × servings ÷ price × 1000, adjusted for certs, rating & reviews${prefs?.goal&&prefs.goal!=="general"?`, personalised for ${prefs.goal} goal`:""}.*`;
}
