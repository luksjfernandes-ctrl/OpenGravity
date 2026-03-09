import { google } from 'googleapis';
import { getAuthClient } from './google_auth.js';

function getDocs() {
  return google.docs({ version: 'v1', auth: getAuthClient() });
}

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}

/**
 * Extract plain text from a Google Docs document structure.
 */
function extractTextFromDoc(doc: any): string {
  const content = doc.body?.content || [];
  const parts: string[] = [];

  for (const element of content) {
    if (element.paragraph) {
      const paragraphText = element.paragraph.elements
        ?.map((e: any) => e.textRun?.content || '')
        .join('') || '';
      parts.push(paragraphText);
    } else if (element.table) {
      // Simple table extraction
      for (const row of element.table.tableRows || []) {
        const cells = (row.tableCells || []).map((cell: any) => {
          return (cell.content || [])
            .map((c: any) => c.paragraph?.elements?.map((e: any) => e.textRun?.content || '').join('') || '')
            .join('');
        });
        parts.push('| ' + cells.join(' | ') + ' |');
      }
    }
  }

  return parts.join('').trim();
}

// ── Tool: read_google_doc ──
export const readGoogleDocTool = {
  name: 'read_google_doc',
  description: 'Lê o conteúdo de um Google Doc pelo ID. Retorna o texto extraído do documento. Use após search_drive para ler um documento encontrado.',
  parameters: {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'ID do Google Doc (obtido via search_drive, list_drive_files, ou da URL do documento)'
      }
    },
    required: ['document_id']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const docs = getDocs();
      const res = await docs.documents.get({ documentId: args.document_id });

      const title = res.data.title || '(sem título)';
      let text = extractTextFromDoc(res.data);

      if (text.length > 6000) {
        text = text.substring(0, 6000) + '\n\n... [truncado]';
      }

      return `📄 ${title}:\n\n${text}`;
    } catch (err: any) {
      return `Erro ao ler documento: ${err.message}`;
    }
  }
};

// ── Tool: create_google_doc ──
export const createGoogleDocTool = {
  name: 'create_google_doc',
  description: `Cria um novo Google Doc com título e conteúdo. PROTOCOLO DE SEGURANÇA: Sempre chame PRIMEIRO sem 'confirmed' para gerar preview. Mostre ao usuário e peça confirmação. Só então chame com confirmed=true.`,
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Título do documento'
      },
      content: {
        type: 'string',
        description: 'Conteúdo em texto plano para inserir no documento'
      },
      folder_id: {
        type: 'string',
        description: 'ID da pasta do Drive onde criar o documento (opcional, padrão: raiz)'
      },
      confirmed: {
        type: 'boolean',
        description: 'Se true, cria de fato. Se false/omitido, retorna preview para aprovação.'
      }
    },
    required: ['title', 'content']
  },
  execute: async (args: any): Promise<string> => {
    try {
      // ── CONFIRMATION GATE ──
      if (!args.confirmed) {
        const previewContent = args.content.length > 500
          ? args.content.substring(0, 500) + '\n\n... [truncado no preview]'
          : args.content;
        return `⚠️ PREVIEW DO DOCUMENTO (não criado ainda):\n\n` +
          `📄 Título: ${args.title}\n` +
          (args.folder_id ? `📁 Pasta: ${args.folder_id}\n` : '') +
          `───────────────────\n` +
          `${previewContent}\n` +
          `───────────────────\n\n` +
          `🔒 Mostre ao usuário e peça confirmação. Se confirmado, chame create_google_doc com confirmed=true.`;
      }

      const docs = getDocs();
      const drive = getDrive();

      // Create empty doc
      const createRes = await docs.documents.create({
        requestBody: { title: args.title }
      });

      const docId = createRes.data.documentId!;

      // Insert content
      if (args.content) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: {
            requests: [{
              insertText: {
                location: { index: 1 },
                text: args.content
              }
            }]
          }
        });
      }

      // Move to folder if specified
      if (args.folder_id) {
        await drive.files.update({
          fileId: docId,
          addParents: args.folder_id,
          fields: 'id, parents'
        });
      }

      return `✅ Documento criado: "${args.title}"\nID: ${docId}\nLink: https://docs.google.com/document/d/${docId}/edit`;
    } catch (err: any) {
      return `Erro ao criar documento: ${err.message}`;
    }
  }
};
