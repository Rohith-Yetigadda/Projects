import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

let cachedWorkingModel: string | null = null;
let lastDiscoveryTime = 0;
let discoveredModelsCache: string[] = [];

const DEFAULT_FALLBACK_CHAIN = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

async function getCandidateModels(key: string): Promise<string[]> {
  const now = Date.now();
  // Refresh model discovery every 6 hours
  if (discoveredModelsCache.length > 0 && now - lastDiscoveryTime < 6 * 60 * 60 * 1000) {
    return cachedWorkingModel 
      ? [cachedWorkingModel, ...discoveredModelsCache.filter(m => m !== cachedWorkingModel)]
      : discoveredModelsCache;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) {
      const data: any = await res.json();
      if (Array.isArray(data?.models)) {
        const live = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace(/^models\//, ""))
          .filter((name: string) => name.includes("flash") && !name.includes("tts") && !name.includes("preview-tts"));

        if (live.length > 0) {
          discoveredModelsCache = Array.from(new Set(["gemini-flash-latest", ...live, ...DEFAULT_FALLBACK_CHAIN]));
          lastDiscoveryTime = now;
          return cachedWorkingModel 
            ? [cachedWorkingModel, ...discoveredModelsCache.filter(m => m !== cachedWorkingModel)]
            : discoveredModelsCache;
        }
      }
    }
  } catch (err) {
    console.warn("[compass] Live model discovery failed, using fallback chain:", err);
  }

  return cachedWorkingModel
    ? [cachedWorkingModel, ...DEFAULT_FALLBACK_CHAIN.filter(m => m !== cachedWorkingModel)]
    : DEFAULT_FALLBACK_CHAIN;
}

async function generateWithFallback(genAI: GoogleGenerativeAI, contents: any[], isJson = false) {
  const config = isJson ? { responseMimeType: "application/json" } : {};
  const candidates = await getCandidateModels(apiKey!);

  let lastErr: any = null;
  for (const m of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: m, generationConfig: config });
      const result = await model.generateContent({ contents });
      cachedWorkingModel = m; // Remember successful model for 0ms retry penalty
      return result;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[compass] Model ${m} unavailable or error (${err?.message || err}). Trying next candidate...`);
    }
  }

  throw lastErr || new Error("All AI generative models unavailable");
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempFiles: string[] = [];

  try {
    const { action, payload } = req.body || {};

    if (!apiKey) {
      return res.status(500).json({ error: "AI API key not configured on server" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let contents: any[] = [];
    
    switch(action) {
      case "chat": {
        // Map history to Gemini format
        contents = (payload.history || []).map((msg: any) => ({
          role: msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.text || "" }]
        }));

        let currentParts: any[] = [];
        const ctxStr = payload.context ? `${payload.context}\n\n` : "";
        currentParts.push({ text: `${ctxStr}User: ${payload.message || ""}` });

        if (payload.images && payload.images.length > 0) {
          payload.images.forEach((img: any) => {
            currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
          });
        }

        contents.push({ role: "user", parts: currentParts });
        break;
      }
        
      case "extract_menu": {
        const fileManager = new GoogleAIFileManager(apiKey);
        const prompt = `Extract the FULL WEEKLY MESS MENU from the provided image(s) or PDF.

CRITICAL CLEANING RULES:
1. Clean all food item names: STRIP ANY PORTION OR QUANTITY SUFFIXES from the food name string itself.
   - Example: "Banana - 1pc" or "Banana (1 pc)" MUST BECOME "Banana".
   - Example: "Boiled Egg - 2 nos" or "Boiled Eggs (2)" MUST BECOME "Boiled Egg" or "Boiled Eggs".
   - Example: "Puri Bhaji 3pcs" MUST BECOME "Puri Bhaji".
   - Example: "Milk 200ml" or "Tea 150ml" MUST BECOME "Milk" or "Tea".
   - The user will choose their own quantity in the app, so NEVER attach quantity suffixes to item titles.
