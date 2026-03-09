import { getCurrentTimeTool } from './get_current_time.js';
import { sendVoiceMessageTool } from './send_voice_message.js';
import { executeGogCommandTool } from './execute_gog_command.js';
import { writeTempFileTool } from './write_temp_file.js';
import {
  browseUrlTool,
  browserClickTool,
  browserTypeTool,
  browserSnapshotTool,
  browserCloseTool
} from './browser.js';

export const tools = [
  getCurrentTimeTool,
  sendVoiceMessageTool,
  browseUrlTool,
  browserClickTool,
  browserTypeTool,
  browserSnapshotTool,
  browserCloseTool,
  // executeGogCommandTool, // Only for local (needs gog CLI)
  // writeTempFileTool,
];

export type AgentContext = {
  sendVoice?: (buffer: Buffer) => Promise<void>;
};

type ToolDefinition = {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any, context?: AgentContext) => Promise<string>;
};

export const toolsMap = new Map<string, ToolDefinition>();
for (const tool of tools) {
  toolsMap.set(tool.name, tool as unknown as ToolDefinition);
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
