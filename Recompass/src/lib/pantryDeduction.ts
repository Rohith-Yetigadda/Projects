import { type PantryItem, type StockStatus, getStockStatus } from "@/pages/dashboard/Pantry";

export type ParsedIngredient = {
  raw: string;
  name: string;
  quantity: number;
  unit: string;
};

export type PantryImpactItem = {
  ingredientStr: string;
  matchedItem: PantryItem | null;
  deductQuantity: number;
  remainingQuantity: number;
  statusBefore: StockStatus;
  statusAfter: StockStatus;
  willBeLowStock: boolean;
  willDeplete: boolean;
  notInPantry: boolean;
};

const WORD_NUMBERS: Record<string, number> = {
  half: 0.5,
  quarter: 0.25,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/**
 * Parses a recipe ingredient line (e.g. "2 Eggs", "1 scoop Whey Protein", "50g Oats", "1 Banana")
 * into numeric quantity, unit, and clean ingredient name.
 */
export function parseRecipeIngredient(rawIngredient: string): ParsedIngredient {
  const str = (rawIngredient || "").trim();
  if (!str) return { raw: "", name: "", quantity: 1, unit: "pcs" };

  // 1. Match leading fraction e.g. "1/2 cup" or "1 1/2 tbsp"
  const fractionMatch = str.match(/^(\d+)?\s*(\d+)\/(\d+)\s*(?:of\s+)?(.*)$/i);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseFloat(fractionMatch[1]) : 0;
    const num = parseFloat(fractionMatch[2]);
    const den = parseFloat(fractionMatch[3]) || 1;
    const qty = whole + num / den;
    const rest = fractionMatch[4].trim();
    const { unit, name } = extractUnitAndName(rest);
    return { raw: str, name, quantity: qty, unit };
  }

  // 2. Match standard number or decimal or word-number
  const numMatch = str.match(/^((?:\d+(?:\.\d+)?)|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:of\s+)?(.*)$/i);
  if (numMatch) {
    const numToken = numMatch[1].toLowerCase();
    const qty = WORD_NUMBERS[numToken] !== undefined ? WORD_NUMBERS[numToken] : parseFloat(numToken) || 1;
    const rest = numMatch[2].trim();
    const { unit, name } = extractUnitAndName(rest);
    return { raw: str, name, quantity: qty, unit };
  }

  // 3. Fallback without leading number: default to 1
  const { unit, name } = extractUnitAndName(str);
  return { raw: str, name, quantity: 1, unit };
}

function extractUnitAndName(rest: string): { unit: string; name: string } {
  // Regex for known units
  const unitMatch = rest.match(/^(nos?|pcs?|pieces?|scoops?|tbsp|tablespoons?|tsp|teaspoons?|cups?|mugs?|glasses?|slices?|packs?|packets?|jars?|bottles?|tubs?|cans?|g|gm|gms|grams?|kg|ml|l|ltr|liters?|litres?)\s+(?:of\s+)?(.*)$/i);
  if (unitMatch) {
    const rawUnit = unitMatch[1].toLowerCase();
    const rawName = unitMatch[2].trim();
    let normUnit = "pcs";
    if (/^(g|gm|gms|grams?)$/.test(rawUnit)) normUnit = "g";
    else if (/^(kg)$/.test(rawUnit)) normUnit = "kg";
    else if (/^(ml)$/.test(rawUnit)) normUnit = "ml";
    else if (/^(l|ltr|liters?|litres?)$/.test(rawUnit)) normUnit = "l";
    else if (/^(tbsp|tablespoons?)$/.test(rawUnit)) normUnit = "tbsp";
    else if (/^(tsp|teaspoons?)$/.test(rawUnit)) normUnit = "tsp";
    else if (/^(scoops?)$/.test(rawUnit)) normUnit = "scoop";
    else if (/^(cups?|mugs?|glasses?)$/.test(rawUnit)) normUnit = "cup";
    else if (/^(slices?)$/.test(rawUnit)) normUnit = "slice";
    else if (/^(packs?|packets?)$/.test(rawUnit)) normUnit = "pack";
    else if (/^(jars?|bottles?|tubs?|cans?)$/.test(rawUnit)) normUnit = "jar";
    return { unit: normUnit, name: cleanIngredientName(rawName) };
  }

  return { unit: "pcs", name: cleanIngredientName(rest) };
}

/**
 * Cleans ingredient names by stripping generic preparation adjectives (ripe, chopped, fresh, diced).
 */
