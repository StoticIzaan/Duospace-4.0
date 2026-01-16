import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from '../types';

/**
 * Generates an AI response using the Gemini 1.5 Flash model.
 */
export const getAiResponse = async (userPrompt: string, history: Message[], tone: 'playful' | 'serious' = 'playful') => {
  // Vite requires 'import.meta.env' to read your .env file
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("Gemini API Key is missing from .env file!");
    return "I'm missing my API key. Please add VITE_GEMINI_API_KEY to your .env file.";
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Keep conversation context manageable (last 10 messages)
  const context = history.slice(-10).map(m => `${m.senderName}: ${m.content}`).join('\n');

  const toneInstruction = tone === 'playful' 
    ? "Your tone is witty, fun, and slightly chaotic. Use emojis occasionally." 
    : "Your tone is elegant, concise, and helpful. Be polite and calm.";

  const systemInstruction = `
    You are 'Duo', a sophisticated AI assistant for a private 2-person space.
    ${toneInstruction}
    Max response length: 2 sentences.
  `;

  try {
    // gemini-1.5-flash is the current stable model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContent(`Context:\n${context}\n\nLatest Request: ${userPrompt}`);
    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error("AI Error:", err);
    return "I'm temporarily unavailable. Please try again in a moment.";
  }
};
