
import { GoogleGenAI } from "@google/genai";
import { Message } from '../types';

export const getAiResponse = async (userPrompt: string, history: Message[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const context = history.slice(-10).map(m => `${m.senderName}: ${m.content}`).join('\n');

  const systemInstruction = `
    You are 'Duo', a sophisticated AI assistant for a private 2-person space.
    Your tone is elegant, helpful, and concise. 
    Avoid over-enthusiasm or "cringe" slang. 
    Provide intelligent insights or playful, brief banter.
    Max response length: 2 sentences.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Context:\n${context}\n\nLatest Request: ${userPrompt}`,
      config: { systemInstruction }
    });
    return response.text;
  } catch (err) {
    console.error("AI Error:", err);
    return "I'm temporarily unavailable. Please try again in a moment.";
  }
};
