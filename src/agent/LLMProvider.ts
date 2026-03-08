import Groq from 'groq-sdk';
import { config } from '../config.js';

let groqClient: Groq | null = null;
if (config.GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: config.GROQ_API_KEY });
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

export async function chatCompletion(
  messages: Message[],
  tools: any[],
  useOpenRouter = false
) {
  if (useOpenRouter) {
    // OpenRouter logic fallback
    if (!config.OPENROUTER_API_KEY) throw new Error("OpenRouter API key missing.");
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.OPENROUTER_MODEL,
        messages,
        tools: tools.length > 0 ? tools : undefined
      })
    });
    const data = await res.json();
    return data.choices[0].message;
  } else {
    // Groq logic
    if (!groqClient) throw new Error("Groq API key missing.");
    try {
      // TypeScript requires any cast here because groq-sdk typings may differ slightly 
      // regarding tool calls and messages format depending on SDK version.
      const response = await groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Update this based on latest Groq offering
        messages: messages as any,
        tools: tools.length > 0 ? tools : undefined
      });
      return response.choices[0].message;
    } catch (e: any) {
      console.warn("Groq error, falling back to OpenRouter if configured:", e.message);
      if (config.OPENROUTER_API_KEY) {
        return chatCompletion(messages, tools, true);
      }
      throw e;
    }
  }
}
