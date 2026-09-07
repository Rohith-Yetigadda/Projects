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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Fast and cheap for typical actions

    let prompt = "";
    
    // Construct prompt based on action
    switch(action) {
      case "chat":
        prompt = `
          You are Compass, an AI nutrition assistant for students.
          User Context: ${JSON.stringify(userContext)}
          User Message: ${payload.message}
          
          Respond practically and concisely. Recommend real food from their pantry if possible.
          Output a JSON object with: 
          - text: the text response
          - suggestedActions: an array of strings representing buttons for the user to click (optional)
        `;
        break;
      case "extract_menu":
        prompt = `
          Extract the menu from the provided text.
          User provided: ${payload.text}
          Return a JSON array of days containing breakfast, lunch, and dinner.
        `;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }), 
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    const result = await model.generateContent(prompt);
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
