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

/**
 * Classifies food inputs dynamically using Gemini Flash AI.
 * Handles any language, brand, typo, or regional dish.
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
        // Find matching category
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
    console.error("AI classification request failed, using fallback:", err);
  }

  // Graceful client fallback if offline or request fails:
  return fallbackClassify(trimmed, fallbackQty, defaultUnit);
}

function fallbackClassify(input: string, fallbackQty: number, defaultUnit: string): ClassifiedFood {
  const lower = input.toLowerCase();
  let category: FoodCategory = "Other";

  if (/(chilli|chili|turmeric|haldi|jeera|cumin|pepper|salt|masala|spice|oregano|paprika|cardamom|clove|cinnamon|powder)/i.test(lower)) {
    category = "Spices";
  } else if (/(chicken|egg|fish|mutton|meat|soya|tofu|paneer|tuna|prawn|beef)/i.test(lower)) {
    category = "Protein";
  } else if (/(whey|creatine|vitamin|supplement|bcaa|casein|preworkout|pre-workout)/i.test(lower)) {
    category = "Supplements";
  } else if (/(milk|cheese|curd|dahi|yogurt|butter|ghee|cream)/i.test(lower)) {
    category = "Dairy";
  } else if (/(apple|banana|fruit|spinach|veg|tomato|onion|potato|garlic|ginger|lemon|capsicum|coriander|cilantro|cucumber)/i.test(lower)) {
    category = "Produce";
  } else if (/(oil)/i.test(lower)) {
    category = "Oils";
  } else if (/(rice|oat|wheat|flour|atta|dal|lentil|pasta|bread|roti|chapati|noodle|quinoa|cereal)/i.test(lower)) {
    category = "Grains";
  } else if (/(peanut|nut|almond|walnut|cashew|chip|snack|biscuit|cookie|chocolate|bar|popcorn)/i.test(lower)) {
    category = "Snacks";
  }

  return {
    name: input,
    category,
    quantity: fallbackQty,
    unit: defaultUnit
  };
}
