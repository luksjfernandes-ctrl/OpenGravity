import { Bot } from 'grammy';
import { config } from './src/config.js';
const bot = new Bot(config.TELEGRAM_BOT_TOKEN);
async function test() {
  await bot.api.sendMessage(config.TELEGRAM_ALLOWED_USER_IDS[0], "Mensagem enviada do script de teste de diagnóstico.");
  console.log("Mensagem de teste enviada.");
}
test().catch(console.error);
