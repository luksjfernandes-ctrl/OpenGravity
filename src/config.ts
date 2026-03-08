import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "Bot token escapes"),
  TELEGRAM_ALLOWED_USER_IDS: z.string().transform((val) => val.split(',').map((id) => id.trim())),
  GROQ_API_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  ELEVENLABS_API_KEY: z.string().optional(),
  DB_PATH: z.string().default('./memory.db'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
});

let parsedEnv: any;
try {
  parsedEnv = envSchema.parse(process.env);
} catch (e: any) {
  console.error("❌ ERRO DE CONFIGURAÇÃO (Environment Variables):");
  if (e instanceof z.ZodError) {
    console.error(JSON.stringify(e.format(), null, 2));
  } else {
    console.error(e.message);
  }
  // No cloud, queremos que o processo continue o mínimo para o Healthcheck funcionar e nos mostrar o erro
  parsedEnv = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_ALLOWED_USER_IDS: (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(','),
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
    DB_PATH: process.env.DB_PATH || './memory.db',
  };
}

export const config = parsedEnv;
