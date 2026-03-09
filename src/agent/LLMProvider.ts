import Groq from 'groq-sdk';
import { config } from '../config.js';
import fs from 'fs';

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
    // Groq logic with retry + exponential backoff
    if (!groqClient) throw new Error("Groq API key missing.");
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: messages as any,
          tools: tools.length > 0 ? tools : undefined
        });
        return response.choices[0].message;
      } catch (e: any) {
        lastError = e;
        const status = e?.status || e?.statusCode;
        const isRetryable = status === 429 || (status >= 500 && status < 600);

        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.warn(`⚠️ Groq ${status} (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        console.warn(`Groq error (attempt ${attempt}/${MAX_RETRIES}):`, e.message);
        break;
      }
    }

    // Fallback to OpenRouter
    if (config.OPENROUTER_API_KEY) {
      console.log('🔄 Falling back to OpenRouter...');
      return chatCompletion(messages, tools, true);
    }
    throw lastError;
  }
}

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!groqClient) throw new Error("Groq API key missing.");
  try {
    const transcription = await groqClient.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
      response_format: 'json'
    });
    return transcription.text;
  } catch (error: any) {
    console.error("Groq Transcribe error:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

