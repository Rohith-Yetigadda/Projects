import { GoogleGenerativeAI } from "@google/generative-ai";

export const FOOD_CATEGORIES = [
  "Protein",
  "Dairy",
  "Produce",
  "Grains",
  "Spreads",
  "Snacks",
  "Supplements",
  "Spices",
  "Oils",
  "Other"
] as const;

export type FoodCategory = typeof FOOD_CATEGORIES[number];

export interface ClassifiedFood {
  name: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
}

const CLIENT_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
const CLASSIFICATION_CACHE = new Map<string, ClassifiedFood>();

// Load persistent cache from localStorage
try {
  const stored = localStorage.getItem("recompass_food_classifications");
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.entries(parsed).forEach(([k, v]) => CLASSIFICATION_CACHE.set(k, v as ClassifiedFood));
  }
} catch {
  // Ignore
}

function saveToCache(key: string, item: ClassifiedFood) {
  CLASSIFICATION_CACHE.set(key.toLowerCase().trim(), item);
  try {
    const obj = Object.fromEntries(CLASSIFICATION_CACHE.entries());
    localStorage.setItem("recompass_food_classifications", JSON.stringify(obj));
  } catch {
    // Ignore
  }
}

/**
 * Instant local parser & classifier that runs in <1ms (0 network delay).
 * Enables instant optimistic UI updates when adding items to Pantry or Groceries.
 */
