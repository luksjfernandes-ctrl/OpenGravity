import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './config.js';
import { readFileSync } from 'fs';

// Inicializa o Firebase passando o Service Account explicitamente
try {
  let credential;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(serviceAccount);
    } catch (parseError: any) {
      console.error("❌ ERRO: FIREBASE_SERVICE_ACCOUNT_JSON existe, mas não é um JSON válido. Verifique se você não colou errado nas Secrets do Hugging Face. Erro:", parseError.message);
    }
  } 
  
  if (!credential && config.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Localmente via arquivo
      const serviceAccount = JSON.parse(readFileSync(config.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
      credential = cert(serviceAccount);
    } catch (fsError: any) {
      console.error(`❌ ERRO: O arquivo definido em GOOGLE_APPLICATION_CREDENTIALS (${config.GOOGLE_APPLICATION_CREDENTIALS}) não pôde ser lido. Erro:`, fsError.message);
    }
  }

  if (credential) {
    initializeApp({ credential });
    console.log("🔥 Firebase inicializado via Service Account explícito.");
  } else {
    console.warn("⚠️ Nenhuma credencial explícita encontrada. Tentando usar o Application Default Credentials...");
    initializeApp();
    console.log("🔥 Firebase inicializado via Application Default Credentials.");
  }
  
} catch (e: any) {
  if (!/already exists/.test(e.message)) {
    console.error("Erro fatal ao inicializar Firebase", e);
  }
}

export const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

/**
 * Persist a message to the database in Firestore.
 */
export async function saveMessage(params: {
  userId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  toolCalls?: string | null;
  toolCallId?: string | null;
}) {
  const collectionRef = db.collection('users').doc(params.userId).collection('messages');
  await collectionRef.add({
    role: params.role,
    content: params.content,
    tool_calls: params.toolCalls ?? null,
    tool_call_id: params.toolCallId ?? null,
    created_at: new Date()
  });
}

/**
 * Get recent messages for context from Firestore.
 */
export async function getRecentMessages(userId: string, limit = 50): Promise<any[]> {
  const collectionRef = db.collection('users').doc(userId).collection('messages');
  const snapshot = await collectionRef.orderBy('created_at', 'asc').limitToLast(limit).get();
  
  return snapshot.docs.map(doc => doc.data());
}