2. Detect all 7 days (Monday through Sunday).
3. Detect Breakfast, Lunch, and Dinner for each day.
4. Extract every food item and preserve the Day -> Meal -> Foods structure.
5. Capitalize food names cleanly in Title Case (e.g. "Dal Tadka", "Aloo Gobi", "Steam Rice", "Chicken Curry").

OUTPUT STRICTLY AS JSON (no markdown formatting, no commentary):
{
  "menu": [
    {
      "day": "Monday",
      "breakfast": ["Idli", "Sambar", "Milk", "Banana"],
      "lunch": ["Steam Rice", "Dal Tadka", "Chicken Curry", "Curd"],
      "dinner": ["Chapati", "Mixed Veg Sabzi", "Salad"]
    }
  ]
}`;
        
        const fileParts = [];
        for (let i = 0; i < (payload.files || []).length; i++) {
          const f = payload.files[i];
          if (f.mimeType === "application/pdf") {
            const tempFilePath = path.join(os.tmpdir(), `menu-${Date.now()}-${i}.pdf`);
            await fs.writeFile(tempFilePath, Buffer.from(f.base64, "base64"));
            tempFiles.push(tempFilePath);
            
            const uploadResponse = await fileManager.uploadFile(tempFilePath, {
              mimeType: "application/pdf",
              displayName: "Menu PDF",
            });
            
            fileParts.push({
              fileData: {
                mimeType: uploadResponse.file.mimeType,
                fileUri: uploadResponse.file.uri
              }
            });
          } else {
            fileParts.push({
              inlineData: { data: f.base64, mimeType: f.mimeType }
            });
          }
        }
        
        contents = [{ role: "user", parts: [{ text: prompt }, ...fileParts] }];
        break;
      }
        
      case "estimate_macros": {
        const prompt = `Estimate accurate, realistic nutritional macronutrients for: "${payload.foodName}".

CRITICAL SCALING RULES:
1. "name": Return a clean, concise, UPPERCASE food title without raw sentence fragments or parentheticals (e.g. "DAL MAKHANI", "HOT MILK", "CHICKEN BIRYANI", "BANANA", "BOILED EGGS").
2. QUANTITY & PORTION SCALING MUST BE PROPORTIONATE:
   - Carefully read the requested portion size and scale macros accordingly!
   - Example "1 small ladle dal makhani": ~110 kcal, ~3.5g protein, ~11g carbs, ~6g fat.
   - Example "1 ladle (~150ml) dal makhani": ~190 kcal, ~6.5g protein, ~19g carbs, ~10g fat.
   - Example "2 ladles dal makhani": ~380 kcal, ~13g protein, ~38g carbs, ~20g fat.
   - Example "100ml milk": ~65 kcal, ~3.3g protein, ~5g carbs, ~3.5g fat.
   - Example "150ml milk": ~95 kcal, ~5g protein, ~7.5g carbs, ~5g fat.
   - Example "200ml milk": ~130 kcal, ~6.5g protein, ~10g carbs, ~7g fat.
    - Example "1 glass (~250ml) milk": ~165 kcal, ~8.2g protein, ~12.5g carbs, ~8.5g fat.
    - Example "300ml milk": ~195 kcal, ~10g protein, ~15g carbs, ~10.5g fat.
    - Example "half serving": ~50% of a full serving.
3. If the input describes any food, meal, snack, or drink, calculate its macros. ONLY return {"error": "INVALID_FOOD"} if input is purely gibberish (e.g. "asdfg123") or non-food.