export function fastClassifyFood(
  input: string,
  fallbackQty = 1,
  defaultUnit = "pcs"
): ClassifiedFood {
  const trimmed = input.trim();
  if (!trimmed) {
    return { name: "", category: "Other", quantity: fallbackQty, unit: defaultUnit };
  }

  // 1. Check persistent cache
  const cached = CLASSIFICATION_CACHE.get(trimmed.toLowerCase());
  if (cached) {
    return { ...cached, quantity: fallbackQty || cached.quantity, unit: defaultUnit !== "pcs" ? defaultUnit : cached.unit };
  }

  // 2. Parse quantity and unit from input string (e.g., "500g rolled oats", "2 jars peanut butter", "1 pack milk")
  let cleanName = trimmed;
  let parsedQty = fallbackQty;
  let parsedUnit = defaultUnit;

  const matchLeading = cleanName.match(/^(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|kg|kgs|ml|l|ltr|litre|litres|pcs|piece|pieces|slice|slices|scoop|scoops|jar|jars|pack|packs|packet|packets|bottle|bottles|box|boxes|bowl|bowls|tbsp|tsp)\b\s*(?:of\s+)?(.*)$/i);
  if (matchLeading) {
    parsedQty = parseFloat(matchLeading[1]);
    const rawUnit = matchLeading[2].toLowerCase();
    if (rawUnit.startsWith("g") && !rawUnit.startsWith("gar")) parsedUnit = "g";
    else if (rawUnit.startsWith("kg")) parsedUnit = "kg";
    else if (rawUnit === "ml") parsedUnit = "ml";
    else if (rawUnit.startsWith("l")) parsedUnit = "L";
    else if (rawUnit.startsWith("scoop")) parsedUnit = "scoops";
    else if (rawUnit.startsWith("pack")) parsedUnit = "packs";
    else if (rawUnit.startsWith("box")) parsedUnit = "box";
    else if (rawUnit.startsWith("slice")) parsedUnit = "slices";
    else if (rawUnit.startsWith("tbsp")) parsedUnit = "tbsp";
    else if (rawUnit.startsWith("tsp")) parsedUnit = "tsp";
    else if (rawUnit.startsWith("jar")) {
      // User requested eliminating jar units -> convert to standard weight (350g per jar)
      parsedQty = parsedQty * 350;
      parsedUnit = "g";
    } else if (rawUnit.startsWith("bottle")) {
      // User requested eliminating bottle units -> convert to standard volume (500ml per bottle)
      parsedQty = parsedQty * 500;
      parsedUnit = "ml";
    } else {
      parsedUnit = "pcs";
    }
    cleanName = matchLeading[3].trim();
  }

  // Clean trailing punctuation and capitalize
  cleanName = cleanName.replace(/^[-,:.]+|[-,:.]+$/g, "").trim() || trimmed;
  const capitalized = cleanName
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const lower = cleanName.toLowerCase();

  // Instant category resolution for common pantry & grocery staples
  let category: FoodCategory = "Other";

  // Spreads (peanut butter, jam, mayonnaise, ketchup, chocolate spreads, nutella, marmalade, hummus, etc.)
  if (/\b(peanut butter|pb|mayo|mayonnaise|ketchup|tomato ketchup|jam|jams|marmalade|chocolate spread|nutella|hummus|cream cheese spread|spreads?)\b/.test(lower)) {
    category = "Spreads";
    if (parsedUnit === "pcs" && !matchLeading) {
      parsedUnit = "g";
      parsedQty = 350;
    }
  }
  // Grains (prioritize oats/muesli first so "Fruit & Nuts Oats" doesn't hit fruit)
  else if (/\b(oats?|rolled oats?|instant oats?|steel cut|muesli|oatmeal|breakfast cereal|cornflakes?|rice|steamed rice|basmati|brown rice|wheat|flour|atta|maida|besan|sooji|rava|semolina|poha|chivda|quinoa|daliya|vermicelli|semiya|noodles?|maggi|pasta|macaroni|bread|brown bread|white bread|multigrain|loaf|roti|chapatis?|parathas?|kulcha|naan|dals?|moong|toor|masoor|urad|chana|rajma|chole|lentils?)\b/.test(lower)) {
    category = "Grains";
    if (parsedUnit === "pcs" && !matchLeading) {
      if (/bread|brown bread|white bread|multigrain|loaf/.test(lower)) {
        parsedUnit = "packs";
      } else if (/roti|chapatis?|parathas?|kulcha|naan/.test(lower)) {
        parsedUnit = "pcs";
      } else {
        parsedUnit = "g";
      }
    }
  }
  // Dairy
  else if (/\b(milks?|toned milk|skim milk|dairy|curds?|dahi|yogurt|cheese|paneer|cottage cheese|butter|ghee|cream|malai|chaas|buttermilk|lassis?)\b/.test(lower)) {
    category = "Dairy";
    if (parsedUnit === "pcs" && !matchLeading) {
      parsedUnit = /milk|chaas|lassi/.test(lower)
        ? "ml"
        : /cheese/.test(lower)
        ? "slices"
        : /paneer|butter/.test(lower)
        ? "g"
        : "packs";
    }
  }
  // Protein
  else if (/\b(eggs?|egg whites?|boiled eggs?|chickens?|chicken breast|chicken curry|fish|fishes?|tuna|salmon|mutton|prawns?|tofu|soya|soya chunks?|nutrela|nutri|meat)\b/.test(lower)) {
    category = "Protein";
    if (parsedUnit === "pcs" && !matchLeading) {
      parsedUnit = /egg/.test(lower) ? "pcs" : "g";
    }
  }
  // Supplements
  else if (/\b(whey|protein powder|casein|creatine|multivitamin|fish oil|omega 3|bcaa|pre-workout|preworkout|electrolytes?|isolate)\b/.test(lower)) {
    category = "Supplements";
    if (parsedUnit === "pcs" && !matchLeading) parsedUnit = "scoops";
  }
  // Spices & Condiments
  else if (/\b(chilli|chilli powder|red chilli|mirchi|turmeric|haldi|jeera|cumin|coriander powder|dhania|garam masala|masala|black pepper|pepper|salt|black salt|rock salt|chaat masala|oregano|chilli flakes|paprika|cardamom|elaichi|clove|laung|cinnamon|dalchini|ginger garlic|mustard seeds|rai)\b/.test(lower)) {
    category = "Spices";
    if (parsedUnit === "pcs" && !matchLeading) parsedUnit = "g";
  }
  // Oils
  else if (/\b(oils?|olive oil|mustard oil|coconut oil|sunflower oil|vegetable oil|refined oil|sesame oil|cooking spray)\b/.test(lower)) {
    category = "Oils";
    if (parsedUnit === "pcs" && !matchLeading) parsedUnit = "ml";
  }
  // Snacks (Dry fruits, nuts, seeds, energy bars, etc. WITHOUT peanut butter/spreads)
  else if (/\b(almonds?|badam|cashews?|kaju|walnuts?|akhrot|raisins?|kishmish|chia seeds?|flax seeds?|pumpkin seeds?|sunflower seeds?|mixed seeds?|dry fruits?|peanuts?|groundnuts?|biscuits?|cookies?|chips?|popcorn|chocolates?|energy bar|protein bar|honey)\b/.test(lower)) {
    category = "Snacks";
    if (parsedUnit === "pcs" && !matchLeading) {
      parsedUnit = /honey/.test(lower) ? "g" : /seeds|almonds|cashews|nuts/.test(lower) ? "g" : "packs";
    }
  }
  // Produce (Fruits & Veggies)
  else if (/\b(bananas?|apples?|oranges?|papayas?|watermelons?|melons?|mangoes?|grapes?|guavas?|pineapples?|onions?|tomatoes?|potatoes?|aloo|pyaz|garlic|lahsun|ginger|adrak|spinach|palak|coriander|cilantro|mint|pudina|lemons?|nimbu|carrots?|cucumber|kheera|capsicum|shimla mirch|gobi|cauliflower|cabbage|matar|green peas|mushrooms?|vegetables?|veggies?|fruits?)\b/.test(lower)) {
    category = "Produce";
    if (parsedUnit === "pcs" && !matchLeading) {
      parsedUnit = /banana|apple|orange|lemon/.test(lower) ? "pcs" : "kg";
    }
  }

  const result: ClassifiedFood = {
    name: capitalized,
    category,
    quantity: parsedQty,
    unit: parsedUnit,
  };

  if (category !== "Other") {
    saveToCache(trimmed, result);
  }

  return result;
}

