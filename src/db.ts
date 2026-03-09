import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from './config.js';
import { readFileSync, existsSync } from 'fs';

// Inicializa o Firebase passando o Service Account explicitamente
try {
  let credential;
  
  // Cloud: JSON direto via env var
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = cert(serviceAccount);
      console.log("🔑 Firebase credential: env var FIREBASE_SERVICE_ACCOUNT_JSON");
    } catch (parseError: any) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON não é JSON válido:", parseError.message);
    }
  } 
  
  // Local: arquivo no disco
  if (!credential && config.GOOGLE_APPLICATION_CREDENTIALS) {
    const filePath = config.GOOGLE_APPLICATION_CREDENTIALS;
    if (existsSync(filePath)) {
      try {
        const serviceAccount = JSON.parse(readFileSync(filePath, 'utf-8'));
        credential = cert(serviceAccount);
        console.log(`🔑 Firebase credential: arquivo ${filePath}`);
      } catch (fsError: any) {
        console.error(`❌ Erro ao ler ${filePath}:`, fsError.message);
      }
    } else {
      console.warn(`⚠️ GOOGLE_APPLICATION_CREDENTIALS aponta para ${filePath}, mas o arquivo não existe. Ignorando (normal em cloud).`);
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
