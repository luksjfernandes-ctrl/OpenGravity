import { browseUrlTool } from './browser.js';

export const searchWebTool = {
  name: 'search_web',
  description: `Pesquisa na web usando Google e retorna os resultados. Use para encontrar informações atuais, artigos, notícias, documentação, etc.
Retorna título, URL e descrição de cada resultado.
Após obter os resultados, use 'browse_url' para ler páginas específicas de interesse.`,
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Termos de busca (ex: "editais MEC reconhecimento curso Direito 2026")'
      },
      num_results: {
        type: 'number',
        description: 'Número de resultados desejados (padrão: 5, máximo: 10)'
      }
    },
    required: ['query']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const query = encodeURIComponent(args.query);
      const numResults = Math.min(args.num_results || 5, 10);
      
      // Use browse_url to search Google and parse results
      const searchUrl = `https://www.google.com/search?q=${query}&num=${numResults}&hl=pt-BR`;
      const pageContent = await browseUrlTool.execute({ url: searchUrl });
      
      // The browser tool returns the page text content
      // Parse and format the results for the LLM
      return `🔍 Resultados para: "${args.query}"\n\n${pageContent}\n\n` +
        `💡 Use 'browse_url' com a URL de um resultado para ler o conteúdo completo.`;
    } catch (err: any) {
      return `Erro na pesquisa: ${err.message}`;
    }
  }
};
