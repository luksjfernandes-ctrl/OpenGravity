import { google } from 'googleapis';
import { getAuthClient } from './google_auth.js';

function getDrive() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}

const MIME_LABELS: Record<string, string> = {
  'application/vnd.google-apps.document': '📄 Doc',
  'application/vnd.google-apps.spreadsheet': '📊 Sheet',
  'application/vnd.google-apps.presentation': '📽️ Slides',
  'application/vnd.google-apps.folder': '📁 Pasta',
  'application/pdf': '📕 PDF',
  'image/png': '🖼️ PNG',
  'image/jpeg': '🖼️ JPEG',
};

// ── Tool: list_drive_files ──
export const listDriveFilesTool = {
  name: 'list_drive_files',
  description: 'Lista arquivos recentes do Google Drive. Use quando o usuário perguntar sobre seus arquivos, documentos, pastas.',
  parameters: {
    type: 'object',
    properties: {
      folder_id: {
        type: 'string',
        description: 'ID da pasta para listar (opcional, padrão: raiz do Drive)'
      },
      max_results: {
        type: 'number',
        description: 'Máximo de arquivos (padrão: 15)'
      }
    },
    required: []
  },
  execute: async (args: any): Promise<string> => {
    try {
      const drive = getDrive();
      const maxResults = args.max_results || 15;

      let query = 'trashed = false';
      if (args.folder_id) {
        query += ` and '${args.folder_id}' in parents`;
      }

      const res = await drive.files.list({
        q: query,
        pageSize: maxResults,
        fields: 'files(id, name, mimeType, modifiedTime, size)',
        orderBy: 'modifiedTime desc'
      });

      const files = res.data.files || [];

      if (files.length === 0) {
        return '📂 Nenhum arquivo encontrado.';
      }

      const lines = files.map(f => {
        const typeLabel = MIME_LABELS[f.mimeType || ''] || '📎 Arquivo';
        const modified = f.modifiedTime 
          ? new Date(f.modifiedTime).toLocaleDateString('pt-BR') 
          : '';
        return `${typeLabel} **${f.name}**\n   Modificado: ${modified} | ID: ${f.id}`;
      });

      return `📂 Arquivos (${files.length}):\n\n${lines.join('\n\n')}`;
    } catch (err: any) {
      return `Erro ao listar arquivos: ${err.message}`;
    }
  }
};

// ── Tool: search_drive ──
export const searchDriveTool = {
  name: 'search_drive',
  description: 'Busca arquivos no Google Drive por nome ou tipo. Use quando o usuário procurar um arquivo específico.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Nome ou parte do nome do arquivo para buscar'
      },
      file_type: {
        type: 'string',
        enum: ['document', 'spreadsheet', 'presentation', 'pdf', 'folder'],
        description: 'Tipo de arquivo para filtrar (opcional)'
      },
      max_results: {
        type: 'number',
        description: 'Máximo de resultados (padrão: 10)'
      }
    },
    required: ['query']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const drive = getDrive();
      const maxResults = args.max_results || 10;

      let q = `name contains '${args.query.replace(/'/g, "\\'")}' and trashed = false`;

      const mimeMap: Record<string, string> = {
        document: 'application/vnd.google-apps.document',
        spreadsheet: 'application/vnd.google-apps.spreadsheet',
        presentation: 'application/vnd.google-apps.presentation',
        pdf: 'application/pdf',
        folder: 'application/vnd.google-apps.folder'
      };

      if (args.file_type && mimeMap[args.file_type]) {
        q += ` and mimeType = '${mimeMap[args.file_type]}'`;
      }

      const res = await drive.files.list({
        q,
        pageSize: maxResults,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc'
      });

      const files = res.data.files || [];

      if (files.length === 0) {
        return `🔍 Nenhum arquivo encontrado para "${args.query}".`;
      }

      const lines = files.map(f => {
        const typeLabel = MIME_LABELS[f.mimeType || ''] || '📎';
        return `${typeLabel} **${f.name}**\n   ID: ${f.id}`;
      });

      return `🔍 Resultados para "${args.query}" (${files.length}):\n\n${lines.join('\n\n')}`;
    } catch (err: any) {
      return `Erro ao buscar no Drive: ${err.message}`;
    }
  }
};

// ── Tool: read_drive_file ──
export const readDriveFileTool = {
  name: 'read_drive_file',
  description: 'Lê o conteúdo de um arquivo do Google Drive (Docs, Sheets e Slides são exportados como texto plano; PDFs extraídos quando possível). Use após search_drive ou list_drive_files.',
  parameters: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description: 'ID do arquivo (obtido via list_drive_files ou search_drive)'
      }
    },
    required: ['file_id']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const drive = getDrive();

      // First, get file metadata to determine type
      const meta = await drive.files.get({
        fileId: args.file_id,
        fields: 'id, name, mimeType'
      });

      const mimeType = meta.data.mimeType || '';
      const name = meta.data.name || 'arquivo';

      // Google Workspace files need export
      const exportMimeMap: Record<string, string> = {
        'application/vnd.google-apps.document': 'text/plain',
        'application/vnd.google-apps.spreadsheet': 'text/csv',
        'application/vnd.google-apps.presentation': 'text/plain',
      };

      let content: string;

      if (exportMimeMap[mimeType]) {
        const res = await drive.files.export({
          fileId: args.file_id,
          mimeType: exportMimeMap[mimeType]
        });
        content = String(res.data);
      } else {
        // Binary/regular file — download content
        const res = await drive.files.get({
          fileId: args.file_id,
          alt: 'media'
        });
        content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      }

      // Truncate
      if (content.length > 6000) {
        content = content.substring(0, 6000) + '\n\n... [truncado — arquivo muito longo]';
      }

      return `📄 ${name}:\n\n${content}`;
    } catch (err: any) {
      return `Erro ao ler arquivo: ${err.message}`;
    }
  }
};
