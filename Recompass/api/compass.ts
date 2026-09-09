import { GoogleGenerativeAI } from "@google/generative-ai";

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

  try {
    const { action, payload, userContext } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: "AI API key not configured on server" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let prompt = "";
    let contents: any[] = [];
    let modelInstance;
    
    // Construct prompt based on action
    switch(action) {
      case "chat":
        modelInstance = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        // Fall back to pro since 3.8-flash doesn't exist yet, standard flash works fine
        modelInstance = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
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
        
        const fileParts = (payload.files || []).map((f: { base64: string; mimeType: string }) => ({
          inlineData: { data: f.base64, mimeType: f.mimeType }
        }));
        
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
    
    // Clean markdown code blocks from JSON response if present
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
  }
}
