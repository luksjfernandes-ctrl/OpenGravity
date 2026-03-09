import * as math from 'mathjs';
import QRCode from 'qrcode';
import { YoutubeTranscript } from 'youtube-transcript';
import { AgentContext } from './index.js';

// ── Tool: calculator ──
export const calculatorTool = {
  name: 'calculator',
  description: 'Calculadora avançada para resolver equações matemáticas, conversão de unidades, porcentagens, e matemática financeira. Usa mathjs.',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'A expressão matemática a resolver (ex: "5.08 cm in inch", "12% of 1024", "(1.02)^12 * 1000", "sin(45 deg) ^ 2")'
      }
    },
    required: ['expression']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const result = math.evaluate(args.expression);
      return `🧮 Resultado de "${args.expression}":\n**${math.format(result, { precision: 14 })}**`;
    } catch (err: any) {
      return `Erro ao calcular "${args.expression}": ${err.message}`;
    }
  }
};

// ── Tool: weather ──
export const weatherTool = {
  name: 'weather',
  description: 'Retorna a previsão do tempo atual e dos próximos dias para uma cidade específica.',
  parameters: {
    type: 'object',
    properties: {
      location: {
        type: 'string',
        description: 'Nome da cidade (ex: "São Paulo", "London")'
      }
    },
    required: ['location']
  },
  execute: async (args: any): Promise<string> => {
    try {
      // Using wttr.in JSON format
      const loc = encodeURIComponent(args.location);
      const res = await fetch(`https://wttr.in/${loc}?format=j1`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      
      const current = data.current_condition[0];
      const feelsLike = current.FeelsLikeC;
      const temp = current.temp_C;
      const desc = current.lang_pt?.[0]?.value || current.weatherDesc?.[0]?.value;
      
      const forecast = data.weather.slice(0, 3).map((w: any) => {
        return `- ${w.date}: máx ${w.maxtempC}°C / mín ${w.mintempC}°C`;
      });

      return `☁️ **Clima em ${args.location}:**\n` +
        `Atual: ${temp}°C (sensação: ${feelsLike}°C)\n` +
        `Condição: ${desc}\n` +
        `Umidade: ${current.humidity}%\n\n` +
        `**Previsão:**\n${forecast.join('\n')}`;
    } catch (err: any) {
      return `Erro ao obter clima para ${args.location}: ${err.message}`;
    }
  }
};

// ── Tool: wikipedia ──
export const wikipediaTool = {
  name: 'wikipedia',
  description: 'Busca o resumo de um tema na Wikipedia em Português para referências e conceitos rapidamente.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Termo a ser buscado (ex: "Inteligência Artificial", "Friedrich Nietzsche")'
      }
    },
    required: ['query']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const q = encodeURIComponent(args.query);
      const url = `https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${q}&format=json&redirects=1`;
      
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      
      const pages = data.query?.pages;
      if (!pages || Object.keys(pages)[0] === "-1") {
        return `Nenhum artigo encontrado na Wikipedia (pt) para: "${args.query}".`;
      }
      
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];
      
      const extract = page.extract.length > 2500 
        ? page.extract.substring(0, 2500) + '... [truncado]' 
        : page.extract;
        
      return `📖 **Wikipedia: ${page.title}**\n\n${extract}\n\nLink: https://pt.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`;
    } catch (err: any) {
      return `Erro ao consultar a Wikipedia: ${err.message}`;
    }
  }
};

// ── Tool: qr_code ──
export const qrCodeTool = {
  name: 'qr_code',
  description: 'Gera e envia uma imagem de QR Code para um link ou texto fornecido.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'URL ou texto a ser transformado em QR Code'
      }
    },
    required: ['content']
  },
  execute: async (args: any, context?: AgentContext): Promise<string> => {
    try {
      const buffer = await QRCode.toBuffer(args.content, { width: 400, margin: 2 });
      
      if (context?.sendPhoto) {
        await context.sendPhoto(buffer);
        return `✅ QR Code gerado e enviado com sucesso para: "${args.content}".`;
      } else {
        return `⚠️ Contexto de bot não encontrado para enviar a imagem, mas a geração local seria concluída.`;
      }
    } catch (err: any) {
      return `Erro ao gerar QR Code: ${err.message}`;
    }
  }
};

