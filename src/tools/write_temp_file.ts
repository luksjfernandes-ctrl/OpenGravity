import fs from 'fs';
import path from 'path';
import os from 'os';

export const writeTempFileTool = {
  name: 'write_temp_file',
  description: 'Cria/grava um arquivo temporário no sistema. Utilizado para preencher grandes blocos de dados antes de processar no shell. Ex: gerar um txt para enviar por email no "gog" usando "--body-file".',
  parameters: {
    type: 'object',
    properties: {
      content: { 
        type: 'string', 
        description: 'O conteúdo exato (texto plain, markdown, html ou json) que irá compor o corpo do arquivo.' 
      },
      extension: {
        type: 'string',
        description: 'A extensão para o arquivo (ex: "txt", "html", "json").'
      }
    },
    required: ['content']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const ext = args.extension || 'txt';
      // Normalize extension missing dots
      const finalExt = ext.startsWith('.') ? ext : `.${ext}`;
      
      const filePath = path.join(os.tmpdir(), `agent_${Date.now()}${finalExt}`);
      
      fs.writeFileSync(filePath, args.content);
      
      return filePath;
    } catch (error: any) {
      return `Erro ao tentar escrever o arquivo no disco: ${error.message}`;
    }
  }
};
