import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { Coffee, Sun, Moon, Plus, Trash2, Loader2, Sparkles, Camera, X, Check, Pencil, AlertCircle, Bookmark, UtensilsCrossed } from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/dataCache";
import { getLocalDateStr } from "@/lib/dateUtils";
import {
  AppleActivityRing,
  APPLE_FITNESS_MACRO_PALETTES,
  getMacroStatusCue,
  type RingData
} from "@/components/ui/AppleActivityRing";

type MealType = "breakfast" | "lunch" | "dinner" | "snacks";
type MacroEntry = { id: string; name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number; loggedAt: string; };
type DayLog = { breakfast: MacroEntry[]; lunch: MacroEntry[]; dinner: MacroEntry[]; snacks: MacroEntry[]; };
type MealPlan = { day: string; breakfast: string[]; lunch: string[]; dinner: string[]; };

import { calculateMacroTargets } from "@/lib/nutritionCalculator";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function calcTargets(profile: any) {
  const targets = calculateMacroTargets(profile);
  return {
    calories: targets.calories,
    protein: targets.protein,
    carbs: targets.carbs,
    fats: targets.fats
  };
}

export type StapleMeal = {
  id: string;
  name: string;
  recipe: string;
  portionSize?: string;
  mealType: MealType | "any";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  createdAt: string;
};

const todayStr = () => getLocalDateStr();

const mealConfig: { key: MealType; label: string; icon: any; color: string; bg: string; border: string }[] = [
  { key: "breakfast", label: "Breakfast", icon: Coffee,   color: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20"   },
  { key: "lunch",     label: "Lunch",     icon: Sun,      color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { key: "dinner",    label: "Dinner",    icon: Moon,     color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20"    },
  { key: "snacks",    label: "Snacks",    icon: Sparkles, color: "text-purple-400",  bg: "bg-purple-400/10",  border: "border-purple-400/20"  },
];

// ─── Food Name Sanitizer (Strips -1pc, 2 nos, (LIMITED), etc.) ─────────────────
export function cleanFoodName(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\s*\((?:limited|unlimited|special|extra)\)/gi, "")
    .replace(/^(\d+(?:\.\d+)?)\s*(?:pc|pcs|nos?|pieces?|slices?|cups?|glasses?|bowls?|ladles?)\s*(?:of\s+)?/i, "")
    .replace(/[-–—]\s*\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm|katori)?$/i, "")
    .replace(/\(\s*\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm|katori)?\s*\)/i, "")
    .replace(/\s+\d+(?:\.\d+)?\s*(?:pc|pcs|nos?|piece|pieces|slice|slices|plate|bowl|cup|glass|ml|g|gm|katori)?$/i, "")
    .replace(/^[-,:.]+|[-,:.]+$/g, "")
    .trim();
}

// ─── Clean and validate macro values ──────────────────────────────────────────
export function sanitizeMacros(raw: { calories?: number; protein?: number; carbs?: number; fats?: number }) {
  const calories = Math.max(0, Math.round(Number(raw.calories) || 0));
  const protein  = Math.max(0, Math.round((Number(raw.protein) || 0) * 10) / 10);
  const carbs    = Math.max(0, Math.round((Number(raw.carbs) || 0) * 10) / 10);
  const fats     = Math.max(0, Math.round((Number(raw.fats) || 0) * 10) / 10);
  
  const finalCals = calories > 0 ? calories : Math.round(protein * 4 + carbs * 4 + fats * 9);
  
  return {
    calories: finalCals,
    protein,
    carbs,
    fats,
  };
}

// ─── Universal Quantity Multiplier Math ───────────────────────────────────────
export function parseQuantityMultiplier(quantity: string, foodName = ""): number {
  const q = quantity.toLowerCase().trim();
  const f = cleanFoodName(foodName).toLowerCase().trim();
  if (!q) return 1.0;

  // 1. Separate the main unit from parenthetical descriptions (e.g. "(~100ml)", "(~150g)")
  // Descriptive context like "(~100ml)" must NEVER distort multiplier calculations!
  const mainText = q.replace(/\([^)]*\)/g, "").trim();

  // 2. Explicit fractional / half / small qualifiers
  if (/\b(?:half|0\.5|1\/2)\s*(?:ladle|paddle|glass|cup|mug|serving|plate|piece|slice|scoop)?\b/i.test(mainText)) return 0.5;
  if (/\b(?:quarter|0\.25|1\/4)\b/i.test(mainText)) return 0.25;
  if (/small\s+(?:ladle|paddle|cup|portion|piece)/i.test(mainText)) return 0.65;
  if (/large\s+(?:ladle|paddle|glass|mug|portion|piece)|big\b/i.test(mainText)) return 1.5;

  // 3. Special unit conversions
  if (/1\s*tsp\b/i.test(mainText)) return 0.33;
  if (/1\s*tbsp\b/i.test(mainText)) return 1.0;
  if (/2\s*tbsp\b/i.test(mainText)) return 2.0;
  if (/half\s*cup\b/i.test(mainText)) return 0.5;
  if (/half\s*mug\b/i.test(mainText)) return 0.83;
  if (/1\s*cup\b/i.test(mainText)) return 1.0;   // Standard cup (150ml)
  if (/1\s*mug\b/i.test(mainText)) return 1.67;  // Mug (250ml vs 150ml ~ 1.67)
  if (/1\s*big\s*mug\b/i.test(mainText)) return 2.0; // Big mug (300ml vs 150ml = 2.0)
  if (/1\s*plate\b/i.test(mainText)) return 1.67; // Mess thali plate portion (~250g) vs 150g serving

  // 4. Numeric count of primary mess units (ladles, paddles, glasses, cups, mugs, pieces, servings, plates, slices, scoops)
  const countMatch = mainText.match(/^(\d+(?:\.\d+)?)\s*(?:nos?|pcs?|pieces?|ladles?|paddles?|glasses?|cups?|mugs?|slices?|scoops?|rotis?|chapatis?|eggs?|servings?|plates?)?\b/);
  if (countMatch) {
    const count = parseFloat(countMatch[1]);
    if (!isNaN(count) && count > 0 && count <= 50) return count;
  }

  // 5. Standalone explicit ml (only when not preceded by a primary unit like "1 ladle (~100ml)")
  const isLiquidDish = /\b(dal|sambar|rasam|curry|gravy|soup|chole|rajma|milk|tea|coffee|shake|smoothie|juice)\b/.test(f);
  const mlMatch = q.match(/^(\d+(?:\.\d+)?)\s*ml\b/) || (!countMatch ? q.match(/(\d+(?:\.\d+)?)\s*ml\b/) : null);
  if (mlMatch) {
    const ml = parseFloat(mlMatch[1]);
    if (isLiquidDish) {
      return Math.max(0.1, Math.round((ml / 100) * 100) / 100); // 100ml ladle base
    }
    return Math.max(0.1, Math.round((ml / 150) * 100) / 100); // 150ml cup base
  }

  // 6. Standalone explicit grams (only when not preceded by a primary unit like "1 serving (~150g)" or "1 paddle (~150g)")
  const gMatch = q.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|grams)\b/) || (!countMatch ? q.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|grams)\b/) : null);
  if (gMatch) {
    const g = parseFloat(gMatch[1]);
    return Math.max(0.1, Math.round((g / 150) * 100) / 100); // 150g serving/paddle base
  }

  return 1.0;
}

// ─── Pure Gemini AI Food Portion Profiles & Multi-tier Caching ────────────────
export interface FoodPortionProfile {
  cleanName: string;
  category: string;
  defaultQuantity: string;
  presets: string[];
  estimatedMacros?: { calories: number; protein: number; carbs: number; fats: number };
}

export const PORTION_CACHE_KEY_PREFIX = "recompass_portion_v5_";
const PORTION_MEMORY_CACHE = new Map<string, FoodPortionProfile>();

// Invalidate any legacy profiles containing "bowl", "katori", generic "half portion", or mismatching units
export function isObsoleteProfile(p: FoodPortionProfile | null | undefined, foodName = ""): boolean {
  if (!p || !p.presets || !Array.isArray(p.presets) || p.presets.length === 0) return true;
  if (p.category === "bowl") return true;
  if (p.presets.some(preset => /bowl|katori|half portion/i.test(preset))) return true;
  if (p.category === "portion" && p.presets.includes("half portion")) return true;
  // Invalidate any serving presets with inaccurate gram guesses like (~150g)
  if (p.presets.some(preset => /serving\s*\(~\d+g\)/i.test(preset))) return true;
  const lower = (foodName || p.cleanName || "").toLowerCase();
  // Rice items MUST use paddle!
  if (/\b(rice|biryani|pulao|pulav|khichdi|fried rice)\b/.test(lower) && p.category !== "paddle") return true;
  // Curries/dals MUST use ladle!
  if (/\b(dal|sambar|rasam|kadhi|curry|gravy)\b/.test(lower) && p.category !== "ladle") return true;
  // Beverages/liquids MUST use cup/mug with ml!
  if (/\b(milk|tea|chai|coffee|lassi|chaas|juice|shake)\b/.test(lower) && p.category !== "cup/mug") return true;
  return false;
}

// Auto-purge outdated portion cache entries from previous versions
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("recompass_portion_v1_") || k.startsWith("recompass_portion_v2_") || k.startsWith("recompass_portion_v3_") || k.startsWith("recompass_portion_v4_"))) {
      localStorage.removeItem(k);
    }
  }
} catch {}

/**
 * 0ms Instant Deterministic Mess Portion Classifier
 * Eliminates all "bowls", replacing them with real mess hall units:
 * - ladles (with ml) for liquid gravies, curries, dals, sambar, curd
 * - cups / mugs (with ml) for milk, tea, coffee, lassi, chaas, juices, shakes
 * - paddles (with grams) for rice, pulao, biryani, khichdi
 * - pieces for rotis, chapatis, parathas, puris, dosas, idlis, eggs, bread, snacks
 * - servings (with grams) for dry sabzi, bhurji, poha, upma, noodles
 */