OUTPUT STRICTLY AS JSON:
{"name":"UPPERCASE_NAME","calories":190,"protein":6.5,"carbs":19,"fats":10}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "classify_food_portion": {
        const prompt = `You are an expert nutrition portioning classifier for a college student mess / fitness app.
Analyze this food item: "${payload.foodName}".

CRITICAL RULE: In this mess hall, they NEVER use bowls ("katoris"). Do NOT use the unit "bowl" anywhere in presets, categories, or default quantities.

AVAILABLE CATEGORIES AND EXACT UNITS:
1. "ladle" (MANDATORY for all liquid curries, dal, sambar, rasam, gravies, kadhi, soup, curd, raita):
   - presets MUST be ladles with ml data: ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"]
   - defaultQuantity: "1 ladle (~100ml)"
2. "paddle" (MANDATORY for all rice items, steamed rice, jeera rice, biryani, pulao, fried rice, khichdi, curd rice):
   - presets MUST be paddles with grams data: ["1 paddle (~150g)", "2 paddles (~300g)", "3 paddles (~450g)", "half paddle (~75g)"]
   - defaultQuantity: "1 paddle (~150g)"
3. "cup/mug" (MANDATORY for all liquids and beverages, hot milk, milk, tea, coffee, chai, lassi, chaas, buttermilk, juice, shakes):
   - presets MUST be cup or mug sizes WITH EXACT ML DATA: ["1 cup (150ml)", "1 mug (250ml)", "1 big mug (300ml)", "half cup (75ml)", "half mug (125ml)"]
   - defaultQuantity: "1 cup (150ml)" (or "1 mug (250ml)" for milk/shakes)
4. "piece" (MANDATORY for discrete items, chapati, roti, phulka, paratha, naan, puri, bhatura, idli, dosa, vada, egg, boiled egg, omelette, bread, banana, apple, samosa, cutlet, sweets):
   - presets MUST be pieces: ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"]
   - defaultQuantity: "1 piece" (or "2 pieces" for rotis/chapatis/puris/idlis)
5. "serving" (for normal items, dry sabzi, bhaji, bhurji, egg bhurji, paneer bhurji, poha, upma, oats, noodles, pasta, salad, custom recipes):
   - presets MUST be plain clean servings without fake gram guesses: ["1 serving", "half serving", "2 servings", "3 servings"]
   - defaultQuantity: "1 serving"
6. "slice" (for cut fruits like watermelon, papaya, pineapple, bread slices, pizza):
   - presets: ["half slice", "1 slice", "2 slices", "3 slices", "4 slices"]
   - defaultQuantity: "1 slice"
7. "tbsp" (for condiments, butter, ghee, peanut butter, jam, pickle, sugar, honey):
   - presets: ["1 tsp (~5g)", "1 tbsp (~15g)", "2 tbsp (~30g)", "half tsp"]
   - defaultQuantity: "1 tbsp (~15g)"
8. "scoop" (for whey protein, ice cream, powders):
   - presets: ["1 scoop (~30g)", "half scoop (~15g)", "1.5 scoops (~45g)", "2 scoops (~60g)"]
   - defaultQuantity: "1 scoop (~30g)"

RULES:
1. "cleanName": Clean capitalized food name (strip any trailing -1pc, numbers, etc).
2. "category": Pick EXACTLY one from the categories above (NEVER "bowl").
3. "defaultQuantity": The most common single serving.
4. "presets": Array of 4-6 sensible, realistic portion options from the rules above.
5. "estimatedMacros": Estimated macros for the defaultQuantity.

OUTPUT STRICTLY AS JSON:
{
  "cleanName": "Dal Tadka",
  "category": "ladle",
  "defaultQuantity": "1 ladle (~100ml)",
  "presets": ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"],
  "estimatedMacros": { "calories": 120, "protein": 6, "carbs": 16, "fats": 4 }
}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "batch_classify_food_portions": {
        const foods: string[] = Array.isArray(payload.foods) ? payload.foods : [payload.foodName];
        const prompt = `You are an expert nutrition portioning classifier for a college student mess / fitness app.
Classify each of these food items into its natural portion unit category, realistic portion presets, and estimated macros for 1 default serving.

CRITICAL RULE: In this mess hall, they NEVER use bowls ("katoris"). Do NOT use the unit "bowl" anywhere in presets, categories, or default quantities.

FOODS TO CLASSIFY: ${JSON.stringify(foods)}

AVAILABLE CATEGORIES AND EXACT UNITS:
1. "ladle" (MANDATORY for all liquid curries, dal, sambar, rasam, gravies, kadhi, soup, curd, raita):
   - presets MUST be ladles with ml data: ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"]
   - defaultQuantity: "1 ladle (~100ml)"
2. "paddle" (MANDATORY for all rice items, steamed rice, jeera rice, biryani, pulao, fried rice, khichdi, curd rice):
   - presets MUST be paddles with grams data: ["1 paddle (~150g)", "2 paddles (~300g)", "3 paddles (~450g)", "half paddle (~75g)"]
   - defaultQuantity: "1 paddle (~150g)"
3. "cup/mug" (MANDATORY for all liquids and beverages, hot milk, milk, tea, coffee, chai, lassi, chaas, buttermilk, juice, shakes):
   - presets MUST be cup or mug sizes WITH EXACT ML DATA: ["1 cup (150ml)", "1 mug (250ml)", "1 big mug (300ml)", "half cup (75ml)", "half mug (125ml)"]
   - defaultQuantity: "1 cup (150ml)" (or "1 mug (250ml)" for milk/shakes)
4. "piece" (MANDATORY for discrete items, chapati, roti, phulka, paratha, naan, puri, bhatura, idli, dosa, vada, egg, boiled egg, omelette, bread, banana, apple, samosa, cutlet, sweets):
   - presets MUST be pieces: ["1 piece", "2 pieces", "3 pieces", "4 pieces", "half piece"]
   - defaultQuantity: "1 piece" (or "2 pieces" for rotis/chapatis/puris/idlis)
5. "serving" (for normal items, dry sabzi, bhaji, bhurji, egg bhurji, paneer bhurji, poha, upma, oats, noodles, pasta, salad, custom recipes):
   - presets MUST be plain clean servings without fake gram guesses: ["1 serving", "half serving", "2 servings", "3 servings"]
   - defaultQuantity: "1 serving"
6. "slice" (for cut fruits like watermelon, papaya, pineapple, bread slices, pizza):
   - presets: ["half slice", "1 slice", "2 slices", "3 slices", "4 slices"]
   - defaultQuantity: "1 slice"
7. "tbsp" (for condiments, butter, ghee, peanut butter, jam, pickle, sugar, honey):
   - presets: ["1 tsp (~5g)", "1 tbsp (~15g)", "2 tbsp (~30g)", "half tsp"]
   - defaultQuantity: "1 tbsp (~15g)"
8. "scoop" (for whey protein, ice cream, powders):
   - presets: ["1 scoop (~30g)", "half scoop (~15g)", "1.5 scoops (~45g)", "2 scoops (~60g)"]
   - defaultQuantity: "1 scoop (~30g)"

RULES:
1. "category": Pick EXACTLY one from the categories above (NEVER "bowl").
2. "defaultQuantity": The most common single serving.
3. "presets": Array of 4-6 sensible, realistic portion options.
4. "estimatedMacros": Estimated macros for the defaultQuantity.

OUTPUT STRICTLY AS A JSON OBJECT where keys are the clean food names:
{
  "Aloo Paratha": {
    "category": "piece",
    "defaultQuantity": "1 piece",
    "presets": ["half piece", "1 piece", "2 pieces", "3 pieces", "4 pieces"],
    "estimatedMacros": { "calories": 260, "protein": 6, "carbs": 38, "fats": 10 }
  },
  "Dal Makhani": {
    "category": "ladle",
    "defaultQuantity": "1 ladle (~100ml)",
    "presets": ["1 ladle (~100ml)", "2 ladles (~200ml)", "3 ladles (~300ml)", "half ladle (~50ml)"],
    "estimatedMacros": { "calories": 160, "protein": 6, "carbs": 18, "fats": 8 }
  },
  "Hot Milk": {
    "category": "cup/mug",
    "defaultQuantity": "1 mug (250ml)",
    "presets": ["1 cup (150ml)", "1 mug (250ml)", "1 big mug (300ml)", "half cup (75ml)", "half mug (125ml)"],
    "estimatedMacros": { "calories": 160, "protein": 8, "carbs": 12, "fats": 8 }
  },
  "Steamed Rice": {
    "category": "paddle",
    "defaultQuantity": "1 paddle (~150g)",
    "presets": ["1 paddle (~150g)", "2 paddles (~300g)", "3 paddles (~450g)", "half paddle (~75g)"],
    "estimatedMacros": { "calories": 195, "protein": 4, "carbs": 44, "fats": 0.5 }
  }
}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "get_daily_guidance": {
        const prompt = `You are Compass, an elite tactical nutrition AI for a student.
Provide high-impact, 1-2 sentence tactical meal advice for their upcoming meal.

CONTEXT:
- Current Meal Slot: ${payload.currentMeal || "lunch"}
- Mess Serving Today: ${JSON.stringify(payload.menuItems || [])}
- Remaining Budget Today: ${JSON.stringify(payload.remaining || { calories: 500, protein: 30, carbs: 60, fats: 15 })}
- Fitness Goal: ${payload.goal || "maintain"}
- Available in Pantry: ${JSON.stringify(payload.pantryItems || [])}

RULES:
1. Keep the advice to 1 or 2 clear, punchy, actionable sentences.
2. Recommend specific items from today's mess menu or pantry that optimize their remaining protein without blowing their calorie limit.
3. No fluffy disclaimers. Speak like a smart, friendly, high-performance fitness coach.
4. "suggestedCombo": Up to 2-3 specific meal items to log directly.

OUTPUT STRICTLY AS JSON:
{
  "headline": "High-protein Lunch Strategy",
  "advice": "Mess has Chicken Curry and Dal Tadka. Take 2 ladles of Chicken Curry with 1 chapati to lock in 42g protein within your remaining 650 kcal budget.",
  "suggestedCombo": [
    { "name": "Chicken Curry", "quantity": "2 ladles", "calories": 320, "protein": 36, "carbs": 8, "fats": 16 },
    { "name": "Chapati", "quantity": "1 piece", "calories": 100, "protein": 3, "carbs": 18, "fats": 1 }
  ]
}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "generate_recipes": {
        const methodsStr = Array.isArray(payload.methods) && payload.methods.length > 0
          ? payload.methods.join(", ")
          : (payload.method || "any hostel equipment");
        
        const skill = payload.skillLevel || "intermediate";
        const skillDesc = skill === "beginner"
          ? "Beginner / Zero-effort: Minimal prep, foolproof 1-pot or dump-and-heat recipes with very few steps and zero complex techniques."
          : skill === "masterchef"
          ? "Hostel Masterchef / Gourmet: Creative culinary techniques, complex flavor profiles, layered textures, inventive hostel hacks, and restaurant-style presentation."
          : "Intermediate / Comfortable: Standard hostel cooking with balanced seasoning, pan searing, and creative combinations.";

        const prompt = `You are an elite hostel culinary chef creating customized recipes for university students.

CONTEXT:
- Available ingredients in pantry: ${JSON.stringify(payload.ingredients || [])}.
- Fitness Goal: ${payload.goal || "healthy nutrition"}.
- Available Cooking Gear: ${methodsStr}.
- Student Cooking Skill: "${skill.toUpperCase()}" (${skillDesc}).

GENERATION REQUIREMENTS:
1. QUANTITY & VARIETY: Generate 5 to 6 DIVERSE, HIGH-PROTEIN recipes so the student has a rich buffet of choices. Do not just output 3 simple ones. Include:
   - 1 Ultra-Quick Fuel / Snack (under 5 mins)
   - 2 Hearty Protein Meals / Bowls (Savory, satisfying lunch/dinner)
   - 1 Creative Wrap / Sandwich / Toasted creation
   - 1 Sweet Protein Craving / Dessert / Mug Cake
   - 1 Signature Chef Special matching their chosen gear and skill level.
2. EXACT GEAR SETTINGS & PARAMETERS (CRITICAL):
   - For every recipe and step involving gear, provide the EXACT mechanical setting:
     * Microwave: Exact power / wattage and seconds/minutes (e.g. "800W / High power for 90 seconds", "medium 500W for 2 mins").
     * Induction Cooktop: Exact wattage / temperature (e.g. "Set induction to 1200W / 160°C for sautéing, reduce to 600W / 100°C for simmering").
     * Electric Kettle: Exact kettle operation (e.g. "Add 250ml water, turn switch ON. Hold lid open with a fork handle for 3 minutes to maintain continuous boil without auto-shutoff").
     * Air Fryer / Toaster / Pan: Exact preheat time, temperature, and duration (e.g. "Air Fryer: 180°C for 6 mins", "Pan: Medium heat for 3 mins each side").
   - Populate "gearSettings" with a clean one-line hardware summary for the entire recipe.
3. MATCH COOKING SKILL:
   - If Beginner: Keep steps foolproof, minimal chopping, fast, forgiving.
   - If Masterchef: Use advanced flavor layering, spices, textural contrasts, gourmet hostel techniques.
4. INGREDIENTS FORMAT: Each ingredient string must be clear with amount and name (e.g. "2 Eggs", "1 scoop Whey Protein", "1 Banana", "50g Oats", "1 tbsp Peanut Butter").
5. ACCURATE MACROS: Provide realistic calories, protein, carbs, and fats.

OUTPUT STRICTLY AS A JSON ARRAY of recipe objects:
[
  {
    "id": "recipe-1",
    "title": "Masala Scrambled Egg & Pepper Toast",
    "tag": "High-Protein Main",
    "time": "8 mins",
    "method": "Induction / Pan",
    "difficulty": "Easy",
    "gearSettings": "Induction: 1000W / 140°C for sautéing, 600W for soft scramble",
    "ingredients": ["2 Eggs", "2 slices Whole Wheat Bread", "Chilli Flakes", "Black Pepper", "1 tsp Oil"],
    "instructions": [
      "Set induction cooktop to 1000W (140°C) with a non-stick pan and add 1 tsp oil.",
      "Crack 2 eggs directly into the pan, season with black pepper and chilli flakes.",
      "Lower induction heat to 600W and stir gently for 90 seconds until creamy and soft-set.",
      "Toast the bread slices on the pan for 1 min per side at 800W, then top with the scrambled eggs."
    ],
    "hostelHack": "Keep induction at 600W at the end—residual pan heat finishes cooking the eggs without making them rubbery.",
    "macros": { "calories": 280, "protein": 18, "carbs": 24, "fats": 12 }
  }
]`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "analyze_plate": {
        const prompt = `Analyze this photo of a food plate/tray, meal, snack, or beverage.
Identify each food or beverage item visible and estimate its quantity (e.g. 2 chapatis, 1 ladle dal ~100ml, 1 serving rice ~150g, 1 glass milk ~200ml).
For each item estimate realistic macros based on the visible portion.
NOTE: Do NOT use the unit "bowl" for portions. Use "ladle" with ml for gravies/curries/dal/curd, "serving" or "plate" with grams for rice/sabzi, "piece" for rotis/eggs, and "glass" with ml for drinks.

CRITICAL INSTRUCTIONS:
1. If the photo DOES NOT contain any food, meal, or edible beverage (e.g. person, selfie, furniture, car, room, empty plate/table, electronics, text, document, pet, non-food object), return STRICTLY:
   {"error": "NO_FOOD_DETECTED", "items": []}
2. If food or drink IS present, return ONLY a JSON array of items:
   [{"name":"Chapati","quantity":"2 pieces","calories":200,"protein":6,"carbs":36,"fats":2},{"name":"Dal Fry","quantity":"1 ladle","calories":130,"protein":6,"carbs":16,"fats":4}]`;
        const imgPart = payload.image
          ? { inlineData: { data: payload.image, mimeType: payload.mimeType || "image/jpeg" } }
          : null;
        contents = [{ role: "user", parts: imgPart ? [{ text: prompt }, imgPart] : [{ text: prompt }] }];
        break;
      }

      case "parse_and_classify_food": {
        const prompt = `You are an expert grocery and nutrition database classifier.
Analyze this food, ingredient, or pantry item input: "${payload.input}".

AVAILABLE CATEGORIES (Pick EXACTLY one):
- "Protein" (chicken, fish, eggs, egg whites, paneer, tofu, soya chunks, meat, tuna)
- "Dairy" (milk, curd, dahi, yogurt, butter, ghee, cheese, paneer)
- "Produce" (bananas, apples, spinach, veggies, fruits, onions, tomatoes, potatoes, lemon)
- "Grains" (rice, oats, muesli, wheat, atta, bread, roti, chapati, dal, lentils, pasta, noodles)
- "Snacks" (peanut butter, almonds, nuts, chips, biscuits, cookies, chocolates, seeds)
- "Supplements" (whey protein, casein, creatine, multivitamins, fish oil, electrolytes)
- "Spices" (chilli powder, turmeric, jeera, cumin, garam masala, salt, pepper, chaat masala)
- "Oils" (olive oil, mustard oil, coconut oil, sunflower oil, vegetable oil, cooking spray)
- "Other" (consumables not fitting above)

RULES:
1. "name": Clean, Title Case food title (e.g. "Chilli Powder", "Eggs", "Rolled Oats", "Peanut Butter").
2. "category": Must match one of the exact categories above.
3. "quantity": Numeric quantity from input, or fallback to ${payload.fallbackQty || 1}.
4. "unit": Best fitting unit ("g", "kg", "ml", "pcs", "jar", "packs", "bottles", "scoops").

OUTPUT STRICTLY AS JSON:
{"name":"Rolled Oats","category":"Grains","quantity":${payload.fallbackQty || 1},"unit":"g"}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    const isJsonAction = action !== "chat";
    const result = await generateWithFallback(genAI, contents, isJsonAction);
    let responseText = result.response.text();
    
    if (action === "chat") {
      return res.status(200).json({ text: responseText });
    }
    
    let responseData;
    try {
      const firstCurly = responseText.indexOf('{');
      const lastCurly = responseText.lastIndexOf('}');
      const firstSquare = responseText.indexOf('[');
      const lastSquare = responseText.lastIndexOf(']');
      
      let jsonStr = responseText;
      if (firstCurly !== -1 && lastCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
        jsonStr = responseText.substring(firstCurly, lastCurly + 1);
      } else if (firstSquare !== -1 && lastSquare !== -1) {
        jsonStr = responseText.substring(firstSquare, lastSquare + 1);
      }
      
      responseData = JSON.parse(jsonStr);

      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        const normalized: any = {};
        for (const k in responseData) {
          normalized[k.toLowerCase()] = responseData[k];
        }
        // Flatten macronutrients if nested
        if (normalized.macronutrients && typeof normalized.macronutrients === 'object') {
          normalized.protein = normalized.macronutrients.protein_g ?? normalized.macronutrients.protein ?? normalized.protein;
          normalized.carbs = normalized.macronutrients.carbohydrates_g ?? normalized.macronutrients.carbs ?? normalized.carbs;
          normalized.fats = normalized.macronutrients.total_fat_g ?? normalized.macronutrients.fat_g ?? normalized.macronutrients.fat ?? normalized.macronutrients.fats ?? normalized.fats;
        }
        responseData = normalized;
      }
    } catch {
      responseData = { text: responseText, parseError: true, raw: responseText };
    }

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error("AI Error:", error);
    return res.status(500).json({ error: "Failed to process AI request", details: error.message });
  } finally {
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        console.error("Failed to delete temp file:", file, e);
      }
    }
  }
}
