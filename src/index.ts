import { bot } from './bot.js';
import http from 'http';
import { webhookCallback } from 'grammy';

async function main() {
  console.log('Iniciando OpenGravity na Nuvem...');
  
  // Setup gracefully shutdown
  process.on('SIGINT', () => {
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    process.exit(0);
  });

  // Handle grammY errors aggressively so it doesn't crash the container
  bot.catch((err) => {
    console.error(`Error while handling update ${err.ctx?.update?.update_id}:`, err.error);
  });

  const port = Number(process.env.PORT || 7860);
  
  // Criar servidor HTTP nativo
  const server = http.createServer(async (req, res) => {
    // Rota de Healthcheck do Hugging Face
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OpenGravity Bot is running.\\n');
      return;
    }
    
    // Rota do Webhook do Telegram
    if (req.method === 'POST' && req.url === '/webhook') {
      const handleUpdate = webhookCallback(bot, 'http');
      return handleUpdate(req, res);
    }
    
    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Webhook e HealthCheck rodando na porta ${port}`);
  });
}

main().catch(console.error);
