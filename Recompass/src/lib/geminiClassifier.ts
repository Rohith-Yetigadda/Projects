import { GoogleGenerativeAI } from "@google/generative-ai";

export const FOOD_CATEGORIES = [
  "Protein",
  "Dairy",
  "Produce",
  "Grains",
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

/**
 * Classifies food inputs dynamically using Gemini AI.
 * First queries /api/compass; if offline or unavailable, falls back to direct client-side Gemini SDK.
 * No hardcoded keyword matching is used.
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

  // 1. Try serverless endpoint /api/compass
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

        return {
          name: data.name,
          category: matchedCat,
          quantity: Math.max(0, parsedQty),
          unit: data.unit || defaultUnit
        };
      }
    }
  } catch (err) {
    console.warn("API /api/compass unavailable, trying direct Gemini SDK:", err);
  }

  // 2. Direct Gemini SDK fallback
  if (CLIENT_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(CLIENT_API_KEY);
      let model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

      const prompt = `You are an expert grocery and nutrition database classifier.
Analyze this food, ingredient, or pantry item input: "${trimmed}".

AVAILABLE CATEGORIES (You must pick EXACTLY one):
- "Protein" (e.g. chicken, fish, mutton, eggs, egg whites, paneer, tofu, soya chunks, tuna, turkey, beef)
- "Dairy" (e.g. milk, cheese, curd, dahi, yogurt, butter, ghee, cream)
- "Produce" (e.g. bananas, apples, spinach, vegetables, fruits, onions, tomatoes, potatoes, garlic, ginger, cilantro, lemon)
- "Grains" (e.g. rice, oats, fruit and nut oats, rolled oats, muesli, oatmeal, wheat, flour/atta, bread, roti, chapati, dal, lentils, pasta, noodles, quinoa)
- "Snacks" (e.g. peanut butter, almonds, nuts, chips, biscuits, cookies, popcorn, chocolates)
- "Supplements" (e.g. whey protein, casein, creatine, multivitamins, fish oil, bcaa, pre-workout, electrolytes)
- "Spices" (e.g. chilli powder, red chilli, turmeric, haldi, jeera, cumin, garam masala, salt, black pepper, oregano, paprika, chaat masala, curry powder)
- "Oils" (e.g. olive oil, mustard oil, coconut oil, sunflower oil, vegetable oil, cooking spray)
- "Other" (any food or consumable that strictly does not fit the above)

RULES:
1. "name": Clean, properly capitalized food title (e.g. "Chilli Powder", "Fruit & Nuts Oats", "Eggs", "Rolled Oats", "Peanut Butter"). Strip leading numbers.
2. "category": Must match one of the exact categories above. If the item is oats, muesli, or breakfast cereal with fruits or nuts (e.g. "Fruit & Nuts Oats"), its primary base is Grains.
3. "quantity": Numeric quantity from the input if specified, or fallback to ${fallbackQty}.
4. "unit": Best fitting unit ("g", "kg", "ml", "pcs", "jar", "packs", "bottles", "scoops"). If not mentioned, infer the natural standard unit.

OUTPUT STRICTLY AS JSON (no markdown formatting):
{"name":"Fruit & Nuts Oats","category":"Grains","quantity":${fallbackQty},"unit":"g"}`;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch {
        model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
        result = await model.generateContent(prompt);
      }

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

      return {
        name: data.name || trimmed,
        category: matchedCat,
        quantity: Math.max(0, parsedQty),
        unit: data.unit || defaultUnit
      };
    } catch (sdkErr) {
      console.error("Direct Gemini SDK classification failed:", sdkErr);
    }
  }

  // 3. Clean fallback when totally offline (never use hardcoded regex assumptions)
  return {
    name: trimmed,
    category: "Other",
    quantity: fallbackQty,
    unit: defaultUnit
  };
}
