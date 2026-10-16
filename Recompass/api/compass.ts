import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs/promises";
import os from "os";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const apiKey = process.env.AI_API_KEY;

async function generateWithFallback(genAI: GoogleGenerativeAI, contents: any[]) {
  const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.7-flash"];
  let lastErr;
  for (const m of models) {
    try {
      const model = genAI.getGenerativeModel({ model: m });
      return await model.generateContent({ contents });
    } catch (err: any) {
      lastErr = err;
      console.warn(`[compass] Model ${m} failed: ${err.message}. Trying next fallback...`);
    }
  }
  throw lastErr;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let tempFiles: string[] = [];

  try {
    const { action, payload, userContext } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: "AI API key not configured on server" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const fileManager = new GoogleAIFileManager(apiKey);
    let prompt = "";
    let contents: any[] = [];
    
    switch(action) {
      case "chat":
        
        // Map history to Gemini format
        contents = (payload.history || []).map((msg: any) => ({
          role: msg.role,
          parts: [{ text: msg.text }]
        }));

        // Current turn parts
        let currentParts: any[] = [];
        
        // Inject system context if provided
        const ctxStr = payload.context ? `System Instructions/Context:\n${payload.context}\n\n` : "";
        currentParts.push({ text: `${ctxStr}User: ${payload.message}` });

        // Add attached images
        if (payload.images && payload.images.length > 0) {
          payload.images.forEach((img: any) => {
            currentParts.push({ inlineData: { data: img.base64, mimeType: img.mimeType } });
          });
        }

        contents.push({ role: "user", parts: currentParts });
        break;
        
      case "extract_menu":
        prompt = `
          Extract the FULL WEEKLY MESS MENU from the provided image(s) or PDF.
          
          RULES:
          1. Detect all 7 days (Monday through Sunday).
          2. Detect Breakfast, Lunch, and Dinner for each day.
          3. Extract every listed food item and preserve the relationship Day -> Meal -> Foods.
          4. Include additional items like milk, tea, coffee, fruit, desserts, etc.
          5. Ignore irrelevant text (like headers/footers) unless useful.
          
          OUTPUT STRICTLY AS JSON:
          {
            "menu": [
              {
                "day": "Monday",
                "breakfast": ["Idli", "Sambar", "Milk"],
                "lunch": ["Rice", "Dal", "Chicken Curry"],
                "dinner": ["Chapati", "Mixed Veg"]
              }
            ]
          }
        `;
        
        const fileParts = [];
        
        for (let i = 0; i < (payload.files || []).length; i++) {
          const f = payload.files[i];
          if (f.mimeType === "application/pdf") {
            // PDFs must be uploaded via File API
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
            // Images can go inline
            fileParts.push({
              inlineData: { data: f.base64, mimeType: f.mimeType }
            });
          }
        }
        
        contents = [{ role: "user", parts: [{ text: prompt }, ...fileParts] }];
        break;
        
      case "estimate_macros":
        prompt = `Estimate accurate, realistic nutritional macronutrients for the meal or item described as: "${payload.foodName}".

RULES:
1. "name": Return a clean, concise, UPPERCASE food title (e.g. "CHICKEN BIRYANI", "BANANA", "EGG WHITES", "DAL TADKA", "PANEER TIKKA").
   DO NOT paste the user's raw sentence into "name". DO NOT include parentheticals or gram specs in "name".
2. CALCULATE ACCURATE MACROS based on the full portion or description provided:
   - Example: "350g rice and 140g chicken biryani from meghana":
     350g cooked rice (~450 kcal, ~9g protein, ~98g carbs, ~1g fat) + 140g chicken (~230 kcal, ~43g protein, ~5g fat) + cooking oil/ghee (~250-350 kcal, ~30g fat) => Total ~950-1050 kcal, ~52g protein, ~98g carbs, ~35g fat.
   - Example: "2 bananas": ~210 kcal, ~2.5g protein, ~54g carbs, ~0.8g fat.
   - Example: "4 egg whites": ~68 kcal, ~14.4g protein, ~0.8g carbs, ~0.4g fat.
3. Treat Indian restaurant/mess foods realistically. Meals cooked in ghee or oil contain significant calories and fats.
4. CRITICAL: If the input describes ANY food, meal, restaurant dish, snack, beverage, or brand (even in ALL CAPS or messy typing), calculate its macros. ONLY return {"error": "INVALID_FOOD"} if the input is explicitly gibberish keyboard spam (e.g. "asdfghjk") or an inedible object (e.g. "chair").

OUTPUT STRICTLY AS JSON (no markdown formatting, no extra commentary):
{"name":"UPPERCASE_NAME","calories":1000,"protein":50,"carbs":95,"fats":30}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;

      case "generate_recipes":
        prompt = `You are an expert student chef creating practical hostel recipes.
The student has these available ingredients in their pantry: ${JSON.stringify(payload.ingredients || [])}.
Their fitness goal is: ${payload.goal || "healthy nutrition"}.
Preferred equipment/method: ${payload.method || "any (microwave, kettle, induction, or no-cook)"}.

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

      case "analyze_plate":
        prompt = `Analyze this photo of a food plate/tray, meal, snack, or beverage.
Identify each food or beverage item visible and estimate its quantity (e.g. 2 chapatis, 1 bowl dal ~200ml, 1 cup rice ~150g).
For each item estimate realistic macros based on the visible portion.

CRITICAL INSTRUCTIONS:
1. If the photo DOES NOT contain any food, meal, or edible beverage (for example: person, selfie, furniture, car, room, empty plate/table, electronics, screenshot of text/code, paper, animal, or non-food object), return STRICTLY:
   {"error": "NO_FOOD_DETECTED", "items": []}

2. If food or drink IS present, return ONLY a JSON array of items:
   [{"name":"Chapati","quantity":"2 pieces","calories":240,"protein":7,"carbs":44,"fats":4},{"name":"Dal Fry","quantity":"1 bowl","calories":150,"protein":8,"carbs":18,"fats":5}]`;
        {
          const imgPart = payload.image
            ? { inlineData: { data: payload.image, mimeType: payload.mimeType || "image/jpeg" } }
            : null;
          contents = [{ role: "user", parts: imgPart ? [{ text: prompt }, imgPart] : [{ text: prompt }] }];
        }
        break;

      case "parse_and_classify_food":
        prompt = `You are an expert grocery and nutrition database classifier.
Analyze this food, ingredient, or pantry item input: "${payload.input}".

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
3. "quantity": Numeric quantity from the input if specified, or fallback to ${payload.fallbackQty || 1}.
4. "unit": Best fitting unit ("g", "kg", "ml", "pcs", "jar", "packs", "bottles", "scoops"). If not mentioned, infer the natural standard unit (e.g. spices -> "g" or "packs", peanut butter -> "jar", eggs -> "pcs", oats -> "g", whey -> "scoops", oil -> "bottles").

OUTPUT STRICTLY AS JSON (no markdown formatting):
{"name":"Fruit & Nuts Oats","category":"Grains","quantity":${payload.fallbackQty || 1},"unit":"g"}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;

      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    const result = await generateWithFallback(genAI, contents);
    let responseText = result.response.text();
    
    // If it's chat, just return raw text
    if (action === "chat") {
      return res.status(200).json({ text: responseText });
    }
    
    // Otherwise it expects JSON
    let responseData;
    try {
      // Find the first { or [ and last } or ]
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

      // Normalize keys to lowercase to prevent AI capitalization errors (e.g., "Calories" instead of "calories")
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
        const normalized: any = {};
        for (const k in responseData) {
          normalized[k.toLowerCase()] = responseData[k];
        }
        responseData = normalized;
      }
    } catch (e) {
      responseData = { text: responseText, parseError: true, raw: responseText };
    }

    return res.status(200).json(responseData);

  } catch (error: any) {
    console.error("AI Error:", error);
    return res.status(500).json({ error: "Failed to process AI request", details: error.message, stack: error.stack });
  } finally {
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        console.error("Failed to delete temp file:", file, e);
      }
    }
  }
}
