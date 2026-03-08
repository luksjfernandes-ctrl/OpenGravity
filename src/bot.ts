import { Bot, Context } from 'grammy';
import { config } from './config.js';
import { processUserMessage } from './agent/AgentLoop.js';
import { transcribeAudio } from './agent/LLMProvider.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Handle incoming voice/audio messages
bot.on(['message:voice', 'message:audio'], async (ctx: Context) => {
  const userId = ctx.from!.id.toString();
  
  try {
    const fileId = ctx.message?.voice?.file_id || ctx.message?.audio?.file_id;
    if (!fileId) return;

    await ctx.replyWithChatAction('typing');

    // Get file info from telegram
    const file = await ctx.api.getFile(fileId);
    
    // Download url
    const url = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    // Download the file
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Prepare temp file path - Whisper expects common extensions, Telegram voice is ogg
    const tempFilePath = path.join(os.tmpdir(), `${fileId}.ogg`);
    fs.writeFileSync(tempFilePath, buffer);
    
    // Transcribe
    const transcribedText = await transcribeAudio(tempFilePath);
    
    // Delete temp file
    fs.unlinkSync(tempFilePath);
    
    if (!transcribedText || transcribedText.trim() === '') {
      await ctx.reply('Não consegui ouvir ou compreender o áudio. Tente novamente.');
      return;
    }

    // Optional: Let user know what we heard
    // await ctx.reply(`*Áudio transcrito:* ${transcribedText}`, { parse_mode: 'Markdown' });
    
    // Process message through Agent loop
    const response = await processUserMessage(userId, transcribedText);
    
    // Send response back
    await ctx.reply(response);
  } catch (error: any) {
    console.error('Error processing audio message:', error);
    await ctx.reply(`Ocorreu um erro ao processar o áudio: ${error.message}`);
  }
});