/**
 * Classifies food inputs dynamically using Gemini AI with instant local fast-path fallback.
 * Checks local cache first; if known staple, returns in <1ms; otherwise queries /api/compass.
 */
export async function classifyFoodWithAI(
  input: string,
  fallbackQty = 1,
  defaultUnit = "pcs"
): Promise<ClassifiedFood> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { name: "", category: "Other", quantity: fallbackQty, unit: defaultUnit };
  }

  // 1. Try instant fast classifier
  const instant = fastClassifyFood(trimmed, fallbackQty, defaultUnit);
  if (instant.category !== "Other") {
    return instant;
  }

  // 2. Try serverless endpoint /api/compass (Gemini 3.5 Flash Lite)
  try {
    const res = await fetch("/api/compass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "parse_and_classify_food",
        payload: { input: trimmed, fallbackQty, defaultUnit }
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        const catStr = String(data.category || "").trim();
        const matchedCat = FOOD_CATEGORIES.find(
          c => c.toLowerCase() === catStr.toLowerCase()
        ) || "Other";

        const parsedQty = typeof data.quantity === "number" ? data.quantity : parseFloat(data.quantity) || fallbackQty;

        const result: ClassifiedFood = {
          name: data.name,
          category: matchedCat,
          quantity: Math.max(0, parsedQty),
          unit: data.unit || defaultUnit
        };

        saveToCache(trimmed, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("API /api/compass unavailable, trying direct Gemini SDK:", err);
  }

  // 3. Direct Gemini SDK fallback
  if (CLIENT_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(CLIENT_API_KEY);
      let model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

      const prompt = `You are an expert grocery and nutrition database classifier.
Analyze this food, ingredient, or pantry item input: "${trimmed}".

AVAILABLE CATEGORIES:
"Protein", "Dairy", "Produce", "Grains", "Spreads", "Snacks", "Supplements", "Spices", "Oils", "Other"

OUTPUT STRICTLY AS JSON:
{"name":"FOOD_NAME","category":"CATEGORY","quantity":${fallbackQty},"unit":"${defaultUnit}"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const firstCurly = text.indexOf('{');
      const lastCurly = text.lastIndexOf('}');
      const jsonStr = (firstCurly !== -1 && lastCurly !== -1)
        ? text.substring(firstCurly, lastCurly + 1)
        : text;

      const data = JSON.parse(jsonStr);
      const catStr = String(data.category || "").trim();
      const matchedCat = FOOD_CATEGORIES.find(
        c => c.toLowerCase() === catStr.toLowerCase()
      ) || "Other";

      const parsedQty = typeof data.quantity === "number" ? data.quantity : parseFloat(data.quantity) || fallbackQty;

      const resItem: ClassifiedFood = {
        name: data.name || instant.name,
        category: matchedCat,
        quantity: Math.max(0, parsedQty),
        unit: data.unit || defaultUnit
      };

      saveToCache(trimmed, resItem);
      return resItem;
    } catch (sdkErr) {
      console.error("Direct Gemini SDK classification failed:", sdkErr);
    }
  }

  return instant;
}
