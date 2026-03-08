import { chatCompletion, Message } from './LLMProvider.js';
import { toolsMap, toolDefinitions, AgentContext } from '../tools/index.js';
import { saveMessage, getRecentMessages } from '../db.js';

const MAX_ITERATIONS = 5;

export async function processUserMessage(userId: string, text: string, contextCallbacks?: AgentContext): Promise<string> {
  // Save user message to memory
  await saveMessage({
    userId,
    role: 'user',
    content: text
  });

  // Fetch recent memory context
  const rawHistory = await getRecentMessages(userId, 20);
  const messages: Message[] = [
    {
      role: 'system',
      content: 'Você é OpenGravity. Um solucionador de problemas pessoal e autônomo. Pense passo a passo. Use ferramentas quando necessário. Comunique-se estritamente em Português.'
    }
  ];

  for (const row of rawHistory) {
    messages.push({
      role: row.role as any,
      content: row.content,
      tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      tool_call_id: row.tool_call_id || undefined
    });
  }

  // Agent iteration loop
  let iteration = 0;
  while (iteration < MAX_ITERATIONS) {
    iteration++;
    const responseMessage = await chatCompletion(messages, toolDefinitions);
    
    // Add assistant's response to memory and context
    messages.push({
      role: 'assistant',
      content: responseMessage.content,
      tool_calls: responseMessage.tool_calls
    });

    await saveMessage({
      userId,
      role: 'assistant',
      content: responseMessage.content || null,
      toolCalls: responseMessage.tool_calls ? JSON.stringify(responseMessage.tool_calls) : null
    });

    // Check if tool calls exist
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const call of responseMessage.tool_calls) {
        let toolResponseStr = '';
        try {
          // It's possible for LLM to send stringified args
          const args = typeof call.function.arguments === 'string' 
            ? JSON.parse(call.function.arguments) 
            : call.function.arguments;
            
          const toolName = call.function.name;
          const tool = toolsMap.get(toolName);
          
          if (!tool) {
            toolResponseStr = `Tool ${toolName} not found.`;
          } else {
            console.log(`Executing tool: ${toolName} with args:`, args);
            // Wait for tool execution
            toolResponseStr = await tool.execute(args, contextCallbacks);
          }
        } catch (e: any) {
          toolResponseStr = `Error executing tool: ${e.message}`;
        }

        // Add tool result to messages and history
        messages.push({
          role: 'tool',
          content: toolResponseStr,
          tool_call_id: call.id
        });

        await saveMessage({
          userId,
          role: 'tool',
          content: toolResponseStr,
          toolCallId: call.id
        });
      }
      // Loop repeats to call LLM again with tool result
      continue;
    }

    // No tool calls, return final content
    return responseMessage.content || "Sem resposta";
  }

  return "Limite de iterações atingido.";
}
