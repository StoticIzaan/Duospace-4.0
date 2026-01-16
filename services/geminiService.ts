
import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

/**
 * Generates an AI response using the Gemini 3 Flash model.
 * Gemini 3 Flash is preferred for conversational tasks.
 */
export const getAiResponse = async (userPrompt: string, history: Message[], tone: 'playful' | 'serious' = 'playful') => {
  // Initialize Gemini client with standard process.env.API_KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Keep conversation context manageable (last 10 messages)
  const context = history.slice(-10).map(m => `${m.senderName}: ${m.content}`).join('\n');

  const toneInstruction = tone === 'playful' 
    ? "Your tone is witty, fun, and slightly chaotic (like a best friend). Use emojis occasionally." 
    : "Your tone is elegant, concise, and helpful. Be polite and calm.";

  const systemInstruction = `
    You are 'Duo', a sophisticated AI assistant for a private 2-person space.
    ${toneInstruction}
    Avoid "cringe" slang. 
    Max response length: 2 sentences.
  `;

  try {
    // Basic Text Tasks should use gemini-3-flash-preview
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context:\n${context}\n\nLatest Request: ${userPrompt}`,
      config: { systemInstruction }
    });
    // Use .text getter property for the extracted string
    return response.text;
  } catch (err) {
    console.error("AI Error:", err);
    return "I'm temporarily unavailable. Please try again in a moment.";
  }
};