export function inferFoodPortionDefaults(foodName: string): FoodPortionProfile {
  const clean = cleanFoodName(foodName);
  const lower = clean.toLowerCase();

  // 1. BEVERAGES / DRINKS / LIQUIDS (Strictly ml with cup or mug size!)
  if (/\b(milk|tea|chai|coffee|lassi|chaas|buttermilk|juice|shake|smoothie|badam milk|bournvita|horlicks|water)\b/.test(lower)) {
    const isTeaOrCoffee = /\b(tea|chai|coffee)\b/.test(lower);
    return {
      cleanName: clean,
      category: "cup/mug",
      defaultQuantity: isTeaOrCoffee ? "1 cup (150ml)" : "1 mug (250ml)",
      presets: ["1 cup (150ml)", "1 mug (250ml)", "1 big mug (300ml)", "half cup (75ml)", "half mug (125ml)"],
      estimatedMacros: isTeaOrCoffee
        ? { calories: 80, protein: 2, carbs: 10, fats: 3 }
        : { calories: 150, protein: 7.5, carbs: 12, fats: 7.5 },
    };
  }

  // 2. LIQUID CURRIES / DALS / SAMBAR / GRAVIES / SOUPS (Strictly ladles with ml data)
  if (/\b(dal|sambar|rasam|kadhi|curry|gravy|soup|shorba|saag|rajma|chole|chana masala|salan|korma|paneer butter masala|butter chicken|egg curry|chicken curry|mutton curry|fish curry)\b/.test(lower)) {
    return {
      cleanName: clean,
      category: "ladle",
      defaultQuantity: "1 ladle (~100ml)",
      presets: ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"],
      estimatedMacros: { calories: 130, protein: 5.5, carbs: 14, fats: 5 },
    };
  }

  // 3. CURD / DAHI / RAITA (Strictly ladle in mess)
  if (/\b(curd|dahi|raita|boondi raita|cucumber raita|yogurt)\b/.test(lower)) {
    return {
      cleanName: clean,
      category: "ladle",
      defaultQuantity: "1 ladle (~100ml)",
      presets: ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"],
      estimatedMacros: { calories: 75, protein: 4, carbs: 5, fats: 4 },
    };
  }

  // 4. DISCRETE BREADS / EGGS / SNACKS / SWEETS (Counted strictly in pieces)
  if (/\b(roti|rotis|chapati|chapatis|phulka|phulkas|paratha|parathas|naan|naans|puri|puris|poori|pooris|bhatura|bhature|kulcha|kulchas|idli|idlis|dosa|dosas|uttapam|vada|vadas|egg|eggs|boiled egg|boiled eggs|omelette|omlet|bread|toast|banana|bananas|apple|apples|orange|oranges|samosa|samosas|cutlet|cutlets|kachori|patties|puff|puffs|roll|rolls|sandwich|sandwiches|biscuit|biscuits|cookie|cookies|gulab jamun|rasgulla|laddu|ladoo|jalebi|barfi|sweet|sweets)\b/.test(lower)) {
    const isMultiDefault = /\b(roti|rotis|chapati|chapatis|phulka|phulkas|puri|puris|poori|pooris|idli|idlis|bread|toast)\b/.test(lower);
    return {
      cleanName: clean,
      category: "piece",
      defaultQuantity: isMultiDefault ? "2 pieces" : "1 piece",
      presets: ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"],
      estimatedMacros: { calories: 120, protein: 3.5, carbs: 20, fats: 2.5 },
    };
  }

  // 5. SLICEABLE FRUITS / FOODS (Counted in slices)
  if (/\b(watermelon|papaya|pineapple|melon|muskmelon|pizza)\b/.test(lower)) {
    return {
      cleanName: clean,
      category: "slice",
      defaultQuantity: "1 slice",
      presets: ["1 slice", "2 slices", "3 slices", "half slice"],
      estimatedMacros: { calories: 50, protein: 1, carbs: 12, fats: 0.2 },
    };
  }

  // 6. CONDIMENTS / SPREADS / BUTTER (Counted in tbsp/tsp)
  if (/\b(butter|ghee|jam|pickle|achar|chutney|peanut butter|honey|sugar|sauce|mayo|mayonnaise)\b/.test(lower)) {
    return {
      cleanName: clean,
      category: "tbsp",
      defaultQuantity: "1 tbsp (~15g)",
      presets: ["1 tsp (~5g)", "1 tbsp (~15g)", "2 tbsp (~30g)", "half tsp"],
      estimatedMacros: { calories: 75, protein: 0.5, carbs: 4, fats: 6 },
    };
  }

  // 7. POWDERS / PROTEIN (Counted in scoops)
  if (/\b(whey|protein powder|scoop|creatine)\b/.test(lower)) {
    return {
      cleanName: clean,
      category: "scoop",
      defaultQuantity: "1 scoop (~30g)",
      presets: ["1 scoop (~30g)", "half scoop (~15g)", "2 scoops (~60g)"],
      estimatedMacros: { calories: 120, protein: 24, carbs: 2, fats: 1.5 },
    };
  }

  // 8. RICE ITEMS (Strictly paddle with grams in mess hall!)
  const isRice = /\b(rice|pulao|pulav|biryani|khichdi|fried rice|jeera rice|curd rice)\b/.test(lower);
  if (isRice) {
    return {
      cleanName: clean,
      category: "paddle",
      defaultQuantity: "1 paddle (~150g)",
      presets: ["1 paddle (~150g)", "2 paddles (~300g)", "3 paddles (~450g)", "half paddle (~75g)"],
      estimatedMacros: { calories: 200, protein: 4, carbs: 44, fats: 1 },
    };
  }

  // 9. NORMAL ITEMS: DRY SABZI / BHURJI / GRAINS / POHA / UPMA / CUSTOM RECIPES (Clean servings without misleading gram numbers)
  const isDrySabziOrBhurji = /\b(sabzi|bhaji|bhurji|fry|sukha|aloo|gobi|bhindi|beans|cabbage|capsicum|baingan|matar|dry)\b/.test(lower);
  if (isDrySabziOrBhurji) {
    return {
      cleanName: clean,
      category: "serving",
      defaultQuantity: "1 serving",
      presets: ["1 serving", "half serving", "2 servings", "3 servings"],
      estimatedMacros: { calories: 140, protein: 4, carbs: 16, fats: 7 },
    };
  }

  return {
    cleanName: clean,
    category: "serving",
    defaultQuantity: "1 serving",
    presets: ["1 serving", "half serving", "2 servings", "3 servings"],
    estimatedMacros: { calories: 180, protein: 5, carbs: 30, fats: 5 },
  };
}

/**
 * Intelligent Custom Food String Parser
 * Parses user input like "2 chapatis", "200ml milk", "2 ladles dal", "1 paddle biryani"
 */
export function parseCustomFoodInput(input: string): { foodName: string; quantity: string } {
  const trimmed = input.trim();
  if (!trimmed) return { foodName: "", quantity: "" };

  const match = trimmed.match(/^((?:\d+(?:\.\d+)?|half|quarter|one|two|three|four|five)\s*(?:nos?|pcs?|pieces?|ladles?|paddles?|glasses?|cups?|mugs?|servings?|plates?|slices?|scoops?|tbsp|tsp|ml|l|ltr|g|gm|gms|grams?|kg|rotis?|chapatis?|eggs?|packets?|boxes?))\s+(?:of\s+)?(.+)$/i);
  if (match) {
    const rawQty = match[1].trim();
    const rawDish = match[2].trim();
    let cleanQty = rawQty;
    if (/^\d+\s*(?:rotis?|chapatis?|eggs?)$/i.test(rawQty)) {
      cleanQty = rawQty.replace(/\b(?:rotis?|chapatis?|eggs?)\b/i, "pieces").trim();
    }
    return {
      foodName: rawDish,
      quantity: cleanQty,
    };
  }

  const numFoodMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z].+)$/i);
  if (numFoodMatch) {
    return {
      foodName: numFoodMatch[2].trim(),
      quantity: `${numFoodMatch[1]} pieces`,
    };
  }

  return { foodName: trimmed, quantity: "" };
}

export function getCachedPortionProfile(foodName: string): FoodPortionProfile | null {
  const key = cleanFoodName(foodName).toLowerCase();
  if (!key) return null;

  if (PORTION_MEMORY_CACHE.has(key)) {
    const mem = PORTION_MEMORY_CACHE.get(key)!;
    if (isObsoleteProfile(mem, key)) {
      PORTION_MEMORY_CACHE.delete(key);
    } else {
      return mem;
    }
  }
  try {
    const local = localStorage.getItem(PORTION_CACHE_KEY_PREFIX + key);
    if (local) {
      const parsed: FoodPortionProfile = JSON.parse(local);
      if (isObsoleteProfile(parsed, key)) {
        localStorage.removeItem(PORTION_CACHE_KEY_PREFIX + key);
      } else {
        PORTION_MEMORY_CACHE.set(key, parsed);
        return parsed;
      }
    }
  } catch {}
  return null;
}

