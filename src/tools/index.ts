import { getCurrentTimeTool } from './get_current_time.js';
import { sendVoiceMessageTool } from './send_voice_message.js';
import { executeGogCommandTool } from './execute_gog_command.js';
import { writeTempFileTool } from './write_temp_file.js';
import { searchWebTool } from './search_web.js';
import {
  createTaskTool,
  listTasksTool,
  completeTaskTool,
  deleteTaskTool
} from './tasks.js';
import {
  browseUrlTool,
  browserClickTool,
  browserTypeTool,
  browserSnapshotTool,
  browserCloseTool
} from './browser.js';
import {
  listEmailsTool,
  readEmailTool,
  sendEmailTool,
  searchEmailsTool
} from './gmail.js';
import {
  listEventsTool,
  createEventTool,
  deleteEventTool
} from './calendar.js';
import {
  listDriveFilesTool,
  searchDriveTool,
  readDriveFileTool
} from './drive.js';
import {
  readGoogleDocTool,
  createGoogleDocTool
} from './docs.js';
import { isGoogleConfigured } from './google_auth.js';

export const tools = [
  getCurrentTimeTool,
  sendVoiceMessageTool,
  searchWebTool,
  createTaskTool,
  listTasksTool,
  completeTaskTool,
  deleteTaskTool,
  browseUrlTool,
  browserClickTool,
  browserTypeTool,
  browserSnapshotTool,
  browserCloseTool,
  // executeGogCommandTool, // Only for local (needs gog CLI)
  // writeTempFileTool,
];

// Google tools — only register if OAuth2 is configured
const googleTools = [
  listEmailsTool,
  readEmailTool,
  sendEmailTool,
  searchEmailsTool,
  listEventsTool,
  createEventTool,
  deleteEventTool,
  listDriveFilesTool,
  searchDriveTool,
  readDriveFileTool,
  readGoogleDocTool,
  createGoogleDocTool,
];

if (isGoogleConfigured()) {
  tools.push(...googleTools as any[]);
  console.log(`🔗 Google tools habilitadas (${googleTools.length} tools)`);
} else {
  console.warn('⚠️ Google OAuth2 não configurado — Google tools desabilitadas.');
}

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
