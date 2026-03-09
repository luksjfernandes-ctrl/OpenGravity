import { google } from 'googleapis';
import { getAuthClient } from './google_auth.js';

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuthClient() });
}

// ── Tool: list_events ──
export const listEventsTool = {
  name: 'list_events',
  description: 'Lista eventos do Google Calendar. Use quando o usuário perguntar sobre agenda, compromissos, reuniões, ou horários.',
  parameters: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Número de dias à frente para buscar eventos (padrão: 7)'
      },
      max_results: {
        type: 'number',
        description: 'Máximo de eventos (padrão: 15)'
      }
    },
    required: []
  },
  execute: async (args: any): Promise<string> => {
    try {
      const calendar = getCalendar();
      const days = args.days || 7;
      const maxResults = args.max_results || 15;

      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + days);

      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = res.data.items || [];

      if (events.length === 0) {
        return `📅 Nenhum evento nos próximos ${days} dia(s).`;
      }

      const lines = events.map(event => {
        const start = event.start?.dateTime || event.start?.date || '';
        const end = event.end?.dateTime || event.end?.date || '';

        // Format dates nicely
        let timeStr: string;
        if (event.start?.dateTime) {
          const startDate = new Date(start);
          const endDate = new Date(end);
          const dateStr = startDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
          const startTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          timeStr = `${dateStr} ${startTime}–${endTime}`;
        } else {
          // All-day event
          timeStr = `${start} (dia inteiro)`;
        }

        let line = `📌 **${event.summary || '(sem título)'}**\n   ${timeStr}`;
        if (event.location) line += `\n   📍 ${event.location}`;
        if (event.description) {
          const desc = event.description.length > 100
            ? event.description.substring(0, 100) + '...'
            : event.description;
          line += `\n   📝 ${desc}`;
        }
        line += `\n   ID: ${event.id}`;
        return line;
      });

      return `📅 Agenda (próximos ${days} dias):\n\n${lines.join('\n\n')}`;
    } catch (err: any) {
      return `Erro ao listar eventos: ${err.message}`;
    }
  }
};

// ── Tool: create_event ──
export const createEventTool = {
  name: 'create_event',
  description: 'Cria um evento no Google Calendar. Use quando o usuário pedir para agendar, marcar reunião, criar compromisso.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Título do evento'
      },
      start_datetime: {
        type: 'string',
        description: 'Data/hora de início no formato ISO 8601 (ex: "2026-03-10T14:00:00-03:00") ou data para evento de dia inteiro (ex: "2026-03-10")'
      },
      end_datetime: {
        type: 'string',
        description: 'Data/hora de término (mesmo formato). Se omitido, assume 1 hora após início.'
      },
      description: {
        type: 'string',
        description: 'Descrição do evento (opcional)'
      },
      location: {
        type: 'string',
        description: 'Local do evento (opcional)'
      }
    },
    required: ['title', 'start_datetime']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const calendar = getCalendar();
      const isAllDay = !args.start_datetime.includes('T');

      let start: any;
      let end: any;

      if (isAllDay) {
        start = { date: args.start_datetime };
        end = { date: args.end_datetime || args.start_datetime };
      } else {
        const startDate = new Date(args.start_datetime);
        const endDate = args.end_datetime
          ? new Date(args.end_datetime)
          : new Date(startDate.getTime() + 60 * 60 * 1000); // +1h default

        start = { dateTime: startDate.toISOString() };
        end = { dateTime: endDate.toISOString() };
      }

      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: args.title,
          description: args.description || undefined,
          location: args.location || undefined,
          start,
          end
        }
      });

      let response = `✅ Evento criado: "${args.title}"`;
      response += `\nInício: ${args.start_datetime}`;
      if (args.location) response += `\nLocal: ${args.location}`;
      response += `\nID: ${res.data.id}`;

      return response;
    } catch (err: any) {
      return `Erro ao criar evento: ${err.message}`;
    }
  }
};

// ── Tool: delete_event ──
export const deleteEventTool = {
  name: 'delete_event',
  description: 'Remove um evento do Google Calendar. Use quando o usuário pedir para cancelar ou remover um compromisso.',
  parameters: {
    type: 'object',
    properties: {
      event_id: {
        type: 'string',
        description: 'ID do evento (obtido via list_events)'
      }
    },
    required: ['event_id']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const calendar = getCalendar();
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: args.event_id
      });
      return `🗑️ Evento removido com sucesso.`;
    } catch (err: any) {
      return `Erro ao remover evento: ${err.message}`;
    }
  }
};
