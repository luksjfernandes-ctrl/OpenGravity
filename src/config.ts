import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// dotenv silently ignores missing .env files — expected in Docker/HF Spaces
loadEnv();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_ALLOWED_USER_IDS: z.string().transform((val) => val.split(',').map((id) => id.trim())),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  ELEVENLABS_API_KEY: z.string().optional(),
  DB_PATH: z.string().default('./memory.db'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
});

let parsedEnv: z.infer<typeof envSchema>;

try {
  parsedEnv = envSchema.parse(process.env);
  console.log("✅ Configuração carregada com sucesso.");
  console.log(`   - TELEGRAM_BOT_TOKEN: ${parsedEnv.TELEGRAM_BOT_TOKEN ? '***SET***' : 'MISSING'}`);
  console.log(`   - GROQ_API_KEY: ${parsedEnv.GROQ_API_KEY ? '***SET***' : 'MISSING'}`);
  console.log(`   - FIREBASE_SERVICE_ACCOUNT_JSON: ${parsedEnv.FIREBASE_SERVICE_ACCOUNT_JSON ? '***SET***' : 'NOT SET (will try file)'}`);
} catch (e: any) {
  console.error("❌ ERRO DE CONFIGURAÇÃO (Environment Variables):");
  if (e instanceof z.ZodError) {
    console.error(JSON.stringify(e.format(), null, 2));
  } else {
    console.error(e.message);
  }
  // Fallback mínimo para manter o healthcheck vivo e mostrar erros via GET /
  parsedEnv = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_ALLOWED_USER_IDS: (process.env.TELEGRAM_ALLOWED_USER_IDS || '').split(',').map(s => s.trim()),
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free',
    DB_PATH: process.env.DB_PATH || './memory.db',
  } as any;
}

export const config = parsedEnv;
