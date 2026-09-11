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
        prompt = `
          You are Compass, an AI nutrition assistant for students.
          User Context: ${JSON.stringify(userContext)}
          User Message: ${payload.message}
          
          Respond practically and concisely. Recommend real food from their pantry if possible.
          Output a JSON object with: 
          - text: the text response
          - suggestedActions: an array of strings representing buttons for the user to click (optional)
        `;
        contents = [{ role: "user", parts: [{ text: prompt }] }];
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
        
      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    if (!modelInstance) {
        return res.status(500).json({ error: "Model instantiation failed" });
    }

    const result = await modelInstance.generateContent({ contents });
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { text: responseText, parseError: true };
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
