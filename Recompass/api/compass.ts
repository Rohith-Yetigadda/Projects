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

const apiKey = process.env.AI_API_KEY;

async function generateWithFallback(genAI: GoogleGenerativeAI, contents: any[]) {
  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      return await model.generateContent({ contents });
    } catch (err: any) {
      console.warn(`[compass] Model ${m} failed: ${err.message}. Trying next fallback...`);
    }
  }
  const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  return await fallbackModel.generateContent({ contents });
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

RULES:
1. "name": Return a clean, concise, UPPERCASE food title without raw sentence fragments or parentheticals (e.g. "CHICKEN BIRYANI", "BANANA", "BOILED EGGS", "DAL TADKA", "PANEER TIKKA").
2. Calculate realistic macros based on the full portion or description provided:
   - For Indian restaurant or mess food, account for realistic cooking oil, ghee, and standard portion sizes.
   - Example "2 bananas": ~210 kcal, ~2.5g protein, ~54g carbs, ~0.6g fat.
   - Example "2 boiled eggs": ~156 kcal, ~12.6g protein, ~1.2g carbs, ~10.6g fat.
   - Example "1 bowl dal tadka (~200g)": ~180 kcal, ~9g protein, ~22g carbs, ~6g fat.
   - Example "2 chapatis": ~200 kcal, ~6g protein, ~36g carbs, ~2g fat.
3. If the input describes any food, meal, snack, or drink, calculate its macros. ONLY return {"error": "INVALID_FOOD"} if input is purely gibberish (e.g. "asdfg123") or non-food.

OUTPUT STRICTLY AS JSON (no markdown formatting):
{"name":"UPPERCASE_NAME","calories":350,"protein":14,"carbs":48,"fats":8}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "classify_food_portion": {
        const prompt = `You are an expert nutrition portioning classifier.
Analyze this food item: "${payload.foodName}".

Determine the most natural, user-friendly portion unit type and provide 4-6 realistic portion presets for logging.

AVAILABLE CATEGORIES:
- "piece" (for discrete items like banana, egg, chapati, dosa, idli, bread, apple, cookie, samosa)
- "bowl" (for curries, dal, sabzi, rice, salad, oats, curd, kheer, biryani)
- "ladle" (for liquid curries, sambar, rasam, dal, gravies)
- "glass" (for beverages, milk, tea, coffee, lassi, juice, buttermilk)
- "slice" (for cut fruits like watermelon, papaya, melon, pineapple, bread)
- "scoop" (for whey protein, ice cream, powders)
- "tsp" (for condiments, sugar, ghee, butter, peanut butter, oil, salt, pickle)

RULES:
1. "cleanName": Clean capitalized food name (strip any trailing -1pc, numbers, etc).
2. "category": Pick EXACTLY one from the categories above.
3. "defaultQuantity": The most common single serving (e.g. "1 piece", "1 bowl", "1 ladle", "200ml", "1 scoop").
4. "presets": Array of 4-6 sensible, realistic portion options the user would select on a campus or at home.
5. "estimatedMacros": Estimated macros for the defaultQuantity.

OUTPUT STRICTLY AS JSON:
{
  "cleanName": "Banana",
  "category": "piece",
  "defaultQuantity": "1 piece",
  "presets": ["half piece", "1 piece", "2 pieces", "3 pieces", "100g"],
  "estimatedMacros": { "calories": 105, "protein": 1.3, "carbs": 27, "fats": 0.3 }
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
        const prompt = `You are an expert student chef creating practical hostel recipes.
Available ingredients in pantry: ${JSON.stringify(payload.ingredients || [])}.
Fitness goal: ${payload.goal || "healthy nutrition"}.
Preferred equipment: ${payload.method || "any"}.

Generate 3 creative, delicious, high-protein recipes they can make in a hostel room with minimal equipment.

OUTPUT STRICTLY AS A JSON ARRAY of recipe objects:
[
  {
    "id": "recipe-1",
    "title": "High Protein Banana Peanut Butter Mug Cake",
    "time": "5 mins",
    "method": "Microwave",
    "difficulty": "Easy",
    "ingredients": ["1 scoop Whey Protein", "1 Banana", "1 tbsp Peanut Butter", "2 tbsp Milk"],
    "instructions": [
      "Mash the banana in a microwave-safe mug.",
      "Add whey protein, peanut butter, and milk, mixing until smooth.",
      "Microwave on high for 60-90 seconds. Let cool slightly and enjoy."
    ],
    "hostelHack": "Use a fork to mash the banana completely before adding whey to prevent dry pockets.",
    "macros": { "calories": 360, "protein": 34, "carbs": 38, "fats": 9 }
  }
]`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;
      }

      case "analyze_plate": {
        const prompt = `Analyze this photo of a food plate/tray, meal, snack, or beverage.
Identify each food or beverage item visible and estimate its quantity (e.g. 2 chapatis, 1 bowl dal ~200ml, 1 cup rice ~150g).
For each item estimate realistic macros based on the visible portion.

CRITICAL INSTRUCTIONS:
1. If the photo DOES NOT contain any food, meal, or edible beverage (e.g. person, selfie, furniture, car, room, empty plate/table, electronics, text, document, pet, non-food object), return STRICTLY:
   {"error": "NO_FOOD_DETECTED", "items": []}
2. If food or drink IS present, return ONLY a JSON array of items:
   [{"name":"Chapati","quantity":"2 pieces","calories":200,"protein":6,"carbs":36,"fats":2},{"name":"Dal Fry","quantity":"1 bowl","calories":150,"protein":8,"carbs":18,"fats":5}]`;
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

    const result = await generateWithFallback(genAI, contents);
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
