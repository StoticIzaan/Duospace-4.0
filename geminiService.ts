import { GoogleGenAI } from "@google/genai";
import { Message } from './types';

export const getAiResponse = async (userPrompt: string, history: Message[], tone: 'playful' | 'serious' = 'playful') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const context = history.slice(-10).map(m => `${m.sender_name}: ${m.content}`).join('\n');

  const toneInstruction = tone === 'playful' 
    ? "Your tone is witty, fun, and slightly chaotic (like a best friend). Use emojis occasionally." 
    : "Your tone is elegant, concise, and helpful. Be polite and calm.";

  const systemInstruction = `
    You are 'Duo', a sophisticated AI assistant for a private 2-person space.
    ${toneInstruction}
    Max response length: 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context:\n${context}\n\nLatest Request: ${userPrompt}`,
      config: { systemInstruction }
    });
    return response.text || "I'm sorry, I couldn't think of a response right now.";
  } catch (err) {
    console.error("AI Error:", err);
    return "I'm temporarily unavailable. Please try again in a moment.";
  }
};