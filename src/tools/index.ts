import { getCurrentTimeTool } from './get_current_time.js';

export const tools = [
  getCurrentTimeTool
];

type ToolDefinition = {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<string>;
};

export const toolsMap = new Map<string, ToolDefinition>();
for (const tool of tools) {
  toolsMap.set(tool.name, tool);
}

// Convert tools to format expected by Groq/OpenAI
export const toolDefinitions = tools.map((t) => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }
}));
