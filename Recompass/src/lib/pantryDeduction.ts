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
  deductedDisplay: string;
  remainingDisplay: string;
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
  const unitMatch = rest.match(/^(nos?|pcs?|pieces?|scoops?|tbsp|tablespoons?|tsp|teaspoons?|pinch|pinches|dash|dashes|cups?|mugs?|glasses?|slices?|packs?|packets?|jars?|bottles?|tubs?|cans?|g|gm|gms|grams?|kg|ml|l|ltr|liters?|litres?)\s+(?:of\s+)?(.*)$/i);
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
    else if (/^(pinch|pinches|dash|dashes)$/.test(rawUnit)) normUnit = "pinch";
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
 * Note: 'powder' is kept intact because foods like 'Chilli Powder' or 'Protein Powder' need it to match.
 */
export function cleanIngredientName(name: string): string {
  return name
    .replace(/\b(pinch|pinches|dash|dashes|ripe|unripe|fresh|raw|cooked|boiled|chopped|sliced|diced|grated|crushed|optional|to taste|warm|cold|hot|large|medium|small)\b/gi, "")
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

export type PantryDeduction = {
  ingredientStr?: string;
  pantryItemName?: string;
  deductQuantity: number;
  unit?: string;
};

/**
 * Normalizes deduction amounts based on pantry unit vs recipe parsed unit.
 */
export function calculateDeductionAmount(
  pantryItem: PantryItem,
  parsedQty: number,
  parsedUnit: string,
  ingredientName?: string
): number {
  const pUnit = (pantryItem.unit || "pcs").toLowerCase().trim();
  const rUnit = (parsedUnit || "pcs").toLowerCase().trim();
  const name = (ingredientName || pantryItem.name || "").toLowerCase().trim();

  // Same unit: direct deduction
  if (
    pUnit === rUnit ||
    (pUnit.startsWith("scoop") && rUnit.startsWith("scoop")) ||
    (pUnit.startsWith("pc") && rUnit.startsWith("pc")) ||
    (pUnit.startsWith("slice") && rUnit.startsWith("slice"))
  ) {
    return parsedQty;
  }

  // Grams to Kg or vice versa
  if (pUnit === "kg" && (rUnit === "g" || rUnit === "gram" || rUnit === "grams")) {
    return Math.round((parsedQty / 1000) * 1000) / 1000;
  }
  if (pUnit === "g" && (rUnit === "kg" || rUnit === "kilogram" || rUnit === "kilograms")) {
    return parsedQty * 1000;
  }

  // Milliliters to Liters or vice versa
  if (pUnit === "l" && (rUnit === "ml" || rUnit === "milliliter" || rUnit === "milliliters")) {
    return Math.round((parsedQty / 1000) * 1000) / 1000;
  }
  if (pUnit === "ml" && (rUnit === "l" || rUnit === "liter" || rUnit === "liters")) {
    return parsedQty * 1000;
  }

  // Scoops (Protein Powder ~30g, Creatine ~5g)
  if (pUnit === "g" && (rUnit === "scoop" || rUnit === "scoops")) {
    const perScoop = name.includes("creatine") ? 5 : 30;
    return parsedQty * perScoop;
  }
  if (pUnit === "kg" && (rUnit === "scoop" || rUnit === "scoops")) {
    const perScoop = name.includes("creatine") ? 5 : 30;
    return Math.round(((parsedQty * perScoop) / 1000) * 1000) / 1000;
  }
  if ((pUnit === "scoop" || pUnit === "scoops") && (rUnit === "g" || rUnit === "gram" || rUnit === "grams")) {
    const perScoop = name.includes("creatine") ? 5 : 30;
    return Math.round((parsedQty / perScoop) * 10) / 10;
  }

  // Teaspoons (tsp) - 1 tsp = 5ml, ~3g spice
  if (rUnit === "tsp" || rUnit === "teaspoon" || rUnit === "teaspoons") {
    if (pUnit === "ml") return parsedQty * 5;
    if (pUnit === "l") return Math.round((parsedQty * 0.005) * 1000) / 1000;
    if (pUnit === "g") return parsedQty * 3;
    if (pUnit === "kg") return Math.round((parsedQty * 0.003) * 1000) / 1000;
    if (["bottle", "bottles", "jar", "jars"].includes(pUnit)) return Math.round((parsedQty * 0.01) * 100) / 100;
    if (["pack", "packs"].includes(pUnit)) return Math.round((parsedQty * 0.02) * 100) / 100;
  }

  // Tablespoons (tbsp) - 1 tbsp = 15ml, ~16g PB/jam, ~12g other
  if (rUnit === "tbsp" || rUnit === "tablespoon" || rUnit === "tablespoons") {
    if (pUnit === "ml") return parsedQty * 15;
    if (pUnit === "l") return Math.round((parsedQty * 0.015) * 1000) / 1000;
    if (pUnit === "g") {
      const gPerTbsp = name.includes("peanut") || name.includes("jam") || name.includes("butter") ? 16 : 12;
      return parsedQty * gPerTbsp;
    }
    if (pUnit === "kg") {
      const gPerTbsp = name.includes("peanut") || name.includes("jam") || name.includes("butter") ? 16 : 12;
      return Math.round(((parsedQty * gPerTbsp) / 1000) * 1000) / 1000;
    }
    if (["jar", "jars", "tub", "tubs"].includes(pUnit)) {
      // 1 tbsp is ~16g out of ~350g-400g jar -> ~0.04 jar
      return Math.round((parsedQty * 0.04) * 100) / 100;
    }
    if (["bottle", "bottles"].includes(pUnit)) {
      return Math.round((parsedQty * 0.03) * 100) / 100;
    }
    if (["pack", "packs"].includes(pUnit)) {
      // 1 tbsp mayo/ketchup (~15g) from a 200-250g pack -> ~0.06 - 0.08 pack
      return Math.round((parsedQty * 0.07) * 100) / 100;
    }
  }

  // Pinches & Dashes (1 pinch = 1g)
  if (rUnit === "pinch" || rUnit === "pinches" || rUnit === "dash" || rUnit === "dashes") {
    if (pUnit === "g") return parsedQty * 1;
    if (pUnit === "kg") return Math.round((parsedQty * 0.001) * 1000) / 1000;
    if (pUnit === "ml") return parsedQty * 1;
  }

  // Cups (1 cup ~ 250ml, ~100g oats/flour)
  if (rUnit === "cup" || rUnit === "cups") {
    if (pUnit === "ml") return parsedQty * 250;
    if (pUnit === "l") return Math.round((parsedQty * 0.25) * 100) / 100;
    if (pUnit === "g") return parsedQty * 100;
    if (pUnit === "kg") return Math.round((parsedQty * 0.1) * 100) / 100;
    if (["pack", "packs"].includes(pUnit)) return Math.round((parsedQty * 0.5) * 10) / 10;
  }

  // Jars & Tubs vs Grams / Kg (e.g. 1 jar Peanut Butter vs 16g-32g)
  if (["jar", "jars", "tub", "tubs"].includes(pUnit)) {
    if (rUnit === "g" || rUnit === "gram" || rUnit === "grams") {
      // Standard peanut butter/jam jar ~ 350-400g
      return Math.round((parsedQty / 400) * 100) / 100;
    }
    if (rUnit === "kg") {
      return Math.round((parsedQty / 0.4) * 100) / 100;
    }
  }

  // Fluid Containers (e.g. Pantry in "packs" or "bottle", recipe in "ml" or "l")
  if (["pack", "packs", "bottle", "bottles", "carton"].includes(pUnit)) {
    if (rUnit === "ml" || rUnit === "milliliter") {
      // Assume typical 500ml milk packet/carton/bottle
      return Math.round((parsedQty / 500) * 100) / 100;
    }
    if (rUnit === "l" || rUnit === "liter") {
      return Math.round((parsedQty * 2) * 100) / 100;
    }
    if (rUnit === "g" || rUnit === "gram" || rUnit === "grams") {
      // Standard dry pack ~ 400-500g
      return Math.round((parsedQty / 500) * 100) / 100;
    }
  }

  // Bread & Cheese: Pack vs Slices (e.g. 1 pack Bread vs 2 slices Bread)
  if (["pack", "packs"].includes(pUnit) && ["slice", "slices"].includes(rUnit)) {
    // 1 standard bread/cheese pack ~ 16 slices
    return Math.round((parsedQty / 16) * 100) / 100;
  }
  if (["slice", "slices"].includes(pUnit) && ["pack", "packs"].includes(rUnit)) {
    return parsedQty * 16;
  }

  // Discrete pieces vs slices (e.g. Bread slices vs pcs)
  if (
    ["slice", "slices", "pcs", "piece", "pieces"].includes(pUnit) &&
    ["slice", "slices", "pcs", "piece", "pieces"].includes(rUnit)
  ) {
    return parsedQty;
  }

  // Special heuristic: if pUnit is pack and item is bread/cheese, but rUnit was omitted or passed as pcs
  if (["pack", "packs"].includes(pUnit) && (name.includes("bread") || name.includes("cheese")) && parsedQty <= 6) {
    // Likely 1-4 slices
    return Math.round((parsedQty / 16) * 100) / 100;
  }

  // Special heuristic: if pUnit is kg and item is oats/flour/sugar and parsedQty >= 10, likely grams
  if (pUnit === "kg" && parsedQty >= 5 && (rUnit === "pcs" || rUnit === "")) {
    return Math.round((parsedQty / 1000) * 1000) / 1000;
  }

  // Default fallback: deduct parsed quantity or 1
  return parsedQty > 0 ? parsedQty : 1;
}

/**
 * Analyzes a full recipe against pantry items to compute the before/after impact of cooking.
 * Uses Gemini AI's dynamic recipe deductions if available, with intelligent fallback.
 */
export function getRecipePantryImpact(
  ingredients: string[],
  pantryItems: PantryItem[],
  aiDeductions?: PantryDeduction[]
): PantryImpactItem[] {
  if (!ingredients || ingredients.length === 0) return [];

  return ingredients.map(ingStr => {
    const parsed = parseRecipeIngredient(ingStr);

    // 1. Try to find AI-computed deduction first
    const aiDeduction = aiDeductions?.find(d => {
      if (d.ingredientStr && d.ingredientStr.trim().toLowerCase() === ingStr.trim().toLowerCase()) return true;
      if (d.pantryItemName) {
        const dClean = cleanIngredientName(d.pantryItemName).toLowerCase();
        const pClean = cleanIngredientName(parsed.name).toLowerCase();
        return dClean === pClean || dClean.includes(pClean) || pClean.includes(dClean);
      }
      return false;
    });

    // 2. Match pantry item
    const matched = aiDeduction?.pantryItemName
      ? matchPantryItem(aiDeduction.pantryItemName, pantryItems) || matchPantryItem(parsed.name, pantryItems)
      : matchPantryItem(parsed.name, pantryItems);

    if (!matched) {
      return {
        ingredientStr: ingStr,
        matchedItem: null,
        deductQuantity: 0,
        remainingQuantity: 0,
        deductedDisplay: "",
        remainingDisplay: "not stocked",
        statusBefore: "depleted",
        statusAfter: "depleted",
        willBeLowStock: false,
        willDeplete: false,
        notInPantry: true,
      };
    }

    // 3. Normalize raw quantity and unit through calculateDeductionAmount
    let rawQty = parsed.quantity;
    let rawUnit = parsed.unit;

    if (aiDeduction && typeof aiDeduction.deductQuantity === "number" && aiDeduction.deductQuantity > 0) {
      rawQty = aiDeduction.deductQuantity;
      if (aiDeduction.unit) {
        rawUnit = aiDeduction.unit;
      }
    }

    const deductQty = calculateDeductionAmount(matched, rawQty, rawUnit, parsed.name);
    const pUnit = (matched.unit || "pcs").toLowerCase().trim();
    const rUnit = (rawUnit || "pcs").toLowerCase().trim();

    // Human-readable deduction string (e.g. "-30g" instead of "-0.03 kg")
    let deductedDisplay = `-${rawQty} ${rawUnit}`;
    if (rUnit === pUnit) {
      deductedDisplay = `-${deductQty} ${matched.unit}`;
    }

    let remaining = Math.max(0, Math.round((matched.quantity - deductQty) * 1000) / 1000);
    
    // Remaining display string (e.g. "970g left" instead of "0.97 kg left")
    let remainingDisplay = `${remaining} ${matched.unit} left`;
    if (remaining <= 0) {
      remainingDisplay = "depleted";
    } else if (pUnit === "kg" && (rUnit === "g" || rUnit === "gram" || rUnit === "grams" || remaining < 1)) {
      const gLeft = Math.round(remaining * 1000);
      remainingDisplay = `${gLeft}g left`;
    } else if (pUnit === "l" && (rUnit === "ml" || remaining < 1)) {
      const mlLeft = Math.round(remaining * 1000);
      remainingDisplay = `${mlLeft}ml left`;
    }

    const statusBefore = getStockStatus(matched);
    const statusAfter = getStockStatus({ ...matched, quantity: remaining });

    return {
      ingredientStr: ingStr,
      matchedItem: matched,
      deductQuantity: deductQty,
      remainingQuantity: remaining,
      deductedDisplay,
      remainingDisplay,
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
 * Automatically converts items to grams or ml if remaining quantity falls below 1kg / 1L
 * so the pantry is stored cleanly without decimal rounding confusion.
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

    const unit = (item.unit || "pcs").toLowerCase().trim();
    let newQty = Math.max(0, item.quantity - toDeduct);
    let newUnit = item.unit;

    // Convert sub-kilogram quantities to grams (e.g. 1kg - 30g = 970g)
    if (unit === "kg" && newQty < 1 && newQty > 0) {
      newQty = Math.round(newQty * 1000);
      newUnit = "g";
    }
    // Convert sub-liter quantities to ml (e.g. 1L - 100ml = 900ml)
    else if (unit === "l" && newQty < 1 && newQty > 0) {
      newQty = Math.round(newQty * 1000);
      newUnit = "ml";
    } else {
      newQty = Math.round(newQty * 100) / 100;
    }

    return {
      ...item,
      quantity: newQty,
      unit: newUnit,
      updatedAt: new Date().toISOString(),
    };
  });
}