export async function batchClassifyFoodPortions(foods: string[]): Promise<Record<string, FoodPortionProfile>> {
  const cleanedFoods = Array.from(new Set(foods.map(cleanFoodName).filter(Boolean)));
  const results: Record<string, FoodPortionProfile> = {};
  const unclassified: string[] = [];

  for (const food of cleanedFoods) {
    const cached = getCachedPortionProfile(food);
    if (cached) {
      results[cleanFoodName(food)] = cached;
    } else {
      unclassified.push(food);
    }
  }

  if (unclassified.length === 0) {
    return results;
  }

  try {
    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "batch_classify_food_portions", payload: { foods: unclassified } }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && !data.error) {
        for (const rawName in data) {
          const item = data[rawName];
          if (item && item.presets && Array.isArray(item.presets)) {
            const clean = cleanFoodName(rawName);
            const key = clean.toLowerCase();
            const defaults = inferFoodPortionDefaults(clean);

            // Filter out any "bowl" mentions from AI
            const cleanedPresets = item.presets
              .filter((p: string) => !/bowl|katori/i.test(p))
              .map((p: string) => p.replace(/\bbowl\b/gi, "serving"));

            const finalPresets = cleanedPresets.length > 0 ? cleanedPresets : defaults.presets;
            const finalCategory = item.category === "bowl" ? defaults.category : (item.category || defaults.category);
            const finalDefault = /bowl/i.test(item.defaultQuantity) ? defaults.defaultQuantity : (item.defaultQuantity || finalPresets[0]);

            const profile: FoodPortionProfile = {
              cleanName: clean,
              category: finalCategory,
              defaultQuantity: finalDefault,
              presets: finalPresets,
              estimatedMacros: item.estimatedMacros ? sanitizeMacros(item.estimatedMacros) : defaults.estimatedMacros,
            };
            results[clean] = profile;
            PORTION_MEMORY_CACHE.set(key, profile);
            try { localStorage.setItem(PORTION_CACHE_KEY_PREFIX + key, JSON.stringify(profile)); } catch {}

            if (profile.estimatedMacros) {
              const defaultKey = `recompass_macros_v4_${(profile.defaultQuantity + " " + profile.cleanName).toLowerCase().trim()}`;
              try {
                localStorage.setItem(defaultKey, JSON.stringify({ ...profile.estimatedMacros, name: profile.cleanName.toUpperCase() }));
              } catch {}
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[batchClassifyFoodPortions] Error:", err);
  }

  // For any items that failed or timed out, apply instant mess defaults
  for (const food of unclassified) {
    const clean = cleanFoodName(food);
    if (!results[clean]) {
      const fallback = inferFoodPortionDefaults(clean);
      results[clean] = fallback;
      PORTION_MEMORY_CACHE.set(clean.toLowerCase(), fallback);
    }
  }

  return results;
}

export async function getFoodPortionProfile(foodName: string): Promise<FoodPortionProfile> {
  const cleaned = cleanFoodName(foodName);
  const key = cleaned.toLowerCase();
  
  const cached = getCachedPortionProfile(key);
  if (cached) return cached;

  const defaults = inferFoodPortionDefaults(cleaned);

  try {
    const batchRes = await batchClassifyFoodPortions([cleaned]);
    if (batchRes[cleaned] && !isObsoleteProfile(batchRes[cleaned], cleaned)) {
      return batchRes[cleaned];
    }

    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "classify_food_portion", payload: { foodName: cleaned } }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && Array.isArray(data.presets) && data.presets.length > 0) {
        const cleanedPresets = data.presets
          .filter((p: string) => !/bowl|katori/i.test(p))
          .map((p: string) => p.replace(/\bbowl\b/gi, "serving"));

        const finalPresets = cleanedPresets.length > 0 ? cleanedPresets : defaults.presets;
        const finalCategory = data.category === "bowl" ? defaults.category : (data.category || defaults.category);
        const finalDefault = /bowl/i.test(data.defaultQuantity) ? defaults.defaultQuantity : (data.defaultQuantity || finalPresets[0]);

        const profile: FoodPortionProfile = {
          cleanName: data.cleanName || cleaned,
          category: finalCategory,
          defaultQuantity: finalDefault,
          presets: finalPresets,
          estimatedMacros: data.estimatedMacros ? sanitizeMacros(data.estimatedMacros) : defaults.estimatedMacros,
        };
        PORTION_MEMORY_CACHE.set(key, profile);
        try { localStorage.setItem(PORTION_CACHE_KEY_PREFIX + key, JSON.stringify(profile)); } catch {}
        
        if (profile.estimatedMacros) {
          const defaultKey = `recompass_macros_v4_${(profile.defaultQuantity + " " + profile.cleanName).toLowerCase().trim()}`;
          try {
            localStorage.setItem(defaultKey, JSON.stringify({ ...profile.estimatedMacros, name: profile.cleanName.toUpperCase() }));
          } catch {}
        }

        return profile;
      }
    }
  } catch (err) {
    console.warn("[getFoodPortionProfile] AI portion classification failed:", err);
  }

  PORTION_MEMORY_CACHE.set(key, defaults);
  try { localStorage.setItem(PORTION_CACHE_KEY_PREFIX + key, JSON.stringify(defaults)); } catch {}
  return defaults;
}

export function getQuickPortionPresets(foodName: string): { category: string; defaultUnit: string; presets: string[] } {
  const sanitizePresets = (presets: string[]) =>
    presets.map(p => p.replace(/\bserving\s*\(~\d+g\)/gi, "serving").trim());

  const cached = getCachedPortionProfile(foodName);
  if (cached) {
    return {
      category: cached.category,
      defaultUnit: cached.defaultQuantity.replace(/\bserving\s*\(~\d+g\)/gi, "serving").trim(),
      presets: sanitizePresets(cached.presets),
    };
  }
  const inferred = inferFoodPortionDefaults(foodName);
  return {
    category: inferred.category,
    defaultUnit: inferred.defaultQuantity.replace(/\bserving\s*\(~\d+g\)/gi, "serving").trim(),
    presets: sanitizePresets(inferred.presets),
  };
}

// ─── Pure Gemini AI Macro Estimation with Multi-tier Cache ────────────────────
async function estimateMacros(foodName: string, quantity: string, isCustom = false) {
  const cleanedName = cleanFoodName(foodName);
  const queryStr = (quantity ? `${quantity} ${cleanedName}` : cleanedName).trim();
  const cacheKey = "recompass_macros_v4_" + queryStr.toLowerCase();

  // Multi-tier cache check (memory + sessionStorage + localStorage)
  try {
    const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  // 1. Live Gemini AI Macro Estimation
  try {
    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "estimate_macros", payload: { foodName: queryStr } }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && !data.error && (data.calories !== undefined || data.kcal !== undefined || data.macronutrients || data.energy_kcal !== undefined)) {
        const rawCals = Number(data.calories ?? data.kcal ?? data.energy_kcal ?? data.macronutrients?.calories ?? 0);
        const rawProt = Number(data.protein ?? data.protein_g ?? data.macronutrients?.protein_g ?? data.macronutrients?.protein ?? 0);
        const rawCarb = Number(data.carbs ?? data.carbohydrates ?? data.carbohydrates_g ?? data.carbs_g ?? data.macronutrients?.carbohydrates_g ?? 0);
        const rawFat  = Number(data.fats ?? data.fat ?? data.total_fat_g ?? data.fat_g ?? data.macronutrients?.total_fat_g ?? 0);

        const sanitized = sanitizeMacros({
          calories: rawCals,
          protein:  rawProt,
          carbs:    rawCarb,
          fats:     rawFat,
        });

        const result = {
          ...sanitized,
          name: data.name || cleanedName.toUpperCase()
        };

        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } catch {}

        return result;
      }
      if (data?.error === "INVALID_FOOD" && isCustom) {
        throw new Error("INVALID_FOOD");
      }
    }
  } catch (err: any) {
    if (err?.message === "INVALID_FOOD") throw err;
    console.warn("[estimateMacros] AI estimation API error or network issue:", err);
  }

  // 2. Custom gibberish rejection
  if (isCustom && cleanedName.length > 0 && !/[a-zA-Z]{2,}/.test(cleanedName)) {
    throw new Error("INVALID_FOOD");
  }

  // 3. Resilient AI-derived baseline scaling (Zero hardcoded food dictionaries)
  const portionProfile = getCachedPortionProfile(cleanedName);
  const baseMacros = portionProfile?.estimatedMacros || { calories: 160, protein: 5.5, carbs: 22, fats: 5.5 };
  const multiplier = parseQuantityMultiplier(quantity, cleanedName);

  const calculated = {
    calories: Math.max(10, Math.round(baseMacros.calories * multiplier)),
    protein: Math.max(0, Math.round(baseMacros.protein * multiplier * 10) / 10),
    carbs: Math.max(0, Math.round(baseMacros.carbs * multiplier * 10) / 10),
    fats: Math.max(0, Math.round(baseMacros.fats * multiplier * 10) / 10),
    name: cleanedName.toUpperCase()
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(calculated));
  } catch {}

  return calculated;
}

async function analyzePlate(base64: string, mimeType: string): Promise<{ items: any[]; error?: string }> {
  try {
    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "analyze_plate", payload: { image: base64, mimeType } }),
    });
    const data = await res.json();
    if (data?.error === "NO_FOOD_DETECTED") {
      return { items: [], error: "NO_FOOD_DETECTED" };
    }
    if (Array.isArray(data)) return { items: data };
    if (Array.isArray(data?.items)) return { items: data.items };
    return { items: [] };
  } catch (err) {
    console.error("[analyzePlate] Error:", err);
    return { items: [], error: "NETWORK_ERROR" };
  }
}

