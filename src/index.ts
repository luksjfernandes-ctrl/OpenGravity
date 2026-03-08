import { bot } from './bot.js';
import http from 'http';

async function main() {
  console.log('Iniciando OpenGravity');
  console.log('Iniciando conexão com a nuvem Firebase');
  console.log('Base de dados em nuvem lista');
  console.log('Iniciando bot de Telegram em modo Long Polling...');
  
  // Setup gracefully shutdown
  process.on('SIGINT', () => {
    bot.stop();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    bot.stop();
    process.exit(0);
  });

  // Handle grammY errors aggressively so it doesn't crash the container
  bot.catch((err) => {
    console.error(`Error while handling update ${err.ctx?.update?.update_id}:`, err.error);
  });

  // Start polling
  bot.start({
    onStart(botInfo) {
      console.log(`🤖 Bot conectado com sucesso como @${botInfo.username}`);
    }
  });

  // Dummy web server to satisfy Hugging Face Spaces port requirement (7860)
  const port = Number(process.env.PORT || 7860);
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OpenGravity Bot is running.\\n');
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Servidor de HealthCheck web escutando em http://0.0.0.0:${port}`);
  });
}

main().catch(console.error);
