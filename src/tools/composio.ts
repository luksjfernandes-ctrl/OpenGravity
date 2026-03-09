import { config } from '../config.js';

const BASE_URL = 'https://backend.composio.dev/api';

function getHeaders() {
  if (!config.COMPOSIO_API_KEY) {
    throw new Error('COMPOSIO_API_KEY not configured.');
  }
  return {
    'x-api-key': config.COMPOSIO_API_KEY,
    'Content-Type': 'application/json'
  };
}

// ── Tool: composio_find_action ──
export const composioFindActionTool = {
  name: 'composio_find_action',
  description: 'Busca ações disponíveis no Composio por caso de uso. Use quando o usuário pedir para interagir com apps externos (Slack, GitHub, Jira, LinkedIn, Notion, Trello, etc.). Retorna ações disponíveis com seus nomes e parâmetros.',
  parameters: {
    type: 'object',
    properties: {
      use_case: {
        type: 'string',
        description: 'Descrição do que o usuário quer fazer (ex: "send slack message", "create jira issue", "post to linkedin")'
      },
      app_name: {
        type: 'string',
        description: 'Nome do app para filtrar (ex: "slack", "github", "jira", "notion", "trello", "linkedin"). Opcional.'
      },
      limit: {
        type: 'number',
        description: 'Máximo de resultados (padrão: 5)'
      }
    },
    required: ['use_case']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const limit = args.limit || 5;
      let url = `${BASE_URL}/v2/actions?useCase=${encodeURIComponent(args.use_case)}&limit=${limit}`;
      if (args.app_name) {
        url += `&apps=${encodeURIComponent(args.app_name.toUpperCase())}`;
      }

      const res = await fetch(url, {
        headers: getHeaders(),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) {
        const errText = await res.text();
        return `Erro Composio (${res.status}): ${errText}`;
      }

      const data = await res.json();
      const actions = data.items || data || [];

      if (!Array.isArray(actions) || actions.length === 0) {
        return `🔍 Nenhuma ação encontrada para "${args.use_case}". Tente termos em inglês.`;
      }

      const lines = actions.slice(0, limit).map((action: any) => {
        const name = action.name || action.enum || action.actionId || 'unknown';
        const displayName = action.displayName || action.display_name || name;
        const desc = action.description || '';
        const shortDesc = desc.length > 120 ? desc.substring(0, 120) + '...' : desc;

        // Extract required parameters
        const params = action.parameters?.properties
          ? Object.keys(action.parameters.properties).join(', ')
          : 'nenhum';

        return `🔧 **${displayName}**\n   Action: \`${name}\`\n   ${shortDesc}\n   Params: ${params}`;
      });

      return `🔍 Ações Composio para "${args.use_case}" (${lines.length}):\n\n${lines.join('\n\n')}\n\n` +
        `💡 Use composio_execute com o nome da ação e os parâmetros necessários.`;
    } catch (err: any) {
      return `Erro ao buscar ações: ${err.message}`;
    }
  }
};

// ── Tool: composio_execute ──
export const composioExecuteTool = {
  name: 'composio_execute',
  description: `Executa uma ação no Composio (Slack, GitHub, Jira, LinkedIn, Notion, etc.). PROTOCOLO DE SEGURANÇA: Sempre chame PRIMEIRO sem 'confirmed' para gerar preview da ação. Mostre ao usuário e peça confirmação. Só então chame com confirmed=true.`,
  parameters: {
    type: 'object',
    properties: {
      action_name: {
        type: 'string',
        description: 'Nome da ação a executar (obtido via composio_find_action, ex: "SLACK_SEND_MESSAGE", "GITHUB_CREATE_ISSUE")'
      },
      params: {
        type: 'object',
        description: 'Parâmetros da ação (variam por ação — consulte composio_find_action para saber quais são)'
      },
      entity_id: {
        type: 'string',
        description: 'ID da entidade/usuário (padrão: "default")'
      },
      confirmed: {
        type: 'boolean',
        description: 'Se true, executa de fato. Se false/omitido, retorna preview para aprovação.'
      }
    },
    required: ['action_name', 'params']
  },
  execute: async (args: any): Promise<string> => {
    try {
      // ── CONFIRMATION GATE ──
      if (!args.confirmed) {
        const paramsPreview = JSON.stringify(args.params, null, 2);
        return `⚠️ PREVIEW DA AÇÃO COMPOSIO (não executada ainda):\n\n` +
          `🔧 Ação: ${args.action_name}\n` +
          `📋 Parâmetros:\n${paramsPreview}\n\n` +
          `🔒 Mostre ao usuário e peça confirmação. Se confirmado, chame composio_execute com confirmed=true.`;
      }

      const entityId = args.entity_id || 'default';
      const url = `${BASE_URL}/v1/actions/${encodeURIComponent(args.action_name)}/execute`;

      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          entityId,
          input: args.params
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) {
        const errText = await res.text();

        // Handle OAuth authorization needed
        if (res.status === 401 || errText.includes('auth') || errText.includes('connect')) {
          return `🔑 Autorização necessária para esta ação.\n` +
            `Acesse https://app.composio.dev para conectar o app e tente novamente.`;
        }

        return `Erro Composio (${res.status}): ${errText}`;
      }

      const result = await res.json();

      // Format result
      const resultStr = typeof result === 'string'
        ? result
        : JSON.stringify(result.data || result, null, 2);

      const truncated = resultStr.length > 3000
        ? resultStr.substring(0, 3000) + '\n\n... [truncado]'
        : resultStr;

      return `✅ Ação executada: ${args.action_name}\n\nResultado:\n${truncated}`;
    } catch (err: any) {
      return `Erro ao executar ação: ${err.message}`;
    }
  }
};

/**
 * Check if Composio is configured.
 */
export function isComposioConfigured(): boolean {
  return !!config.COMPOSIO_API_KEY;
}
