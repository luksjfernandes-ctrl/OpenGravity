import { google } from 'googleapis';
import { getAuthClient } from './google_auth.js';

function getGmail() {
  return google.gmail({ version: 'v1', auth: getAuthClient() });
}

// ── Tool: list_emails ──
export const listEmailsTool = {
  name: 'list_emails',
  description: 'Lista os emails mais recentes da caixa de entrada do usuário. Use quando o usuário perguntar sobre emails, mensagens recebidas, etc.',
  parameters: {
    type: 'object',
    properties: {
      max_results: {
        type: 'number',
        description: 'Quantidade máxima de emails (padrão: 10, máximo: 20)'
      },
      label: {
        type: 'string',
        description: 'Label/pasta para filtrar (ex: INBOX, SENT, STARRED). Padrão: INBOX'
      },
      query: {
        type: 'string',
        description: 'Query de busca no formato Gmail (ex: "from:joao@email.com", "is:unread", "subject:reunião")'
      }
    },
    required: []
  },
  execute: async (args: any): Promise<string> => {
    try {
      const gmail = getGmail();
      const maxResults = Math.min(args.max_results || 10, 20);
      const labelIds = args.label ? [args.label.toUpperCase()] : ['INBOX'];

      const listParams: any = {
        userId: 'me',
        maxResults,
        labelIds: args.query ? undefined : labelIds,
        q: args.query || undefined
      };

      const res = await gmail.users.messages.list(listParams);
      const messages = res.data.messages || [];

      if (messages.length === 0) {
        return '📭 Nenhum email encontrado com esses critérios.';
      }

      const summaries: string[] = [];
      // Fetch headers for each message (batch-style, sequential to avoid rate limits)
      for (const msg of messages.slice(0, maxResults)) {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = detail.data.payload?.headers || [];
        const from = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
        const subject = headers.find(h => h.name === 'Subject')?.value || '(sem assunto)';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        const isUnread = detail.data.labelIds?.includes('UNREAD') ? '🔵' : '⚪';

        summaries.push(`${isUnread} **${subject}**\n   De: ${from}\n   Data: ${date}\n   ID: ${msg.id}`);
      }

      return `📧 Emails (${summaries.length}):\n\n${summaries.join('\n\n')}`;
    } catch (err: any) {
      return `Erro ao listar emails: ${err.message}`;
    }
  }
};

// ── Tool: read_email ──
export const readEmailTool = {
  name: 'read_email',
  description: 'Lê o conteúdo completo de um email pelo ID. Use após list_emails para ver detalhes de um email específico.',
  parameters: {
    type: 'object',
    properties: {
      email_id: {
        type: 'string',
        description: 'ID do email (obtido via list_emails ou search_emails)'
      }
    },
    required: ['email_id']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const gmail = getGmail();
      const res = await gmail.users.messages.get({
        userId: 'me',
        id: args.email_id,
        format: 'full'
      });

      const headers = res.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || 'Desconhecido';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(sem assunto)';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      // Extract body text
      let body = '';
      const payload = res.data.payload;

      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
      } else if (payload?.parts) {
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
        const part = textPart || htmlPart;
        if (part?.body?.data) {
          body = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        }
      }

      // Truncate very long bodies
      if (body.length > 4000) {
        body = body.substring(0, 4000) + '\n\n... [truncado]';
      }

      // Strip HTML tags if present
      body = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      return `📧 Email:\n\nDe: ${from}\nPara: ${to}\nAssunto: ${subject}\nData: ${date}\n\n${body}`;
    } catch (err: any) {
      return `Erro ao ler email: ${err.message}`;
    }
  }
};

// ── Tool: send_email ──
export const sendEmailTool = {
  name: 'send_email',
  description: `Envia um email em nome do usuário. PROTOCOLO DE SEGURANÇA: Sempre chame PRIMEIRO sem 'confirmed' para gerar preview. Mostre o preview completo ao usuário e peça confirmação explícita. Só então chame novamente com confirmed=true.`,
  parameters: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Endereço de email do destinatário'
      },
      subject: {
        type: 'string',
        description: 'Assunto do email'
      },
      body: {
        type: 'string',
        description: 'Corpo do email em texto plano'
      },
      confirmed: {
        type: 'boolean',
        description: 'Se true, envia de fato. Se false/omitido, retorna preview para aprovação do usuário.'
      }
    },
    required: ['to', 'subject', 'body']
  },
  execute: async (args: any): Promise<string> => {
    try {
      // ── CONFIRMATION GATE ──
      if (!args.confirmed) {
        return `⚠️ PREVIEW DO EMAIL (não enviado ainda):\n\n` +
          `Para: ${args.to}\n` +
          `Assunto: ${args.subject}\n` +
          `───────────────────\n` +
          `${args.body}\n` +
          `───────────────────\n\n` +
          `🔒 Mostre este preview ao usuário e peça confirmação. Se confirmado, chame send_email novamente com confirmed=true.`;
      }

      const gmail = getGmail();

      const rawMessage = [
        `To: ${args.to}`,
        `Subject: ${args.subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        args.body
      ].join('\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      return `✅ Email enviado para ${args.to}\nAssunto: ${args.subject}`;
    } catch (err: any) {
      return `Erro ao enviar email: ${err.message}`;
    }
  }
};

// ── Tool: search_emails ──
export const searchEmailsTool = {
  name: 'search_emails',
  description: 'Busca emails usando a sintaxe de busca do Gmail. Use quando o usuário quiser encontrar emails específicos.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Query no formato Gmail (ex: "from:maria subject:relatório after:2026/03/01", "is:unread has:attachment")'
      },
      max_results: {
        type: 'number',
        description: 'Máximo de resultados (padrão: 10)'
      }
    },
    required: ['query']
  },
  execute: async (args: any): Promise<string> => {
    // Reuse list_emails with query parameter
    return listEmailsTool.execute({
      query: args.query,
      max_results: args.max_results || 10
    });
  }
};
