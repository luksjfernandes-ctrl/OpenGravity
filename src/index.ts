import http from 'http';
import { config } from './config.js';

let lastError = "No errors";
let botReady = false;
let botInstance: any = null;

// Queue for webhook updates that arrive before bot is ready (cold start)
const pendingUpdates: any[] = [];

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

  const port = Number(process.env.PORT || 7860);
  
  const server = http.createServer(async (req, res) => {
    // ── Healthcheck ──
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        `OpenGravity v2\n` +
        `Status: ${botReady ? 'READY' : 'INITIALIZING'}\n` +
        `Started: ${startTime}\n` +
        `Last Error: ${lastError}\n`
      );
      return;
    }

    // ── Network diagnostic endpoint ──
    if (req.method === 'GET' && req.url === '/nettest') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      const results: string[] = [];
      
      // Test Groq
      try {
        const start = Date.now();
        const r = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { 'Authorization': `Bearer ${config.GROQ_API_KEY}` },
          signal: AbortSignal.timeout(10000)
        });
        results.push(`Groq: ${r.status} (${Date.now() - start}ms)`);
      } catch (e: any) {
        results.push(`Groq: FAILED - ${e.message}`);
      }

      // Test Telegram
      try {
        const start = Date.now();
        const r = await fetch(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/getMe`, {
          signal: AbortSignal.timeout(10000)
        });
        results.push(`Telegram: ${r.status} (${Date.now() - start}ms)`);
      } catch (e: any) {
        results.push(`Telegram: FAILED - ${e.message}`);
      }

      res.end(results.join('\n') + '\n');
      return;
    }
    
    // ── Webhook handler ──
    if (req.method === 'POST' && req.url === '/webhook') {
      // Read the request body
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        // Respond to Telegram IMMEDIATELY (within ms)
        res.writeHead(200);
        res.end();

        // Parse body early — needed for both queue and immediate processing
        let body: any;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString());
        } catch (err: any) {
          lastError = `Webhook JSON Parse Error: ${err.message}`;
          console.error(lastError);
          return;
        }

        if (!botReady || !botInstance) {
          console.warn(`⏳ Bot not ready yet, queuing update ${body.update_id}`);
          pendingUpdates.push(body);
          return;
        }

        // Process asynchronously (fire and forget)
        console.log(`📩 Webhook update received: ${body.update_id}`);
        botInstance.handleUpdate(body).catch((err: any) => {
          lastError = `HandleUpdate Error: ${err.message}`;
          console.error(lastError);
        });
      });
      return;
    }
    
    res.writeHead(404);
    res.end();
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 HTTP listening on port ${port}`);
  });

  // ── Initialize bot AFTER server is up ──
  try {
    if (!config.TELEGRAM_BOT_TOKEN) {
      lastError = "TELEGRAM_BOT_TOKEN is empty.";
      console.error(`❌ ${lastError}`);
      return;
    }

    const { bot } = await import('./bot.js');
    botInstance = bot;
    
    bot.catch((err: any) => {
      lastError = `GrammY Error: ${err.error}`;
      console.error(lastError);
    });

    // Init bot internal state (needed for handleUpdate to work)
    await bot.init();
    console.log(`✅ Bot info: @${bot.botInfo.username}`);

    // Register webhook with retry + exponential backoff
    // Auto-detect webhook URL: WEBHOOK_URL (manual), RENDER_EXTERNAL_URL (Render), SPACE_HOST (HF)
    const webhookUrl = process.env.WEBHOOK_URL 
      || (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/webhook` : null)
      || (process.env.SPACE_HOST ? `https://${process.env.SPACE_HOST}/webhook` : null);
    
    if (webhookUrl) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await bot.api.setWebhook(webhookUrl);
          console.log(`✅ Webhook registrado: ${webhookUrl}`);
          break;
        } catch (whErr: any) {
          console.warn(`⚠️ Webhook attempt ${attempt}/5 failed: ${whErr.message}`);
          if (attempt < 5) {
            await new Promise(r => setTimeout(r, attempt * 5000));
          } else {
            lastError = `Webhook failed after 5 attempts: ${whErr.message}`;
            console.error(`❌ ${lastError}`);
          }
        }
      }
    } else {
      console.warn("⚠️ WEBHOOK_URL / SPACE_HOST not set. Register webhook manually.");
    }

    botReady = true;
    console.log("✅ Bot pronto.");

    // Process any updates that arrived during cold start
    if (pendingUpdates.length > 0) {
      console.log(`📬 Processing ${pendingUpdates.length} queued update(s)...`);
      for (const update of pendingUpdates) {
        botInstance.handleUpdate(update).catch((err: any) => {
          console.error(`HandleUpdate (queued) Error: ${err.message}`);
        });
      }
      pendingUpdates.length = 0;
    }

    // Keep-alive self-ping every 10 minutes to prevent Render free tier spin-down
    const externalUrl = process.env.RENDER_EXTERNAL_URL;
    if (externalUrl) {
      const KEEP_ALIVE_MS = 10 * 60 * 1000; // 10 minutes
      setInterval(() => {
        fetch(externalUrl).then(r => {
          console.log(`🏓 Keep-alive ping: ${r.status}`);
        }).catch(err => {
          console.warn(`🏓 Keep-alive ping failed: ${err.message}`);
        });
      }, KEEP_ALIVE_MS);
      console.log(`🏓 Keep-alive configurado: ping a cada 10min para ${externalUrl}`);
    }
    
  } catch (err: any) {
    lastError = `Bot Init Error: ${err.message}\n${err.stack}`;
    console.error(`❌ ${lastError}`);
  }
}

main().catch(err => {
  lastError = `Main Error: ${err.message}`;
  console.error(lastError);
});
