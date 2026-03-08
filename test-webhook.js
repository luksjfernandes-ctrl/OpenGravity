import http from 'http';
import { Bot, webhookCallback } from 'grammy';

const bot = new Bot('8663246771:AAGl2bR3ZBDB71d5KFPYOhlPZYJUftxvi5Y');

bot.on('message', (ctx) => {
  console.log("Recebi uma mensagem via webhook:", ctx.message.text);
});

const handleUpdate = webhookCallback(bot, 'http');

const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    handleUpdate(req, res).catch(console.error);
  } else {
    res.end('OK');
  }
});

server.listen(3000, () => {
  console.log("Ouvindo porta 3000 localmente...");
});