export function cleanIngredientName(name: string): string {
  return name
    .replace(/\b(ripe|unripe|fresh|raw|cooked|boiled|chopped|sliced|diced|grated|crushed|powder|optional|to taste|warm|cold|hot|large|medium|small)\b/gi, "")
    .replace(/[(),]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fuzzy matches an ingredient against a student's pantry inventory.
 */
export function matchPantryItem(ingredientName: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!ingredientName || !pantryItems || pantryItems.length === 0) return null;
  const target = cleanIngredientName(ingredientName).toLowerCase();
  if (!target) return null;

  // 1. Exact match (case insensitive)
  const exact = pantryItems.find(p => p.name.trim().toLowerCase() === target);
  if (exact) return exact;

  // 2. Singular / plural variants
  const targetSingular = target.replace(/s$/, "").replace(/es$/, "");
  const pluralVariant = pantryItems.find(p => {
    const pSingular = p.name.trim().toLowerCase().replace(/s$/, "").replace(/es$/, "");
    return pSingular === targetSingular;
  });
  if (pluralVariant) return pluralVariant;

  // 3. Substring match (either pantry name contains target or target contains pantry name)
  const substring = pantryItems.find(p => {
    const pLower = p.name.trim().toLowerCase();
    return target.includes(pLower) || pLower.includes(target);
  });
  if (substring) return substring;

  // 4. Token overlap match (e.g. "Whey Protein Powder" vs "Whey Protein")
  const targetTokens = target.split(/\s+/).filter(t => t.length > 2);
  for (const p of pantryItems) {
    const pTokens = p.name.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const overlap = targetTokens.filter(t => pTokens.includes(t));
    if (overlap.length > 0 && (overlap.length >= pTokens.length || overlap.length >= targetTokens.length)) {
      return p;
    }
  }

  return null;
}

/**
 * Normalizes deduction amounts based on pantry unit vs recipe parsed unit.
 */
export function calculateDeductionAmount(pantryItem: PantryItem, parsedQty: number, parsedUnit: string): number {
  const pUnit = (pantryItem.unit || "pcs").toLowerCase().trim();
  const rUnit = (parsedUnit || "pcs").toLowerCase().trim();

  // Same unit: direct deduction
  if (pUnit === rUnit || (pUnit.startsWith("scoop") && rUnit.startsWith("scoop")) || (pUnit.startsWith("pc") && rUnit.startsWith("pc"))) {
    return parsedQty;
  }

  // Grams to Kg or vice versa
  if (pUnit === "kg" && rUnit === "g") {
    return Math.round((parsedQty / 1000) * 1000) / 1000;
  }
  if (pUnit === "g" && rUnit === "kg") {
    return parsedQty * 1000;
  }

  // Milliliters to Liters or vice versa
  if (pUnit === "l" && rUnit === "ml") {
    return Math.round((parsedQty / 1000) * 1000) / 1000;
  }
  if (pUnit === "ml" && rUnit === "l") {
    return parsedQty * 1000;
  }

  // Fluid containers (e.g. Pantry in "packs" or "bottle", recipe in "ml" or "cup")
  if (["pack", "packs", "bottle", "bottles", "carton"].includes(pUnit)) {
    if (rUnit === "ml") {
      // Assume typical 500ml milk packet/carton in Indian hostels
      return Math.round((parsedQty / 500) * 100) / 100;
    }
    if (rUnit === "cup") {
      // 1 cup ~ 200ml -> ~0.4 pack
      return Math.round(parsedQty * 0.4 * 10) / 10;
    }
  }

  // Spreads / Jars (e.g. Peanut Butter jar vs tbsp, oil bottle vs tbsp)
  if (["jar", "jars", "tub", "tubs", "bottle", "bottles"].includes(pUnit) && ["tbsp", "tsp"].includes(rUnit)) {
    // 1 tbsp is ~0.05 jar/bottle (typical 350g-500g jar or bottle)
    return Math.round((parsedQty * 0.05) * 100) / 100;
  }

  // Discrete pieces vs slices (e.g. Bread slices vs pcs)
  if (["slice", "slices", "pcs", "piece", "pieces"].includes(pUnit) && ["slice", "slices", "pcs", "piece", "pieces"].includes(rUnit)) {
    return parsedQty;
  }

  // Default fallback: deduct parsed quantity or 1
  return parsedQty > 0 ? parsedQty : 1;
}

/**
 * Analyzes a full recipe against pantry items to compute the before/after impact of cooking.
 */
export function getRecipePantryImpact(ingredients: string[], pantryItems: PantryItem[]): PantryImpactItem[] {
  if (!ingredients || ingredients.length === 0) return [];

  return ingredients.map(ingStr => {
    const parsed = parseRecipeIngredient(ingStr);
    const matched = matchPantryItem(parsed.name, pantryItems);

    if (!matched) {
      return {
        ingredientStr: ingStr,
        matchedItem: null,
        deductQuantity: 0,
        remainingQuantity: 0,
        statusBefore: "depleted",
        statusAfter: "depleted",
        willBeLowStock: false,
        willDeplete: false,
        notInPantry: true,
      };
    }

    const deductQty = calculateDeductionAmount(matched, parsed.quantity, parsed.unit);
    const remaining = Math.max(0, Math.round((matched.quantity - deductQty) * 100) / 100);

    const statusBefore = getStockStatus(matched);
    const statusAfter = getStockStatus({ ...matched, quantity: remaining });

    return {
      ingredientStr: ingStr,
      matchedItem: matched,
      deductQuantity: deductQty,
      remainingQuantity: remaining,
      statusBefore,
      statusAfter,
      willBeLowStock: statusAfter === "low_stock" && statusBefore !== "low_stock",
      willDeplete: remaining <= 0,
      notInPantry: false,
    };
  });
}

/**
 * Returns updated pantry items after subtracting deductions.
 */
export function applyPantryDeductions(pantryItems: PantryItem[], impactList: PantryImpactItem[]): PantryItem[] {
  const deductMap = new Map<string, number>();

  impactList.forEach(imp => {
    if (imp.matchedItem && imp.deductQuantity > 0) {
      const existing = deductMap.get(imp.matchedItem.id) || 0;
      deductMap.set(imp.matchedItem.id, existing + imp.deductQuantity);
    }
  });

  return pantryItems.map(item => {
    const toDeduct = deductMap.get(item.id);
    if (!toDeduct) return item;
    const newQty = Math.max(0, Math.round((item.quantity - toDeduct) * 100) / 100);
    return {
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    };
  });
}