// ─── Dynamic Quantity Picker with Pure Gemini AI Portioning ──────────
// ─── Dynamic Quantity Picker with Pure Gemini AI Portioning ──────────
function QuantityPicker({ foodName, onConfirm, onCancel }: { foodName: string; onConfirm: (q: string, precalculatedMacros?: any) => void; onCancel: () => void }) {
  const cleaned = cleanFoodName(foodName);
  const [profile, setProfile] = useState<FoodPortionProfile>(() => getCachedPortionProfile(cleaned) || inferFoodPortionDefaults(cleaned));
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(!getCachedPortionProfile(cleaned));

  const presets = profile.presets;
  const [custom, setCustom] = useState("");
  const initialQty = profile.defaultQuantity || presets[0] || "1 serving";
  const [selected, setSelected] = useState<string>(initialQty);

  const [liveMacros, setLiveMacros] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(() => {
    const base = profile.estimatedMacros;
    if (!base) return null;
    const queryStr = `${initialQty} ${cleaned}`.trim();
    const cacheKey = "recompass_macros_v4_" + queryStr.toLowerCase();
    try {
      const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}
    const mult = parseQuantityMultiplier(initialQty, cleaned);
    return {
      calories: Math.max(10, Math.round(base.calories * mult)),
      protein: Math.max(0, Math.round(base.protein * mult * 10) / 10),
      carbs: Math.max(0, Math.round(base.carbs * mult * 10) / 10),
      fats: Math.max(0, Math.round(base.fats * mult * 10) / 10),
    };
  });
  const [estimating, setEstimating] = useState(false);

  // Asynchronously fetch tailored AI portion presets if not cached
  useEffect(() => {
    let isCurrent = true;
    if (!getCachedPortionProfile(cleaned)) {
      setIsLoadingProfile(true);
      getFoodPortionProfile(cleaned)
        .then(p => {
          if (!isCurrent) return;
          setProfile(p);
          setIsLoadingProfile(false);
          const def = p.defaultQuantity || p.presets[0] || "1 serving";
          setSelected(prev => (presets.includes(prev) ? prev : def));
        })
        .catch(() => {
          if (isCurrent) setIsLoadingProfile(false);
        });
    }
    return () => { isCurrent = false; };
  }, [cleaned]);

  // Live macro calculation preview: 0ms instant multiplier scaling + debounced AI verification
  useEffect(() => {
    const activeQty = custom.trim() || selected;
    if (!activeQty) return;

    // 1. Check instant cache first (0ms)
    const queryStr = `${activeQty} ${cleaned}`.trim();
    const cacheKey = "recompass_macros_v4_" + queryStr.toLowerCase();
    try {
      const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
      if (cached) {
        setLiveMacros(JSON.parse(cached));
        return;
      }
    } catch {}

    // 2. 0ms instant visual update using AI baseline & mathematical multiplier
    const currentBase = profile?.estimatedMacros;
    if (currentBase) {
      const mult = parseQuantityMultiplier(activeQty, cleaned);
      const instant = {
        calories: Math.max(10, Math.round(currentBase.calories * mult)),
        protein: Math.max(0, Math.round(currentBase.protein * mult * 10) / 10),
        carbs: Math.max(0, Math.round(currentBase.carbs * mult * 10) / 10),
        fats: Math.max(0, Math.round(currentBase.fats * mult * 10) / 10),
      };
      setLiveMacros(instant);
    }

    // 3. Debounced AI verification & precision refinement
    let isCurrent = true;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const macros = await estimateMacros(cleaned, activeQty);
        if (isCurrent && macros) setLiveMacros(macros);
      } catch {
        // Instant values already displayed
      } finally {
        if (isCurrent) setEstimating(false);
      }
    }, 120);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [cleaned, selected, custom, profile]);

  const confirm = () => {
    const qty = custom.trim() || selected;
    if (qty) onConfirm(qty, liveMacros);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Select Portion</p>
              {isLoadingProfile && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400/80 font-mono animate-pulse">
                  <Sparkles className="w-2.5 h-2.5" /> AI Sizing
                </span>
              )}
            </div>
            <p className="text-base font-bold text-white mt-0.5 capitalize">{cleaned}</p>
            <p className="text-[11px] text-white/40 capitalize">
              {profile ? `${profile.category} portioning` : "AI adaptive portioning"}
            </p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Macro Calculation Preview Ribbon */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <span className="text-white/40 text-[11px] font-medium flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>AI Macro Estimate</span>
          </span>
          {isLoadingProfile || !liveMacros ? (
            <span className="text-[11px] text-emerald-400/80 animate-pulse font-mono flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
              <span>Analyzing portion with Gemini...</span>
            </span>
          ) : estimating ? (
            <span className="text-[11px] text-white/40 animate-pulse font-mono">Refining...</span>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 font-mono tabular-nums text-[10px] sm:text-[11px] flex-wrap">
              <span className="font-bold text-white">{liveMacros.calories} kcal</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-orange-400 font-semibold">P {liveMacros.protein}g</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-sky-400 font-semibold">C {liveMacros.carbs}g</span>
              <span className="text-white/20">&middot;</span>
              <span className="text-emerald-400 font-semibold">F {liveMacros.fats}g</span>
            </div>
          )}
        </div>

        {/* Dynamic Portion Presets */}
        <div className="flex flex-wrap gap-2 pt-1 min-h-[38px] items-center">
          {presets.map(p => (
            <button 
              key={p} 
              type="button"
              onClick={() => { setSelected(p); setCustom(""); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selected === p && !custom 
                  ? "bg-white text-black border-white shadow-sm font-bold scale-[1.02]" 
                  : "bg-white/[0.03] text-white/70 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <input 
          type="text" 
          placeholder="Or type custom amount (e.g. 150g, 2 pieces)..." 
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(""); }}
          onKeyDown={e => e.key === "Enter" && confirm()}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all font-medium" 
        />

        <button 
          onClick={confirm} 
          disabled={!custom.trim() && !selected}
          className="w-full h-11 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
        >
          Confirm Quantity
        </button>
      </div>
    </div>
  );
}

// ─── Photo Confirm Modal ───────────────────────────────────────────
function PhotoConfirm({ items, onConfirm, onCancel }: { items: any[]; onConfirm: (items: any[]) => void; onCancel: () => void }) {
  const [localItems, setLocalItems] = useState(items);
  const [checked, setChecked] = useState<boolean[]>(items.map(() => true));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editVals, setEditVals] = useState({ name: "", quantity: "" });
  const [isEstimating, setIsEstimating] = useState(false);

  const toggle = (i: number) => {
    if (editingIdx !== null) return;
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v));
  };
  const selected = localItems.filter((_, i) => checked[i]);

  const startEdit = (e: any, i: number) => {
    e.stopPropagation();
    setEditingIdx(i);
    setEditVals({ name: localItems[i].name, quantity: localItems[i].quantity });
  };

  const saveEdit = async (e: any, i: number) => {
    e.stopPropagation();
    if (editVals.name === localItems[i].name && editVals.quantity === localItems[i].quantity) {
      setEditingIdx(null);
      return;
    }
    setIsEstimating(true);
    try {
      const newMacros = await estimateMacros(editVals.name, editVals.quantity);
      const newItems = [...localItems];
      newItems[i] = { ...newItems[i], quantity: editVals.quantity, ...newMacros };
      setLocalItems(newItems);
      setEditingIdx(null);
    } catch(err) {
      console.error(err);
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Plate Recognition</p>
            <p className="text-base font-bold text-white mt-0.5">Confirm Detected Items</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
          {localItems.map((item, i) => (
            <div 
              key={i} 
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                checked[i] 
                  ? "border-white/[0.12] bg-white/[0.04]" 
                  : "border-white/[0.04] bg-transparent opacity-40"
              }`}
            >
              <button 
                onClick={() => toggle(i)} 
                className={`w-5 h-5 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors ${
                  checked[i] ? "border-white bg-white text-black" : "border-white/20 bg-transparent"
                }`}
              >
                {checked[i] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
              
              {editingIdx === i ? (
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <input 
                    type="text" 
                    value={editVals.name} 
                    onChange={e => setEditVals(p => ({...p, name: e.target.value}))} 
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40" 
                    placeholder="Food name" 
                    disabled={isEstimating} 
                  />
                  <input 
                    type="text" 
                    value={editVals.quantity} 
                    onChange={e => setEditVals(p => ({...p, quantity: e.target.value}))} 
                    className="w-full bg-white/[0.05] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/40" 
                    placeholder="Quantity" 
                    disabled={isEstimating} 
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingIdx(null); }} 
                      className="px-3 py-1 rounded-full bg-white/[0.06] text-xs font-semibold text-white/70 hover:text-white" 
                      disabled={isEstimating}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={(e) => saveEdit(e, i)} 
                      className="px-3 py-1 rounded-full bg-white text-xs font-bold text-black" 
                      disabled={isEstimating}
                    >
                      {isEstimating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggle(i)}>
                  <p className="text-xs font-bold text-white truncate">{item.name}</p>
                  <p className="text-[11px] text-white/40 font-sans truncate mt-0.5">
                    {item.quantity ? `${item.quantity.length > 25 ? "1 serving" : item.quantity} · ` : ""}{item.calories} kcal · P {item.protein}g · C {item.carbs}g · F {item.fats}g
                  </p>
                </div>
              )}

              {editingIdx !== i && (
                <button 
                  onClick={(e) => startEdit(e, i)} 
                  className="p-1.5 shrink-0 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button 
          onClick={() => onConfirm(selected)} 
          disabled={selected.length === 0 || isEstimating}
          className="w-full h-11 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider disabled:opacity-30 hover:bg-white/90 active:scale-[0.99] transition-all flex-shrink-0 flex items-center justify-center gap-2 shadow-sm"
        >
          {isEstimating ? <Loader2 className="w-4 h-4 animate-spin" /> : `Log ${selected.length} item${selected.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Edit Logged Item Modal ─────────────────────────────────────────
function EditLogItemModal({
  item,
  mealType,
  onSave,
  onDelete,
  onCancel,
}: {
  item: MacroEntry;
  mealType: MealType;
  onSave: (updated: MacroEntry) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const cleanInitialQuantity = useMemo(() => {
    if (!item.quantity) return "1 serving";
    if (item.quantity.length > 25 || item.quantity.includes(",")) return "1 serving";
    return item.quantity;
  }, [item.quantity]);

  const [quantity, setQuantity] = useState(cleanInitialQuantity);
  const [calories, setCalories] = useState(item.calories.toString());
  const [protein, setProtein] = useState(item.protein.toString());
  const [carbs, setCarbs] = useState(item.carbs.toString());
  const [fats, setFats] = useState(item.fats.toString());
  const [recalculating, setRecalculating] = useState(false);

  // Instant portion presets for this food
  const portionInfo = useMemo(() => getQuickPortionPresets(name), [name]);

  const handleSelectPreset = (preset: string) => {
    const prevMult = parseQuantityMultiplier(quantity, name) || 1;
    const newMult = parseQuantityMultiplier(preset, name) || 1;
    const ratio = newMult / prevMult;
    setQuantity(preset);
    if (item.calories > 0 && ratio > 0 && isFinite(ratio)) {
      const curCal = parseFloat(calories) || item.calories;
      const curPro = parseFloat(protein) || item.protein;
      const curCar = parseFloat(carbs) || item.carbs;
      const curFat = parseFloat(fats) || item.fats;
      setCalories(Math.max(10, Math.round(curCal * ratio)).toString());
      setProtein((Math.max(0, Math.round(curPro * ratio * 10) / 10)).toString());
      setCarbs((Math.max(0, Math.round(curCar * ratio * 10) / 10)).toString());
      setFats((Math.max(0, Math.round(curFat * ratio * 10) / 10)).toString());
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const cleanQty = quantity.length > 25 ? "1 serving" : quantity.trim();
      const query = cleanQty ? `${cleanQty} ${name.trim()}` : name.trim();
      const macros = await estimateMacros(query, "", true);
      setCalories(macros.calories.toString());
      setProtein(macros.protein.toString());
      setCarbs(macros.carbs.toString());
      setFats(macros.fats.toString());
      if ((macros as any).name) setName((macros as any).name);
    } catch (e) {
      console.error(e);
    } finally {
      setRecalculating(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...item,
      name: name.trim().toUpperCase(),
      quantity: quantity.trim().length > 25 ? "1 serving" : quantity.trim(),
      calories: Math.max(0, parseInt(calories) || 0),
      protein: Math.max(0, parseFloat(protein) || 0),
      carbs: Math.max(0, parseFloat(carbs) || 0),
      fats: Math.max(0, parseFloat(fats) || 0),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onClick={onCancel}>
      <div className="w-full max-w-sm bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Edit Food Record</p>
            <p className="text-base font-bold text-white mt-0.5 capitalize">{mealType}</p>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1">Item Description</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Portion / Serving</label>
              {portionInfo.category && (
                <span className="text-[10px] text-white/35 font-medium uppercase tracking-wider">
                  {portionInfo.category}
                </span>
              )}
            </div>
            <input
              type="text"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
              placeholder="e.g. 1 ladle, 1 paddle, 1 cup, 1 serving"
            />
            {portionInfo.presets && portionInfo.presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {portionInfo.presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                      quantity === preset
                        ? "bg-white text-black shadow-sm"
                        : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Recalculate button */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={recalculating}
            className="w-full py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs font-semibold hover:bg-white/[0.08] hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
          >
            {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
            Recalculate with AI
          </button>

          {/* Macro inputs */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-white/40 block mb-0.5">Kcal</label>
              <input
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-white focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-orange-400/70 block mb-0.5">Pro (g)</label>
              <input
                type="number"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-orange-400 focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-sky-400/70 block mb-0.5">Carb (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-sky-400 focus:outline-none"
              />
            </div>
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2 text-center">
              <label className="text-[9px] font-semibold uppercase text-emerald-400/70 block mb-0.5">Fat (g)</label>
              <input
                type="number"
                value={fats}
                onChange={e => setFats(e.target.value)}
                className="w-full bg-transparent text-center text-xs font-sans font-bold text-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onDelete}
            className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staple Meal Modal ──────────────────────────────────────────────
function StapleMealModal({
  staple,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  staple: StapleMeal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (staple: StapleMeal) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(staple?.name || "");
  const [recipe, setRecipe] = useState(staple?.recipe || "");
  const [portionSize, setPortionSize] = useState(staple?.portionSize || "1 serving");
  const [mealType, setMealType] = useState<MealType | "any">(staple?.mealType || "any");
  const [calories, setCalories] = useState(staple?.calories !== undefined ? staple.calories.toString() : "");
  const [protein, setProtein] = useState(staple?.protein !== undefined ? staple.protein.toString() : "");
  const [carbs, setCarbs] = useState(staple?.carbs !== undefined ? staple.carbs.toString() : "");
  const [fats, setFats] = useState(staple?.fats !== undefined ? staple.fats.toString() : "");
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staple) {
      setName(staple.name);
      setRecipe(staple.recipe);
      setPortionSize(staple.portionSize || "1 serving");
      setMealType(staple.mealType);
      setCalories(staple.calories.toString());
      setProtein(staple.protein.toString());
      setCarbs(staple.carbs.toString());
      setFats(staple.fats.toString());
    } else {
      setName("");
      setRecipe("");
      setPortionSize("1 serving");
      setMealType("any");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFats("");
    }
    setError(null);
  }, [staple, isOpen]);

  if (!isOpen) return null;

  const handleCalculateWithAI = async () => {
    const query = recipe.trim() || name.trim();
    if (!query) {
      setError("Please describe the ingredients or recipe first.");
      return;
    }
    setIsCalculating(true);
    setError(null);
    try {
      const macros = await estimateMacros(query, "", true);
      setCalories(macros.calories.toString());
      setProtein(macros.protein.toString());
      setCarbs(macros.carbs.toString());
      setFats(macros.fats.toString());
      if (!name.trim() && (macros as any).name) {
        setName((macros as any).name);
      }
    } catch (err: any) {
      console.error("[StapleMealModal] AI estimation error:", err);
      setError(
        err?.message === "INVALID_FOOD"
          ? "Couldn't identify foods in this recipe. Try including specific ingredients & weights (e.g. 50g oats, 250ml milk)."
          : "AI calculation failed. You can enter or adjust the macros manually below."
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError("Please provide a name for this custom food.");
      return;
    }
    const finalStaple: StapleMeal = {
      id: staple?.id || ("staple_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6)),
      name: name.trim().toUpperCase(),
      recipe: recipe.trim() || name.trim(),
      portionSize: portionSize.trim() || "1 serving",
      mealType,
      calories: Math.max(0, parseInt(calories) || 0),
      protein: Math.max(0, parseFloat(protein) || 0),
      carbs: Math.max(0, parseFloat(carbs) || 0),
      fats: Math.max(0, parseFloat(fats) || 0),
      createdAt: staple?.createdAt || new Date().toISOString(),
    };
    onSave(finalStaple);
  };

  const mealOptions: { key: MealType | "any"; label: string }[] = [
    { key: "any", label: "Any Meal" },
    { key: "breakfast", label: "Breakfast" },
    { key: "lunch", label: "Lunch" },
    { key: "snacks", label: "Snacks" },
    { key: "dinner", label: "Dinner" },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#121418] border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Custom Food / Recipe</span>
            </div>
            <p className="text-base font-bold text-white">
              {staple ? "Edit Daily Staple" : "New Daily Staple"}
            </p>
            <p className="text-[11px] text-white/40">
              Saved permanently across all weekly menus & loggable in 1 tap.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Recipe / Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Ingredients & Quantities
              </label>
              <span className="text-[10px] text-emerald-400 font-medium">Gemini AI Powered</span>
            </div>
            <textarea
              rows={3}
              value={recipe}
              onChange={e => setRecipe(e.target.value)}
              placeholder="e.g. 1 banana shake with 20g plant protein, 20g peanut butter, 15g honey, 250ml milk"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-all resize-none"
            />
            <button
              type="button"
              onClick={handleCalculateWithAI}
              disabled={isCalculating || !recipe.trim()}
              className="mt-1.5 w-full py-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Calculate Nutrition with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Food Name */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1">
              Food / Shake Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. BANANA PROTEIN SHAKE"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Portion Size Badge */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Portion Size Badge
              </label>
              <span className="text-[10px] text-white/30">Clean pill badge in meal log</span>
            </div>
            <input
              type="text"
              value={portionSize}
              onChange={e => setPortionSize(e.target.value)}
              placeholder="e.g. 1 serving, 1 shake, 1 mug (250ml)"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Preferred Meal */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block mb-1.5">
              Preferred Meal Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {mealOptions.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setMealType(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    mealType === opt.key
                      ? "bg-white text-black border-white shadow-sm font-bold"
                      : "bg-white/[0.03] text-white/60 border-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Macro Inputs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Nutritional Breakdown (Per Serving)
              </label>
              <span className="text-[10px] text-white/30">Manual override available</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-2.5 text-center">
                <label className="text-[9px] font-semibold uppercase text-white/40 block mb-0.5">Calories</label>
                <input
                  type="number"
                  value={calories}
                  onChange={e => setCalories(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-white focus:outline-none"
                />
                <span className="text-[9px] text-white/30">kcal</span>
              </div>
              <div className="bg-white/[0.02] border border-orange-500/20 rounded-2xl p-2.5 text-center bg-orange-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-orange-400 block mb-0.5">Protein</label>
                <input
                  type="number"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-orange-400 focus:outline-none"
                />
                <span className="text-[9px] text-orange-400/50">grams</span>
              </div>
              <div className="bg-white/[0.02] border border-sky-500/20 rounded-2xl p-2.5 text-center bg-sky-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-sky-400 block mb-0.5">Carbs</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={e => setCarbs(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-sky-400 focus:outline-none"
                />
                <span className="text-[9px] text-sky-400/50">grams</span>
              </div>
              <div className="bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-2.5 text-center bg-emerald-500/[0.02]">
                <label className="text-[9px] font-semibold uppercase text-emerald-400 block mb-0.5">Fats</label>
                <input
                  type="number"
                  value={fats}
                  onChange={e => setFats(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-center text-sm font-sans font-bold text-emerald-400 focus:outline-none"
                />
                <span className="text-[9px] text-emerald-400/50">grams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 pt-2">
          {staple && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(staple.id)}
              className="px-4 py-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-white/90 active:scale-[0.99] transition-all shadow-sm"
          >
            {staple ? "Update Staple" : "Save Staple"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Daily Staples & Recipes Manager Modal ─────────────────────────
function StaplesManagerModal({
  isOpen,
  onClose,
  staples,
  loading,
  onAddStaple,
  onEditStaple,
  onDeleteStaple,
  onLogStaple,
  loggingKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  staples: StapleMeal[];
  loading?: boolean;
  onAddStaple: () => void;
  onEditStaple: (staple: StapleMeal) => void;
  onDeleteStaple: (staple: StapleMeal) => void;
  onLogStaple: (mealType: MealType, staple: StapleMeal) => void;
  loggingKey: string | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#121418] border border-white/[0.08] rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-[10px] font-bold tracking-wider uppercase text-amber-400 mb-1.5">
              <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              <span>Permanent Custom Foods</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              My Daily Staples
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Saved permanently across weekly menus &bull; 1-tap log to any meal
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddStaple}
              className="px-3.5 py-1.5 rounded-full bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Food</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of staples */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 -mr-1">
          {loading && staples.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/40">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <p className="text-xs">Loading custom staples...</p>
            </div>
          ) : staples.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] p-8 text-center space-y-3">
              <p className="text-sm font-medium text-white/60">No daily staples saved yet.</p>
              <p className="text-xs text-white/35 max-w-sm mx-auto leading-relaxed">
                Add your daily protein shakes, custom oats, or recurring snacks once. They stay saved forever, even when you upload a new mess menu.
              </p>
              <button
                onClick={onAddStaple}
                className="mt-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                + Create First Staple
              </button>
            </div>
          ) : (
            staples.map(staple => (
              <div
                key={staple.id}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 flex flex-col justify-between hover:border-white/[0.12] hover:bg-white/[0.03] transition-all group/card"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white group-hover/card:text-amber-300 transition-colors truncate">
                          {staple.name}
                        </p>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60">
                          {staple.portionSize || "1 serving"}
                        </span>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/40">
                          {staple.mealType === "any" ? "Any Meal" : staple.mealType}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 mt-1 leading-relaxed">
                        {staple.recipe}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditStaple(staple)}
                        title="Edit staple & recipe"
                        className="text-white/30 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteStaple(staple)}
                        title="Delete staple"
                        className="text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Macro Strip */}
                  <div className="flex items-center gap-2 mt-2.5 text-xs font-sans">
                    <span className="font-bold text-white">
                      {Math.round(staple.calories)} <span className="text-[10px] font-normal text-white/40">kcal</span>
                    </span>
                    <span className="text-orange-400 font-semibold bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/20 text-[11px]">
                      P {staple.protein}g
                    </span>
                    <span className="text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 text-[11px]">
                      C {staple.carbs}g
                    </span>
                    <span className="text-blue-400 font-semibold bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20 text-[11px]">
                      F {staple.fats}g
                    </span>
                  </div>
                </div>

                {/* 1-Tap Quick Log Actions */}
                <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 mr-1">Log to:</span>
                  {(["breakfast", "lunch", "snacks", "dinner"] as MealType[]).map(mKey => {
                    const isPreferred = staple.mealType === mKey;
                    const isLogging = loggingKey === `${mKey}:${staple.id}`;
                    return (
                      <button
                        key={mKey}
                        onClick={() => onLogStaple(mKey, staple)}
                        disabled={!!loggingKey}
                        title={`1-tap log to ${mKey}`}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          isPreferred
                            ? "bg-amber-400/15 border border-amber-400/30 text-amber-300 hover:bg-amber-400/25 shadow-sm"
                            : "bg-white/[0.03] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white"
                        }`}
                      >
                        {isLogging ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Plus className="w-2.5 h-2.5" />
                        )}
                        <span>{mKey === "breakfast" ? "B'fast" : mKey.charAt(0).toUpperCase() + mKey.slice(1)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/70 hover:text-white text-xs font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function sanitizeLog(rawLog: DayLog): DayLog {
  const sanitizeList = (list: MacroEntry[] = []) =>
    (list || []).map(entry => {
      if (entry && entry.quantity && (entry.quantity.length > 25 || entry.quantity.includes(","))) {
        return { ...entry, quantity: "1 serving" };
      }
      return entry;
    });
  return {
    breakfast: sanitizeList(rawLog.breakfast),
    lunch: sanitizeList(rawLog.lunch),
    dinner: sanitizeList(rawLog.dinner),
    snacks: sanitizeList(rawLog.snacks),
  };
}

// ─── Main Component ────────────────────────────────────────────────
export default function DailyLog() {
  const { currentUser, userProfile } = useAuth();
  const { hash } = useLocation();
  const [searchParams] = useSearchParams();
  const mealParam = searchParams.get("meal") as MealType | null;

  const today = todayStr();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const cachedLog = getCachedData<DayLog>("daily_log_" + today);
  const cachedMenu = getCachedData<MealPlan>("weekly_menu_" + dayName);
  const cachedStaples = getCachedData<StapleMeal[]>("user_staples");

  const [log, setLog]         = useState<DayLog>(() => cachedLog ? sanitizeLog(cachedLog) : { breakfast: [], lunch: [], dinner: [], snacks: [] });
  const [menu, setMenu]       = useState<MealPlan | null>(cachedMenu || null);
  const [loading, setLoading] = useState(!cachedLog);
  const [picker, setPicker]   = useState<{ mealType: MealType; foodName: string; isCustom?: boolean } | null>(null);
  const [estimating, setEstimating] = useState<string | null>(null);
  const [analyzing, setAnalyzing]   = useState<MealType | null>(null);
  const [photoItems, setPhotoItems] = useState<{ mealType: MealType; items: any[] } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ mealType: MealType; item: MacroEntry } | null>(null);
  const [customInput, setCustomInput]   = useState<{ [k in MealType]?: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  // Active Meal Tab for Mobile Scroll Reduction
  const [activeMealFilter, setActiveMealFilter] = useState<MealType | "all">("all");

  // React to meal query param from Home page or external links
  useEffect(() => {
    if (mealParam && ["breakfast", "lunch", "dinner", "snacks"].includes(mealParam)) {
      setActiveMealFilter(mealParam);
      setTimeout(() => {
        const el = document.getElementById(mealParam);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [mealParam]);

  const targets = useMemo(() => calcTargets(userProfile), [userProfile]);

  // Staples / Custom Foods State
  const [staples, setStaples] = useState<StapleMeal[]>(cachedStaples || []);
  const [staplesLoading, setStaplesLoading] = useState(!cachedStaples);
  const [isStaplesManagerOpen, setIsStaplesManagerOpen] = useState(false);
  const [isStapleModalOpen, setIsStapleModalOpen] = useState(false);
  const [editingStaple, setEditingStaple] = useState<StapleMeal | null>(null);
  const [loggingStapleKey, setLoggingStapleKey] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<{ mealType: MealType; item: MacroEntry } | null>(null);
  const [stapleToDelete, setStapleToDelete] = useState<StapleMeal | null>(null);

  const bfRef  = useRef<HTMLInputElement>(null);
  const lRef   = useRef<HTMLInputElement>(null);
  const dRef   = useRef<HTMLInputElement>(null);
  const snRef  = useRef<HTMLInputElement>(null);
  const fileRefs: Record<MealType, React.RefObject<HTMLInputElement | null>> = { breakfast: bfRef, lunch: lRef, dinner: dRef, snacks: snRef };

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [hash]);

  const loadLog = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid, "logs", today));
      if (snap.exists()) {
        const d = snap.data();
        const raw = { breakfast: d.breakfast||[], lunch: d.lunch||[], dinner: d.dinner||[], snacks: d.snacks||[] };
        const freshLog = sanitizeLog(raw);
        setLog(freshLog);
        setCachedData("daily_log_" + today, freshLog);
        const hadOversized = (["breakfast", "lunch", "dinner", "snacks"] as MealType[]).some(m =>
          (raw[m] || []).some((item: MacroEntry) => item?.quantity && (item.quantity.length > 25 || item.quantity.includes(",")))
        );
        if (hadOversized) {
          setDoc(doc(db, "users", currentUser.uid, "logs", today), freshLog, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, today]);

  const loadMenu = useCallback(async () => {
    if (!currentUser) return;
    try {
      const snap = await getDocs(query(collection(db, "users", currentUser.uid, "menus"), orderBy("uploadedAt","desc"), limit(1)));
      if (!snap.empty) {
        const menuDoc = snap.docs[0];
        const menuData = menuDoc.data();
        const ext: MealPlan[] = menuData.extractedData || [];
        const selected = ext.find(d => d.day === dayName) || ext[0] || null;
        setMenu(selected);
        if (selected) setCachedData("weekly_menu_" + dayName, selected);

        // Pre-load stored portion profiles
        const storedProfiles = menuData.portionProfiles || {};
        for (const k in storedProfiles) {
          const profile = storedProfiles[k];
          const key = cleanFoodName(k).toLowerCase();
          if (!isObsoleteProfile(profile, key)) {
            PORTION_MEMORY_CACHE.set(key, profile);
            try { localStorage.setItem(PORTION_CACHE_KEY_PREFIX + key, JSON.stringify(profile)); } catch {}
          }
        }

        // Gather all unique dishes across the entire menu
        const allDishes = Array.from(new Set(
          ext.flatMap(d => [...(d.breakfast || []), ...(d.lunch || []), ...(d.dinner || [])])
            .map(cleanFoodName)
            .filter(Boolean)
        ));

        // Find any dishes that don't have a valid profile yet
        const unclassified = allDishes.filter(dish => {
          const p = getCachedPortionProfile(dish);
          return !p || (p.category === "portion" && p.estimatedMacros?.calories === 160) || isObsoleteProfile(p, dish);
        });

        if (unclassified.length > 0) {
          batchClassifyFoodPortions(unclassified).then(async (newProfiles) => {
            const merged = { ...storedProfiles, ...newProfiles };
            try {
              await setDoc(menuDoc.ref, { portionProfiles: merged }, { merge: true });
            } catch (err) {
              console.warn("Failed to update menu doc with portionProfiles:", err);
            }
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, dayName]);

  const loadStaples = useCallback(async () => {
    if (!currentUser) return;
    try {
      const staplesDocRef = doc(db, "users", currentUser.uid, "staples", "current");
      const snap = await getDoc(staplesDocRef);
      if (snap.exists()) {
        const loaded = snap.data().items || [];
        setStaples(loaded);
        setCachedData("user_staples", loaded);
      } else {
        // Clean empty state for new users
        setStaples([]);
        setCachedData("user_staples", []);
        await setDoc(staplesDocRef, {
          items: [],
          lastUpdated: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("[loadStaples] Error fetching staples:", err);
    } finally {
      setStaplesLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    Promise.all([loadLog(), loadMenu()]).finally(() => setLoading(false));
    loadStaples();
  }, [loadLog, loadMenu, loadStaples]);

  // Intelligent background pre-warm of portion presets for today's menu items
  useEffect(() => {
    if (!menu) return;
    const allDishes = Array.from(
      new Set(
        [
          ...(menu.breakfast || []),
          ...(menu.lunch || []),
          ...(menu.dinner || []),
        ]
          .map(cleanFoodName)
          .filter(Boolean)
      )
    );

    // Warm up portion presets in background so clicking any pill is 0ms
    allDishes.slice(0, 15).forEach((dish) => {
      if (!getCachedPortionProfile(dish)) {
        getFoodPortionProfile(dish).catch(() => {});
      }
    });
  }, [menu]);

  const persistStaples = async (newStaples: StapleMeal[]) => {
    setCachedData("user_staples", newStaples);
    if (!currentUser) return;
    const staplesDocRef = doc(db, "users", currentUser.uid, "staples", "current");
    await setDoc(staplesDocRef, { items: newStaples, lastUpdated: new Date().toISOString() });
  };

  const handleSaveStaple = async (stapleToSave: StapleMeal) => {
    const exists = staples.some(s => s.id === stapleToSave.id);
    const updated = exists
      ? staples.map(s => s.id === stapleToSave.id ? stapleToSave : s)
      : [stapleToSave, ...staples];
    setStaples(updated);
    await persistStaples(updated);
    setIsStapleModalOpen(false);
    setEditingStaple(null);
  };

  const handleDeleteStaple = async (id: string) => {
    const updated = staples.filter(s => s.id !== id);
    setStaples(updated);
    await persistStaples(updated);
    setIsStapleModalOpen(false);
    setEditingStaple(null);
  };

  const logStaple = async (targetMeal: MealType, staple: StapleMeal) => {
    const logKey = `${targetMeal}:${staple.id}`;
    setLoggingStapleKey(logKey);
    try {
      const entry: MacroEntry = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        name: staple.name,
        quantity: staple.portionSize || "1 serving",
        calories: staple.calories,
        protein: staple.protein,
        carbs: staple.carbs,
        fats: staple.fats,
        loggedAt: new Date().toISOString(),
      };
      const newLog = {
        ...log,
        [targetMeal]: [...(log[targetMeal] || []), entry],
      };
      setLog(newLog);
      await persist(newLog);
    } catch (err) {
      console.error("[logStaple] Error:", err);
      setToast("Failed to log staple. Please try again.");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoggingStapleKey(null);
    }
  };

  // Smooth scroll to hash when loading finishes
  useEffect(() => {
    if (!loading && hash) {
      const el = document.getElementById(hash.replace("#", ""));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [loading, hash]);

  const persist = async (newLog: DayLog) => {
    setCachedData("daily_log_" + today, newLog);
    if (!currentUser) return;
    const all = [...newLog.breakfast,...newLog.lunch,...newLog.dinner,...newLog.snacks];
    const totals = all.reduce((a,i)=>({calories:a.calories+i.calories,protein:a.protein+i.protein,carbs:a.carbs+i.carbs,fats:a.fats+i.fats}),{calories:0,protein:0,carbs:0,fats:0});
    await setDoc(doc(db,"users",currentUser.uid,"logs",today),{...newLog,totals,date:today});
  };

  const updateItem = async (mealType: MealType, updated: MacroEntry) => {
    const newLog = {
      ...log,
      [mealType]: (log[mealType] || []).map(i => i.id === updated.id ? updated : i)
    };
    setLog(newLog);
    await persist(newLog);
    setEditingEntry(null);
  };

    const logWithQuantity = async (
    mealType: MealType,
    foodName: string,
    quantity: string,
    isCustom = false,
    precalculatedMacros?: { calories: number; protein: number; carbs: number; fats: number; name?: string }
  ) => {
    let finalFood = foodName;
    let finalQty = quantity;

    if (isCustom && !finalQty) {
      const parsed = parseCustomFoodInput(foodName);
      if (parsed.quantity) {
        finalQty = parsed.quantity;
        finalFood = parsed.foodName;
      }
    }

    setPicker(null);

    // Instant optimistic log if macros were already precalculated in the picker
    if (precalculatedMacros && precalculatedMacros.calories > 0) {
      const cleanName = precalculatedMacros.name || finalFood;
      const { name: _, ...macroValues } = precalculatedMacros;
      const entry: MacroEntry = {
        id: Date.now().toString(),
        name: cleanName.toUpperCase(),
        quantity: finalQty || "1 serving",
        loggedAt: new Date().toISOString(),
        ...macroValues,
      };
      const newLog = { ...log, [mealType]: [...(log[mealType] || []), entry] };
      setLog(newLog);
      persist(newLog).catch(console.error);
      return;
    }

    const key = mealType + ":" + foodName;
    setEstimating(key);
    try {
      const macros = await estimateMacros(finalFood, finalQty, isCustom);
      const cleanName = (macros as any).name || finalFood;
      const { name: _, ...macroValues } = macros as any;
      const entry: MacroEntry = {
        id: Date.now().toString(),
        name: cleanName.toUpperCase(),
        quantity: finalQty || "1 serving",
        loggedAt: new Date().toISOString(),
        ...macroValues,
      };
      const newLog = { ...log, [mealType]: [...(log[mealType] || []), entry] };
      setLog(newLog);
      await persist(newLog);
    } catch (e: any) {
      console.error("[logWithQuantity] Error:", e);
      if (e?.message === "INVALID_FOOD") {
        setToast("Couldn't recognize that as food. Try being more specific!");
      } else {
        setToast("Something went wrong estimating macros. Try again!");
      }
      setTimeout(() => setToast(null), 3500);
    } finally {
      setEstimating(null);
    }
  };

  const removeItem = async (mealType: MealType, id: string) => {
    const newLog = { ...log, [mealType]: log[mealType].filter(i=>i.id!==id) };
    setLog(newLog); await persist(newLog);
  };

  const handlePhotoSelect = (mealType: MealType, file: File) => {
    setAnalyzing(mealType);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        const result = await analyzePlate(dataUrl.split(",")[1], file.type);
        if (result.items && result.items.length > 0) {
          setPhotoItems({ mealType, items: result.items });
        } else {
          setToast("No food detected in this photo. Please upload a clear photo of your meal or plate!");
          setTimeout(() => setToast(null), 4500);
        }
      } catch (err) {
        console.error("[handlePhotoSelect] Error:", err);
        setToast("Failed to analyze image. Please try again with a clearer photo!");
        setTimeout(() => setToast(null), 4500);
      } finally {
        setAnalyzing(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmPhotoItems = async (items: any[]) => {
    if (!photoItems) return;
    const { mealType } = photoItems;
    const entries: MacroEntry[] = items.map(item => ({
      id: Date.now().toString()+Math.random(), name: item.name, quantity: item.quantity||"",
      loggedAt: new Date().toISOString(), ...sanitizeMacros({ calories: Number(item.calories)||0, protein: Number(item.protein)||0, carbs: Number(item.carbs)||0, fats: Number(item.fats)||0 }),
    }));
    const newLog = { ...log, [mealType]: [...(log[mealType]||[]), ...entries] };
    setLog(newLog); await persist(newLog); setPhotoItems(null);
  };

  const totals = [...log.breakfast,...log.lunch,...log.dinner,...log.snacks].reduce(
    (a,i)=>({calories:a.calories+i.calories,protein:a.protein+i.protein,carbs:a.carbs+i.carbs,fats:a.fats+i.fats}),
    {calories:0,protein:0,carbs:0,fats:0}
  );

  const ringData: RingData[] = useMemo(() => [
    {
      id: "calories",
      label: "Calories",
      current: totals.calories,
      target: targets.calories,
      unit: "kcal",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.calories.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.calories.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.calories.trackColor,
    },
    {
      id: "protein",
      label: "Protein",
      current: totals.protein,
      target: targets.protein,
      unit: "g",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.protein.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.protein.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.protein.trackColor,
    },
    {
      id: "carbs",
      label: "Carbs",
      current: totals.carbs,
      target: targets.carbs,
      unit: "g",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.carbs.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.carbs.trackColor,
    },
    {
      id: "fats",
      label: "Fats",
      current: totals.fats,
      target: targets.fats,
      unit: "g",
      gradientStart: APPLE_FITNESS_MACRO_PALETTES.fats.gradientStart,
      gradientEnd: APPLE_FITNESS_MACRO_PALETTES.fats.gradientEnd,
      trackColor: APPLE_FITNESS_MACRO_PALETTES.fats.trackColor,
    },
  ], [totals, targets]);

  const caloriesRemaining = targets.calories - totals.calories;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin"/></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5 w-full min-w-0 pb-2 sm:pb-4">
      {picker && <QuantityPicker foodName={picker.foodName} onConfirm={(qty, macros)=>logWithQuantity(picker.mealType,picker.foodName,qty,picker.isCustom,macros)} onCancel={()=>setPicker(null)} />}
      {photoItems && <PhotoConfirm items={photoItems.items} onConfirm={confirmPhotoItems} onCancel={()=>setPhotoItems(null)} />}
      {editingEntry && (
        <EditLogItemModal
          item={editingEntry.item}
          mealType={editingEntry.mealType}
          onSave={updated => updateItem(editingEntry.mealType, updated)}
          onDelete={() => {
            removeItem(editingEntry.mealType, editingEntry.item.id);
            setEditingEntry(null);
          }}
          onCancel={() => setEditingEntry(null)}
        />
      )}
      {isStapleModalOpen && (
        <StapleMealModal
          staple={editingStaple}
          isOpen={isStapleModalOpen}
          onClose={() => {
            setIsStapleModalOpen(false);
            setEditingStaple(null);
          }}
          onSave={handleSaveStaple}
          onDelete={handleDeleteStaple}
        />
      )}
      {isStaplesManagerOpen && (
        <StaplesManagerModal
          isOpen={isStaplesManagerOpen}
          onClose={() => setIsStaplesManagerOpen(false)}
          staples={staples}
          loading={staplesLoading}
          onAddStaple={() => {
            setEditingStaple(null);
            setIsStapleModalOpen(true);
          }}
          onEditStaple={staple => {
            setEditingStaple(staple);
            setIsStapleModalOpen(true);
          }}
          onDeleteStaple={staple => setStapleToDelete(staple)}
          onLogStaple={logStaple}
          loggingKey={loggingStapleKey}
        />
      )}

      {/* Custom Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-[90%]">
          <div className="bg-amber-500/10 border border-amber-500/25 backdrop-blur-xl rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-2xl">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm font-medium text-amber-200 flex-1 leading-snug">{toast}</p>
            <button onClick={() => setToast(null)} className="text-amber-400/50 hover:text-amber-200 transition-colors ml-1 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Title & Staples Trigger */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-bold tracking-widest uppercase text-white/50 mb-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Daily Intake</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tightest font-sans truncate">
            Nutrition Log
          </h1>
          <p className="text-xs text-white/45 mt-0.5 truncate">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        
        <button
          onClick={() => setIsStaplesManagerOpen(true)}
          className="shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-2xl bg-[#121418] border border-white/[0.08] hover:border-amber-400/40 hover:bg-white/[0.04] text-white transition-all group active:scale-[0.98]"
          title="Manage permanent custom staples & recipes"
        >
          <Bookmark className="w-4 h-4 text-amber-400 fill-amber-400/20 group-hover:scale-110 transition-transform shrink-0" />
          <div className="text-left">
            <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>My Staples</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/15 text-amber-300 font-semibold border border-amber-400/20">
                {staples.length}
              </span>
            </p>
            <p className="text-[9px] text-white/40 hidden sm:block">Custom Recipes</p>
          </div>
        </button>
      </div>

      {/* Apple Fitness Activity Rings Overview Card */}
      <div className="rounded-3xl bg-[#121418] border border-white/[0.08] p-4 sm:p-6 shadow-xl relative w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          {/* Apple Rings Visualizer */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <AppleActivityRing
              rings={ringData}
              size={120}
              strokeWidth={10}
              ringGap={3.5}
            />
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-white/35 mt-2">
              Cal &middot; Pro &middot; Carb &middot; Fat
            </span>
          </div>

          {/* Calorie & Macro Target Split */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-3">
              <div>
                <p className="text-3xl sm:text-4xl font-black font-sans tracking-tight text-white tabular-nums">
                  {Math.round(totals.calories)}
                  <span className="text-xs sm:text-sm font-normal text-white/40 ml-1">/ {targets.calories} kcal</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-white/40 mt-0.5">Active Energy Logged</p>
              </div>

              <div className="text-right">
                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${
                  caloriesRemaining < 0
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                }`}>
                  {caloriesRemaining < 0 ? `+${Math.abs(Math.round(caloriesRemaining))} over` : `${Math.round(caloriesRemaining)} left`}
                </span>
              </div>
            </div>

            {/* Micro Macro Bars */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { key: "protein", label: "Protein", current: totals.protein, target: targets.protein, color: "text-orange-400", bar: "bg-orange-400" },
                { key: "carbs",   label: "Carbs",   current: totals.carbs,   target: targets.carbs,   color: "text-sky-400",    bar: "bg-sky-400" },
                { key: "fats",    label: "Fats",    current: totals.fats,    target: targets.fats,    color: "text-emerald-400", bar: "bg-emerald-400" },
              ].map(m => {
                const cue = getMacroStatusCue(m.key, m.current, m.target);
                const barWidth = Math.min(100, cue.pct);
                return (
                  <div key={m.label} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-white/40 uppercase tracking-wider font-bold text-[9px]">{m.label}</span>
                      <span className={`text-[9px] font-mono font-bold flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${cue.colorClasses}`}>
                        <span>{cue.arrow}</span>
                        <span>{cue.pct}%</span>
                      </span>
                    </div>
                    <p className={`text-sm sm:text-base font-extrabold font-sans tabular-nums ${m.color}`}>
                      {Math.round(m.current)}<span className="text-[10px] font-normal text-white/40">/{m.target}g</span>
                    </p>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Meal Filter Tabs (Zero Cutoff Across Any Phone Display) */}
      <div className="w-full max-w-full min-w-0 grid grid-cols-5 gap-1 p-1 rounded-2xl bg-[#121418] border border-white/[0.06]">
        {[
          { key: "all" as const, fullLabel: "All Meals", shortLabel: "All", icon: UtensilsCrossed },
          { key: "breakfast" as const, fullLabel: "Breakfast", shortLabel: "B'fast", icon: Coffee },
          { key: "lunch" as const, fullLabel: "Lunch", shortLabel: "Lunch", icon: Sun },
          { key: "dinner" as const, fullLabel: "Dinner", shortLabel: "Dinner", icon: Moon },
          { key: "snacks" as const, fullLabel: "Snacks", shortLabel: "Snacks", icon: Sparkles },
        ].map(tab => {
          const isActive = activeMealFilter === tab.key;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveMealFilter(tab.key)}
              className={`w-full flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-xs font-semibold transition-all select-none ${
                isActive
                  ? "bg-white text-black shadow-md font-bold"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-black" : "text-white/50"}`} />
              <span className="hidden md:inline truncate">{tab.fullLabel}</span>
              <span className="md:hidden truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Meal Sections */}
      {mealConfig
        .filter(({ key }) => activeMealFilter === "all" || activeMealFilter === key)
        .map(({ key, label, icon: Icon, color, bg, border }) => {
        const loggedItems = log[key]||[];
        const rawMenuItems: string[] = key!=="snacks"&&menu ? (menu[key as "breakfast"|"lunch"|"dinner"]||[]) : [];
        const cleanedMenuItems = Array.from(new Set(rawMenuItems.map(cleanFoodName).filter(Boolean)));
        const alreadyLogged = new Set(loggedItems.map(i => cleanFoodName(i.name).toUpperCase()));
        const quickChips = cleanedMenuItems.filter(item => !alreadyLogged.has(item.toUpperCase()));
        const mealKcal = loggedItems.reduce((s,i)=>s+i.calories,0);
        const mealStaples = staples.filter(s => s.mealType === "any" || s.mealType === key);

        return (
          <div key={key} id={key} className="rounded-3xl bg-[#121418] border border-white/[0.06] p-5 md:p-6 space-y-5 scroll-mt-24 group hover:border-white/[0.12] transition-all">
            {/* Meal Header */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${bg} ${border}`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-white tracking-tight">{label}</p>
                {mealKcal > 0 && (
                  <p className="text-[11px] font-sans font-medium text-white/40">{Math.round(mealKcal)} kcal</p>
                )}
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsStaplesManagerOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:border-amber-400/30 hover:text-white text-xs font-semibold transition-all"
                  title="View & manage daily staples"
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Staples</span>
                </button>
                <button 
                  onClick={()=>fileRefs[key].current?.click()} 
                  disabled={analyzing===key}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    analyzing===key 
                      ? "border-white/10 text-white/30 bg-transparent" 
                      : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {analyzing===key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{analyzing===key ? "Analyzing..." : "Photo"}</span>
                </button>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  ref={fileRefs[key]}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(key, f); e.target.value = ""; }}
                />
              </div>
            </div>

            {/* Logged Items List */}
            {loggedItems.length > 0 && (
              <div className="space-y-1 pt-1">
                {loggedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.02] border-b border-white/[0.04] last:border-0 transition-colors group/item">
                    <div
                      onClick={() => setEditingEntry({ mealType: key, item })}
                      className="flex-1 cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-white group-hover/item:text-emerald-400 transition-colors truncate">
                          {item.name}
                        </p>
                        {item.quantity && (
                          <span className="text-[10px] text-white/40 font-medium bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                            {item.quantity.length > 25 ? "1 serving" : item.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/40 font-sans mt-0.5">
                        {item.calories} kcal &middot; P {item.protein}g &middot; C {item.carbs}g &middot; F {item.fats}g
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover/item:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStaple({
                            id: "staple_" + Date.now(),
                            name: item.name,
                            recipe: item.quantity ? `${item.quantity} ${item.name}` : item.name,
                            portionSize: item.quantity && item.quantity.length <= 25 ? item.quantity : "1 serving",
                            mealType: key,
                            calories: item.calories,
                            protein: item.protein,
                            carbs: item.carbs,
                            fats: item.fats,
                            createdAt: new Date().toISOString(),
                          });
                          setIsStapleModalOpen(true);
                        }}
                        title="Save as permanent daily staple"
                        className="text-white/30 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-amber-400/10"
                      >
                        <Bookmark className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={() => setEditingEntry({ mealType: key, item })}
                        title="Edit item or macros"
                        className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]"
                      >
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button
                        onClick={() => setEntryToDelete({ mealType: key, item })}
                        title="Delete item"
                        className="text-white/30 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unified Quick Suggestions: Staples + Today's Mess Menu */}
            {(mealStaples.length > 0 || quickChips.length > 0) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Daily Staples */}
                {mealStaples.map(staple => {
                  const isLogging = loggingStapleKey === `${key}:${staple.id}`;
                  return (
                    <button
                      key={staple.id}
                      onClick={() => logStaple(key, staple)}
                      disabled={!!loggingStapleKey}
                      title={`1-tap log: ${staple.recipe}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 text-xs font-semibold transition-all active:scale-[0.98] shadow-sm"
                    >
                      {isLogging ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      )}
                      <span>{staple.name}</span>
                      <span className="text-[10px] text-amber-300/60 font-normal">({staple.protein}g P)</span>
                    </button>
                  );
                })}

                {/* Mess Menu Chips */}
                {quickChips.map(item => {
                  const cleanedItem = cleanFoodName(item);
                  const chipKey = key + ":" + cleanedItem; 
                  const isLoading = estimating === chipKey;
                  return (
                    <button 
                      key={item} 
                      onClick={() => setPicker({ mealType: key, foodName: cleanedItem })} 
                      disabled={!!estimating}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        isLoading 
                          ? "border-white/10 text-white/30" 
                          : "border-white/[0.08] bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 text-white/40" />}
                      <span>{cleanedItem}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Input */}
            <div className="flex gap-2 pt-1">
              <input 
                type="text" 
                placeholder="Add custom item (e.g. 2 chapatis, 1 glass milk, 2 ladles dal)..."
                value={customInput[key]||""}
                onChange={e => setCustomInput(prev => ({...prev, [key]: e.target.value}))}
                onKeyDown={e => {
                  if (e.key === "Enter" && customInput[key]?.trim()) {
                    const text = customInput[key]!.trim();
                    const parsed = parseCustomFoodInput(text);
                    const hasMeasurement = /\d+\s*(g|gm|gms|gram|grams|ml|l|ltr|kg)\b/i.test(text);
                    const hasPortionCount = /\b(\d+|half|one|two|three|four|five)\s*(box|boxes|packet|packets|plate|plates|piece|pieces|slice|slices|scoop|scoops|tbsp|tsp|cup|cups|serving|servings|ladle|ladles|glass|glasses|roti|rotis|chapati|chapatis|egg|eggs)\b/i.test(text);
                    const isComplexMeal = text.length > 25 || text.split(/\s+/).length > 3 || /\b(with|and|from|plus|\+)\b/i.test(text);
                    const isDirectAI = hasMeasurement || hasPortionCount || isComplexMeal;

                    if (isDirectAI) {
                      logWithQuantity(key, parsed.foodName || text, parsed.quantity, true);
                    } else {
                      setPicker({ mealType: key, foodName: text.toUpperCase(), isCustom: true });
                    }
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/25 transition-all"
              />
              <button 
                onClick={() => {
                  if (customInput[key]?.trim()) {
                    const text = customInput[key]!.trim();
                    const parsed = parseCustomFoodInput(text);
                    const hasMeasurement = /\d+\s*(g|gm|gms|gram|grams|ml|l|ltr|kg)\b/i.test(text);
                    const hasPortionCount = /\b(\d+|half|one|two|three|four|five)\s*(box|boxes|packet|packets|plate|plates|piece|pieces|slice|slices|scoop|scoops|tbsp|tsp|cup|cups|serving|servings|ladle|ladles|glass|glasses|roti|rotis|chapati|chapatis|egg|eggs)\b/i.test(text);
                    const isComplexMeal = text.length > 25 || text.split(/\s+/).length > 3 || /\b(with|and|from|plus|\+)\b/i.test(text);
                    const isDirectAI = hasMeasurement || hasPortionCount || isComplexMeal;

                    if (isDirectAI) {
                      logWithQuantity(key, parsed.foodName || text, parsed.quantity, true);
                    } else {
                      setPicker({ mealType: key, foodName: text.toUpperCase(), isCustom: true });
                    }
                    setCustomInput(prev => ({ ...prev, [key]: "" }));
                  }
                }}
                disabled={!!estimating}
                className="px-5 py-2.5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                {estimating?.startsWith(key + ":") ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : null}
                <span>Add</span>
              </button>
            </div>
          </div>
        );
      })}
    
      {/* Delete Logged Meal Item Confirmation Dialog */}
      <ConfirmDialog
        open={!!entryToDelete}
        title="Remove logged food?"
        description={entryToDelete ? `Are you sure you want to remove "${entryToDelete.item.name}" from your ${entryToDelete.mealType}?` : ""}
        confirmLabel="Remove"
        cancelLabel="Keep"
        variant="danger"
        icon="warning"
        onConfirm={() => {
          if (entryToDelete) {
            removeItem(entryToDelete.mealType, entryToDelete.item.id);
            setEntryToDelete(null);
          }
        }}
        onCancel={() => setEntryToDelete(null)}
      />

      {/* Delete Custom Staple Confirmation Dialog */}
      <ConfirmDialog
        open={!!stapleToDelete}
        title="Delete custom staple?"
        description={stapleToDelete ? `Are you sure you want to permanently delete "${stapleToDelete.name}"?` : ""}
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        icon="warning"
        onConfirm={() => {
          if (stapleToDelete) {
            handleDeleteStaple(stapleToDelete.id);
            setStapleToDelete(null);
          }
        }}
        onCancel={() => setStapleToDelete(null)}
      />
    </div>
  );
}