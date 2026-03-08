export const getCurrentTimeTool = {
  name: 'get_current_time',
  description: 'Gets the current local time of the server.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  execute: async (): Promise<string> => {
    return new Date().toISOString();
  }
};
