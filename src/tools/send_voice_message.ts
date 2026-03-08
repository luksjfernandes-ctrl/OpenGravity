import { generateSpeech } from '../agent/ElevenLabs.js';
import { AgentContext } from './index.js';

export const sendVoiceMessageTool = {
  name: 'send_voice_message',
  description: 'Gera um arquivo de áudio falado a partir de um texto e envia diretamente como mensagem de voz para o usuário. Use esta ferramenta APENAS e SEMPRE que o usuário pedir expressamente para mandar áudio, falar, ou enviar mensagem de voz.',
  parameters: {
    type: 'object',
    properties: {
      text: { 
        type: 'string', 
        description: 'Texto a ser falado com a voz no áudio em português.' 
      }
    },
    required: ['text']
  },
  execute: async (args: any, context?: AgentContext): Promise<string> => {
    try {
      console.log(`Generating audio from ElevenLabs for text: "${args.text.substring(0, 30)}..."`);
      const audioBuffer = await generateSpeech(args.text);
      
      if (context && context.sendVoice) {
        await context.sendVoice(audioBuffer);
        return `Sucesso: Mensagem de voz enviada para o usuário dizendo "${args.text}". Você NÃO precisa repetir esse texto na sua resposta de texto após isso, o usuário já escutou.`;
      } else {
        return 'Erro: Função de enviar aúdio de voz (sendVoice) não injetada no contexto do agente.';
      }
    } catch (error: any) {
      return `Erro ao gerar e enviar a voz pelo ElevenLabs: ${error.message}`;
    }
  }
};
