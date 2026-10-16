import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.AI_API_KEY || process.env.AI_API_KEY || "";

  return {
    plugins: [
      react(),
      {
        name: "api-compass-dev-middleware",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith("/api/compass") && req.method === "POST") {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", async () => {
                try {
                  const parsed = JSON.parse(body || "{}");
                  const { action, payload } = parsed;

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ error: "AI API key not configured" }));
                    return;
                  }

                  const genAI = new GoogleGenerativeAI(apiKey);

                  if (action === "parse_and_classify_food") {
                    let model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
                    const prompt = `You are an expert grocery and nutrition database classifier.
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
2. "category": Must match one of the exact categories above. If the item is oats, muesli, or cereal with fruits or nuts (e.g. "Fruit & Nuts Oats"), its primary base is Grains.
3. "quantity": Numeric quantity from the input if specified, or fallback to ${payload.fallbackQty || 1}.
4. "unit": Best fitting unit ("g", "kg", "ml", "pcs", "jar", "packs", "bottles", "scoops"). If not mentioned, infer the natural standard unit.

OUTPUT STRICTLY AS JSON (no markdown formatting):
{"name":"Fruit & Nuts Oats","category":"Grains","quantity":${payload.fallbackQty || 1},"unit":"g"}`;

                    let result;
                    try {
                      result = await model.generateContent(prompt);
                    } catch (e) {
                      model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
                      result = await model.generateContent(prompt);
                    }

                    const responseText = result.response.text().trim();
                    const firstCurly = responseText.indexOf("{");
                    const lastCurly = responseText.lastIndexOf("}");
                    const jsonStr =
                      firstCurly !== -1 && lastCurly !== -1
                        ? responseText.substring(firstCurly, lastCurly + 1)
                        : responseText;

                    res.statusCode = 200;
                    res.setHeader("Content-Type", "application/json");
                    res.end(jsonStr);
                    return;
                  }

                  next();
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        },
      },
    ],
    define: {
      "import.meta.env.VITE_GEMINI_API_KEY": JSON.stringify(apiKey),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
