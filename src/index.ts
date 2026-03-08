import { bot } from './bot.js';
import http from 'http';
import { webhookCallback } from 'grammy';
import { config } from './config.js';

let lastError = "No errors";

async function main() {
  console.log('Iniciando OpenGravity na Nuvem...');
  
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  
  process.on('uncaughtException', (err) => {
    lastError = `Uncaught Exception: ${err.message}\\n${err.stack}`;
    console.error(lastError);
  });
  process.on('unhandledRejection', (reason, promise) => {
    lastError = `Unhandled Rejection: ${String(reason)}`;
    console.error(lastError);
  });

  bot.catch((err) => {
    lastError = `GrammY Error: ${err.error}`;
    console.error(lastError);
  });

  const port = Number(process.env.PORT || 7860);
  
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`OpenGravity (V2: Webhook Mode) Is Up.\\nÚltimo Erro (se houver): ${lastError}\\n`);
      return;
    }
    
    if (req.method === 'POST' && req.url === '/webhook') {
      // Se não houver token configurado, não tente processar
      if (!config.TELEGRAM_BOT_TOKEN) {
         res.writeHead(500);
         res.end("Bot Token Missing");
         return;
      }
      const handleUpdate = webhookCallback(bot, 'http');
      try {
        await handleUpdate(req, res);
      } catch (err: any) {
         lastError = `Webhook Error: ${err.message}`;
         console.error(lastError);
         if (!res.writableEnded) {
           res.writeHead(500);
           res.end();
         }
      }
      return;
    }
    
    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Webhook e HealthCheck rodando na porta ${port}`);
  });
}

main().catch(err => {
  lastError = `Main Error: ${err.message}`;
  console.error(lastError);
});
