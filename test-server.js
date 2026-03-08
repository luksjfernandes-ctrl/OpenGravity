import http from 'http';
import { Bot, webhookCallback } from 'grammy';

const bot = new Bot('8663246771:AAGl2bR3ZBDB71d5KFPYOhlPZYJUftxvi5Y');

bot.on('message', (ctx) => {
  console.log("Teste de message recebida:", ctx.message.text);
  ctx.reply("OK FUNCIONA");
});

const handleUpdate = webhookCallback(bot, 'http');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    handleUpdate(req, res).catch(console.error);
  } else {
    res.end('OK');
  }
});

server.listen(3000, () => {
  console.log("Listening 3000");
});
