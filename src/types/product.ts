export interface Product {
  id: string;
  platform: string;
  brand: string;
  product_name: string;
  url: string | null;
  variant: { flavor: string; size: string };
  pricing: { price_inr: number; mrp_inr: number; discount_pct: number };
  category: string;
  protein_type: string;
  primary_source: string;
  nutrition_per_serving: {
    protein_g: number;
    serving_size_g: number;
    servings_per_container: number;
    bcaa_g: number;
    eaa_g: number;
    calories: number;
    carbs_g: number;
    fat_g: number;
  };
  formulation: {
    ingredients: string[];
    added_extras: string[];
    certifications: string[];
  };
  suitable_for: string;
  goal_fit: string;
  use_case: string;
  short_description: string;
  social_proof: { rating: number; review_count: string; bestseller_tag: string | null };
  tags: string[];
  rag_text: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: Product[];
  isComparison?: boolean;
  timestamp: string;
  filterDesc?: string;
}

export interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

export interface FilterState {
  categories: string[];
  minBudget: number;
  maxBudget: number;
  minProtein: number;
  goals: string[];
  certifications: string[];
  vegan: boolean;
  vegetarian: boolean;
  sortBy: "price_asc" | "price_desc" | "rating_desc" | "value_desc" | "protein_desc";
}

export interface UserPrefs {
  goal: string;
  budget: string;
  experience: string;
  proteinMin: number;
  vegan: boolean;
}

export interface ParsedQuery {
  intent: string;
  keywords: string[];
  compare?: boolean;
  budget_max?: number;
  budget_min?: number;
  min_protein?: number;
  goal?: string;
  category?: string;
  vegan?: boolean;
  platform?: string;
  sortHint?: "price_asc" | "price_desc" | "rating_desc" | "protein_desc";
  dairyFree?: boolean;
  noCreatine?: boolean;
  needsEnzymes?: boolean;
  excludeBrand?: string;
  proteinType?: string;
  certFilter?: string;
  isAmbiguous?: boolean;
  isMedical?: boolean;
  medicalCondition?: string;
  isNonsense?: boolean;
  noSweeteners?: boolean;
  noAddedSugar?: boolean;
  prefersUnflavoured?: boolean;
}
