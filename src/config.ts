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

export const config = envSchema.parse(process.env);
