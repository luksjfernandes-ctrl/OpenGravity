import http from 'http';
import { config } from './config.js';

let lastError = "No errors";
let botReady = false;

async function main() {
  const startTime = new Date().toISOString();
  console.log(`===== OpenGravity Startup at ${startTime} =====`);
  
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  
  process.on('uncaughtException', (err) => {
    lastError = `Uncaught Exception: ${err.message}\n${err.stack}`;
    console.error(lastError);
  });
  process.on('unhandledRejection', (reason) => {
    lastError = `Unhandled Rejection: ${String(reason)}`;
    console.error(lastError);
  });

  // ── Start HTTP server FIRST for healthcheck ──
  const port = Number(process.env.PORT || 7860);
  
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        `OpenGravity v2 (Webhook Mode)\n` +
        `Status: ${botReady ? 'READY' : 'INITIALIZING'}\n` +
        `Started: ${startTime}\n` +
        `Last Error: ${lastError}\n`
      );
      return;
    }
    
    if (req.method === 'POST' && req.url === '/webhook') {
      if (!botReady) {
        res.writeHead(503);
        res.end("Bot not ready yet");
        return;
      }
      
      try {
        // Lazy import to avoid circular deps and ensure config is loaded
        const { bot } = await import('./bot.js');
        const { webhookCallback } = await import('grammy');
        
        bot.catch((err: any) => {
          lastError = `GrammY Error: ${err.error}`;
          console.error(lastError);
        });
        
        const handleUpdate = webhookCallback(bot, 'http');
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
    console.log(`🌐 HTTP server (healthcheck + webhook) listening on port ${port}`);
  });

  // ── Initialize bot AFTER server is up ──
  try {
    if (!config.TELEGRAM_BOT_TOKEN) {
      lastError = "TELEGRAM_BOT_TOKEN is empty — bot will not respond.";
      console.error(`❌ ${lastError}`);
      return; // Server stays up for healthcheck but bot won't work
    }

    // Pre-import bot module to detect any import/initialization errors
    const { bot } = await import('./bot.js');
    
    bot.catch((err: any) => {
      lastError = `GrammY Error: ${err.error}`;
      console.error(lastError);
    });

    // ── Register webhook with Telegram ──
    const webhookUrl = process.env.WEBHOOK_URL 
      || (process.env.SPACE_HOST ? `https://${process.env.SPACE_HOST}/webhook` : null);
    
    if (webhookUrl) {
      try {
        await bot.api.setWebhook(webhookUrl);
        console.log(`✅ Webhook registrado no Telegram: ${webhookUrl}`);
      } catch (whErr: any) {
        lastError = `Webhook Registration Error: ${whErr.message}`;
        console.error(`⚠️ Falha ao registrar webhook: ${whErr.message}`);
        // Bot may still work if webhook was previously set — don't block
      }
    } else {
      console.warn("⚠️ WEBHOOK_URL e SPACE_HOST não definidos. Webhook NÃO registrado.");
      console.warn("   Configure WEBHOOK_URL nos secrets do HF Space como:");
      console.warn("   https://<seu-space>.hf.space/webhook");
    }

    botReady = true;
    console.log("✅ Bot inicializado e pronto para receber webhooks.");
    
  } catch (err: any) {
    lastError = `Bot Init Error: ${err.message}\n${err.stack}`;
    console.error(`❌ ${lastError}`);
    // Server stays up — healthcheck will show the error
  }
}

main().catch(err => {
  lastError = `Main Error: ${err.message}`;
  console.error(lastError);
});
