import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge', // Using Edge runtime for faster cold starts
};

const apiKey = process.env.AI_API_KEY;

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { action, payload, userContext } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI API key not configured on server" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    let prompt = "";
    let contents: any[] = [];
    
    // Construct prompt based on action
    switch(action) {
      case "chat":
        const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        const extractModel = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
        prompt = `
          Extract the FULL WEEKLY MESS MENU from the provided image(s).
          
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
              },
              ...
            ]
          }
        `;
        
        const imageParts = (payload.images || []).map((imgBase64: string) => ({
          inlineData: {
            data: imgBase64.split(',')[1] || imgBase64,
            mimeType: imgBase64.split(';')[0].split(':')[1] || "image/jpeg"
          }
        }));

        contents = [{ role: "user", parts: [{ text: prompt }, ...imageParts] }];
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }), 
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const modelInstance = action === "extract_menu" 
      ? genAI.getGenerativeModel({ model: "gemini-3.8-flash" }) 
      : genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await modelInstance.generateContent({ contents });
    let responseText = result.response.text();
    
    // Clean markdown code blocks from JSON response if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // Fallback if model didn't return pure JSON
      responseData = { text: responseText };
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("AI Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process AI request", details: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
