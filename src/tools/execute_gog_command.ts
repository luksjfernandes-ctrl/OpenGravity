import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const executeGogCommandTool = {
  name: 'execute_gog_command',
  description: `Executa comandos da CLI 'gog' integrando o agente aos serviços Google Workspace.
  
REGRAS CRÍTICAS DE SINTAXE E USO (PROTOCOLO ISS):
1. COMANDOS DE MUTAÇÃO ('send', 'create', 'update', 'clear') DEVEM ter permissão prévia do usuário.
2. Comandos DISPONÍVEIS EXATOS:
   - Agenda (Eventos da Semana): gog calendar events primary --from 2024-05-01T00:00:00Z --to 2024-05-08T00:00:00Z --json
   - Agenda (Criar Evento): gog calendar create primary --summary "Ex" --from 2024-05-01T10:00:00Z --to 2024-05-01T11:00:00Z
   - Gmail (Consultar Inbox): gog gmail messages search "in:inbox" --max 10 --json
   - Gmail (Enviar Simples): gog gmail send --to x@x.com --subject "Oi" --body "Texto"
3. JAMAIS invente flags que não existem (ex: '--time-min', '--calenderid'). Sempre use flags '--from' e '--to' de Data ISO8601, e 'primary' para agenda principal.
4. Para listar eventos da agenda, NUNCA use 'gog calendar list', use SEMPRE 'gog calendar events primary --from [DataISO] --to [DataISO] --json'.
5. JAMAIS use chaves ou aspas erradas que quebrem o shell.
6. Todos comandos devem iniciar exatamente com 'gog '.`,
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