// ── Tool: text_analysis ──
export const textAnalysisTool = {
  name: 'text_analysis',
  description: 'Analisa um bloco de texto: conta palavras, caracteres, tempo estimado de leitura (TCCs, blog posts) e detecta a linguagem provável.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'O texto longo a ser analisado'
      }
    },
    required: ['text']
  },
  execute: async (args: any): Promise<string> => {
    const text = args.text || '';
    if (!text.trim()) return "Texto vazio.";
    
    const chars = text.length;
    const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
    const readingTimeMins = Math.max(1, Math.ceil(words / 220)); // Avg 220 words/min
    
    // Simplistic language heuristic
    const ptMarkers = (text.match(/que|para|com|não|como|mas|sua|ou|se/gi) || []).length;
    const enMarkers = (text.match(/that|for|with|not|how|but|your|or|if/gi) || []).length;
    const espMarkers = (text.match(/que|para|con|no|como|pero|su|o|si/gi) || []).length;
    
    let probLang = 'Desconhecida';
    if (ptMarkers > enMarkers && ptMarkers > espMarkers) probLang = 'Português';
    else if (enMarkers > ptMarkers && enMarkers > espMarkers) probLang = 'Inglês';
    else if (espMarkers > ptMarkers && espMarkers > enMarkers) probLang = 'Espanhol';
    
    return `📊 **Análise Textual:**
- Caracteres: ${chars}
- Palavras: ${words}
- Tempo Estimado de Leitura: ~${readingTimeMins} minuto(s)
- Idioma Provável: ${probLang}`;
  }
};

// ── Tool: reminder ──
export const reminderTool = {
  name: 'reminder',
  description: 'Define um lembrete rápido em memória que acionará uma notificação no Telegram após os minutos especificados (limite 120 min). Nota: Se o bot de aplicação for reiniciado, lembretes na memória podem ser perdidos.',
  parameters: {
    type: 'object',
    properties: {
      minutes: {
        type: 'number',
        description: 'Minutos até o lembrete (min 1, max 120)'
      },
      message: {
        type: 'string',
        description: 'Mensagem do lembrete'
      }
    },
    required: ['minutes', 'message']
  },
  execute: async (args: any, context?: AgentContext): Promise<string> => {
    const mins = Math.max(1, Math.min(args.minutes, 120));
    const msg = args.message;
    
    const sendText = context?.sendText;
    if (!sendText) {
      return `⚠️ Contexto de envio de mensagens indisponível, falha ao agendar lembrete.`;
    }

    // Schedule async push msg without blocking execution
    setTimeout(async () => {
      try {
        await sendText(`⏰ **LEMBRETE:**\n${msg}`);
      } catch (err: any) {
        console.error('Lembrete push failed:', err.message);
      }
    }, mins * 60 * 1000);

    return `✅ Lembrete em memória ativado para daqui a ${mins} minuto(s).`;
  }
};

// ── Tool: youtube_transcript ──
export const youtubeTranscriptTool = {
  name: 'youtube_transcript',
  description: 'Extrai a transcrição completa (legendas) de um vídeo do YouTube publicamente listado. Útil para consumir conteúdo de vídeos em segundos.',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Link ou ID do vídeo no YouTube (ex: "https://www.youtube.com/watch?v=XXXX")'
      }
    },
    required: ['url']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(args.url);
      if (!transcript || transcript.length === 0) {
        return `🚫 Não foi possível extrair a transcrição ou o vídeo não possui legendas disponíveis.`;
      }
      
      const fullText = transcript.map(t => t.text).join(' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      
      const res = fullText.length > 5000 
        ? fullText.substring(0, 5000) + '\n\n... [truncado por limite de tamanho]' 
        : fullText;
        
      return `📺 **Transcrição do YouTube (${args.url}):**\n\n${res}`;
    } catch (err: any) {
      return `Erro ao extrair transcrição: ${err.message}\nObs: Vídeos privados ou sem legendas geradas retornam erro.`;
    }
  }
};
