import { bot } from './bot.js';

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

  // Start polling
  bot.start({
    onStart(botInfo) {
      console.log(`Bot conectado com sucesso como @${botInfo.username}`);
    }
  });
}

main().catch(console.error);
