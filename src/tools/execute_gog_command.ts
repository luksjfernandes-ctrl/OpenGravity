import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const executeGogCommandTool = {
  name: 'execute_gog_command',
  description: `Executa comandos da CLI 'gog' integrando o agente aos serviços Google Workspace (Gmail, Calendar, Drive, Docs, Sheets, Contacts).
  
REGRAS CRÍTICAS (PROTOCOLO ISS):
1. COMANDOS DE MUTAÇÃO SÃO PERIGOSOS (ex: 'send', 'create', 'update', 'append', 'clear', 'drafts send'). Você DEVE OBTER a confirmação expressa do usuário ANTES de rodar um comando mutacional usando a ferramenta de mensagem (ou ditar por voz) para pedir "Confirma o envio?".
2. Apenas execute mutações de fato SE E SOMENTE SE o usuário acabou de dizer explicitamente "Sim, confirme", "Sim", "Pode enviar" na última mensagem!
3. Comandos de LEITURA (ex: 'search', 'list', 'get', 'cat') PODEM E DEVEM ser executados silenciosa e autonomamente para você compreender o mundo e formular sua resposta.
4. Ao montar emails com quebras de linha/html, use um processo onde você primeiro salva um arquivo via tool de write e depois usa \`--body-file\`, caso haja complexidade de escapar aspas. Para textos simples de uma linha, não precisa.
5. Sempre forneça o comando exato em formato \`gog ...\``,
  parameters: {
    type: 'object',
    properties: {
      command: { 
        type: 'string', 
        description: `O comando gog completo a executar (e.g., "gog gmail search 'newer_than:1d' --json"). Não inclua prefíxos que não sejam 'gog '. Tente usar '--json' quando aplicável para ter respostas processáveis.` 
      }
    },
    required: ['command']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const { command } = args;
      if (!command.trim().startsWith('gog ')) {
        return 'Erro: O comando deve começar obrigatoriamente com "gog "';
      }
      
      console.log(`Executing gog command: ${command}`);
      
      // Execute the command directly through bash
      const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 * 5 }); // 5MB buffer just in case
      
      if (stderr && stderr.trim() !== '') {
        console.warn(`gog (stderr):`, stderr);
      }
      
      return stdout || stderr || 'Comando executado com sucesso sem output visível.';
    } catch (error: any) {
      console.error(`Erro na execução do gog: ${error.message}`);
      return `Erro ao executar comando gog: ${error.message}\nStderr: ${error.stderr || ''}`;
    }
  }
};
