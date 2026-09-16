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
    let modelInstance;
    
    switch(action) {
      case "chat":
        modelInstance = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        
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
        modelInstance = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
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
        modelInstance = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        // foodName may include a long descriptive text or quantities
        prompt = `Estimate the macros for: "${payload.foodName}".
Condense the description into a concise, UPPERCASE name (e.g. "BONELESS CHICKEN BIRYANI"). DO NOT include quantities, breakdowns, or parentheticals in the name.
Use the quantity specified in the text to calculate macros. If no quantity given, assume a single standard serving.
CRITICAL: If the input is clearly NOT a food/beverage item, or is a joke/random text (e.g. "your mom", "asdfgh"), return exactly {"error": "INVALID_FOOD"} and nothing else.
Return ONLY a JSON object, nothing else:
{"name":"BONELESS CHICKEN BIRYANI","calories":250,"protein":8,"carbs":45,"fats":6}`;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
        break;

      case "analyze_plate":
        modelInstance = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        prompt = `Analyze this photo of a food plate/tray from an Indian college mess.
Identify each food item visible and estimate the quantity (e.g. 2 chapatis, 1 bowl dal ~200ml, 1 cup rice ~150g).
For each item estimate macros based on the visible quantity.
Return ONLY a JSON array, nothing else:
[{"name":"Chapati","quantity":"2 pieces","calories":240,"protein":7,"carbs":44,"fats":4},{"name":"Dal Fry","quantity":"1 bowl","calories":150,"protein":8,"carbs":18,"fats":5}]`;
        {
          const imgPart = payload.image
            ? { inlineData: { data: payload.image, mimeType: payload.mimeType || "image/jpeg" } }
            : null;
          contents = [{ role: "user", parts: imgPart ? [{ text: prompt }, imgPart] : [{ text: prompt }] }];
        }
        break;

      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    if (!modelInstance) {
        return res.status(500).json({ error: "Model instantiation failed" });
    }

    const result = await modelInstance.generateContent({ contents });
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
