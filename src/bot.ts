import { Bot, Context } from 'grammy';
import { config } from './config.js';
import { processUserMessage } from './agent/AgentLoop.js';

export const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

// Middleware to restrict access to allowed users
bot.use(async (ctx: Context, next) => {
  const userId = ctx.from?.id.toString();
  if (!userId || !config.TELEGRAM_ALLOWED_USER_IDS.includes(userId)) {
    console.warn(`Unauthorized access attempt from user ID: ${userId}`);
    return; // Ignore message
  }
  await next();
});

// Handle incoming text messages
bot.on('message:text', async (ctx: Context) => {
  const userId = ctx.from!.id.toString();
  const text = ctx.message?.text;
  if (!text) {
    await ctx.reply('Apenas mensagens de texto são suportadas no momento.');
    return;
  }
  try {
    // Show typing status
    await ctx.replyWithChatAction('typing');
    
    // Process message through Agent loop
    const response = await processUserMessage(userId, text);
    
    // Send response back
    await ctx.reply(response);
  } catch (error: any) {
    console.error('Error processing message:', error);
    await ctx.reply(`Ocorreu um erro: ${error.message}`);
  }
});
