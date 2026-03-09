# OpenGravity 🪐

Agente de IA pessoal e autônomo via Telegram, usando memória via Firebase Firestore e LLMs via Groq/OpenRouter.

## Stack
- **Runtime**: Node.js 20 + TypeScript
- **Bot**: grammY (Telegram Bot Framework)
- **LLM**: Groq (llama-3.3-70b) com fallback para OpenRouter
- **Memória**: Firebase Firestore
- **Voz**: ElevenLabs TTS + Groq Whisper STT
- **Deploy**: Docker (Render.com)

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Token do BotFather |
| `TELEGRAM_ALLOWED_USER_IDS` | ✅ | IDs permitidos (comma-separated) |
| `GROQ_API_KEY` | ✅ | Chave da API Groq |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ✅ (cloud) | JSON do Service Account Firebase |
| `OPENROUTER_API_KEY` | ⬜ | Fallback LLM |
| `ELEVENLABS_API_KEY` | ⬜ | Text-to-Speech |
| `WEBHOOK_URL` | ⬜ | Auto-detectado no Render/HF |

## Deploy

```bash
# Local
npm install
npm run dev

# Docker
docker build -t opengravity .
docker run -p 7860:7860 --env-file .env opengravity
```
