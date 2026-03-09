/**
 * One-time setup script to obtain a Google OAuth2 refresh token.
 * 
 * Prerequisites:
 *   1. Go to Google Cloud Console → APIs & Services → Credentials
 *   2. Create "OAuth 2.0 Client ID" (Desktop App type)
 *   3. Enable Gmail, Calendar, Drive, and Docs APIs
 *   4. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 * 
 * Usage:
 *   npx tsx scripts/setup-google-oauth.ts
 * 
 * After running, copy the GOOGLE_REFRESH_TOKEN to your .env and Render Secrets.
 */

import { google } from 'googleapis';
import { config as loadEnv } from 'dotenv';
import * as http from 'http';
import { URL } from 'url';

loadEnv();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env antes de rodar.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3456/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force consent to get refresh_token
});

console.log('\n🔑 Abra esta URL no navegador para autorizar:\n');
console.log(authUrl);
console.log('\nAguardando callback...\n');

// Start local server to receive the OAuth callback
const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/callback')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:3456`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('No code received.');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>✅ Autorização concluída!</h1><p>Pode fechar esta aba.</p>');

    console.log('\n✅ Tokens obtidos com sucesso!\n');
    console.log('━'.repeat(60));
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log('━'.repeat(60));
    console.log('\n📋 Adicione a linha acima ao seu .env e aos Render Secrets.\n');

    server.close();
    process.exit(0);
  } catch (err: any) {
    res.writeHead(500);
    res.end(`Error: ${err.message}`);
    console.error('❌ Erro ao trocar code por tokens:', err.message);
    server.close();
    process.exit(1);
  }
});

server.listen(3456, () => {
  console.log('🌐 Servidor local ouvindo em http://localhost:3456/callback');
});
