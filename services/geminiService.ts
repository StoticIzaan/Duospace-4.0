import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generates an AI response using Gemini 1.5 Flash.
 */
export const getAiResponse = async (userPrompt: string, history: any[]) => {
  // Hardcoded key from your info to bypass .env issues
  const apiKey = "AIzaSyB72sOWStq7rCXRXn_hYZzcQMkNncIzNsc";
  
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const context = history.slice(-5).map(m => `${m.senderName}: ${m.content}`).join('\n');

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are Duo, a witty and helpful assistant. Max 2 sentences."
    });

    const result = await model.generateContent(`Context:\n${context}\n\nUser: ${userPrompt}`);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("Gemini Error:", err);
    return "I'm offline for a moment. Try again?";
  }
};
