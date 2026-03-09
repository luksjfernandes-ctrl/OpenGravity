import { db } from '../db.js';

const TASKS_COLLECTION = 'tasks';

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'alta' | 'media' | 'baixa';
  status: 'pendente' | 'concluida';
  createdAt: Date;
  completedAt?: Date;
}

// ── Tool: create_task ──
export const createTaskTool = {
  name: 'create_task',
  description: 'Cria uma nova tarefa/lembrete para o usuário. Use quando o usuário pedir para lembrar, anotar, ou criar uma tarefa.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Título curto e descritivo da tarefa (ex: "Revisar PPC de Administração")'
      },
      description: {
        type: 'string',
        description: 'Detalhes adicionais da tarefa (opcional)'
      },
      due_date: {
        type: 'string',
        description: 'Data limite no formato YYYY-MM-DD (ex: "2026-03-15"). Opcional.'
      },
      priority: {
        type: 'string',
        enum: ['alta', 'media', 'baixa'],
        description: 'Prioridade da tarefa (padrão: media)'
      }
    },
    required: ['title']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const task: Task = {
        title: args.title,
        description: args.description || null,
        dueDate: args.due_date || null,
        priority: args.priority || 'media',
        status: 'pendente',
        createdAt: new Date(),
      };

      const docRef = await db.collection(TASKS_COLLECTION).add(task);
      
      let response = `✅ Tarefa criada: "${task.title}"`;
      if (task.dueDate) response += `\nPrazo: ${task.dueDate}`;
      if (task.priority !== 'media') response += `\nPrioridade: ${task.priority}`;
      response += `\nID: ${docRef.id}`;
      
      return response;
    } catch (err: any) {
      return `Erro ao criar tarefa: ${err.message}`;
    }
  }
};

// ── Tool: list_tasks ──
export const listTasksTool = {
  name: 'list_tasks',
  description: 'Lista as tarefas do usuário. Use quando o usuário perguntar sobre suas tarefas, pendências, ou o que precisa fazer.',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: ['pendente', 'concluida', 'todas'],
        description: 'Filtrar por status (padrão: pendente)'
      },
      priority: {
        type: 'string',
        enum: ['alta', 'media', 'baixa'],
        description: 'Filtrar por prioridade (opcional)'
      }
    },
    required: []
  },
  execute: async (args: any): Promise<string> => {
    try {
      const status = args.status || 'pendente';
      let query: FirebaseFirestore.Query = db.collection(TASKS_COLLECTION);
      
      if (status !== 'todas') {
        query = query.where('status', '==', status);
      }
      if (args.priority) {
        query = query.where('priority', '==', args.priority);
      }
      
      query = query.orderBy('createdAt', 'desc');
      const snapshot = await query.get();

      if (snapshot.empty) {
        return status === 'pendente' 
          ? '📋 Nenhuma tarefa pendente. Tudo em dia!' 
          : `📋 Nenhuma tarefa encontrada com filtro: ${status}.`;
      }

      const now = new Date();
      const lines = snapshot.docs.map(doc => {
        const t = doc.data() as Task;
        const emoji = t.priority === 'alta' ? '🔴' : t.priority === 'media' ? '🟡' : '🟢';
        const statusEmoji = t.status === 'concluida' ? '✅' : '⬜';
        
        let line = `${statusEmoji} ${emoji} ${t.title}`;
        
        if (t.dueDate) {
          const due = new Date(t.dueDate);
          if (due < now && t.status === 'pendente') {
            line += ` ⚠️ ATRASADA (era ${t.dueDate})`;
          } else {
            line += ` (até ${t.dueDate})`;
          }
        }
        
        if (t.description) line += `\n   📝 ${t.description}`;
        line += `\n   ID: ${doc.id}`;
        
        return line;
      });

      const header = status === 'pendente' ? '📋 Tarefas Pendentes' : `📋 Tarefas (${status})`;
      return `${header}:\n\n${lines.join('\n\n')}`;
    } catch (err: any) {
      return `Erro ao listar tarefas: ${err.message}`;
    }
  }
};

// ── Tool: complete_task ──
export const completeTaskTool = {
  name: 'complete_task',
  description: 'Marca uma tarefa como concluída. Use quando o usuário disser que terminou/completou uma tarefa.',
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'ID da tarefa a ser concluída'
      },
      title_search: {
        type: 'string',
        description: 'Alternativa ao ID: busca pelo título da tarefa (parcial, case-insensitive)'
      }
    },
    required: []
  },
  execute: async (args: any): Promise<string> => {
    try {
      let docRef: FirebaseFirestore.DocumentReference | null = null;
      let taskTitle = '';

      if (args.task_id) {
        docRef = db.collection(TASKS_COLLECTION).doc(args.task_id);
        const doc = await docRef.get();
        if (!doc.exists) return `Tarefa com ID "${args.task_id}" não encontrada.`;
        taskTitle = (doc.data() as Task).title;
      } else if (args.title_search) {
        // Search by title
        const snapshot = await db.collection(TASKS_COLLECTION)
          .where('status', '==', 'pendente')
          .get();
        
        const match = snapshot.docs.find(doc => {
          const t = doc.data() as Task;
          return t.title.toLowerCase().includes(args.title_search.toLowerCase());
        });

        if (!match) return `Nenhuma tarefa pendente contendo "${args.title_search}" encontrada.`;
        docRef = match.ref;
        taskTitle = (match.data() as Task).title;
      } else {
        return 'Informe o task_id ou title_search para identificar a tarefa.';
      }

      await docRef.update({
        status: 'concluida',
        completedAt: new Date()
      });

      return `✅ Tarefa concluída: "${taskTitle}"`;
    } catch (err: any) {
      return `Erro ao concluir tarefa: ${err.message}`;
    }
  }
};

// ── Tool: delete_task ──
export const deleteTaskTool = {
  name: 'delete_task',
  description: `Remove uma tarefa permanentemente. PROTOCOLO DE SEGURANÇA: Sempre chame PRIMEIRO sem 'confirmed' para mostrar qual tarefa será removida. Peça confirmação. Só então chame com confirmed=true.`,
  parameters: {
    type: 'object',
    properties: {
      task_id: {
        type: 'string',
        description: 'ID da tarefa a ser removida'
      },
      confirmed: {
        type: 'boolean',
        description: 'Se true, remove de fato. Se false/omitido, mostra preview.'
      }
    },
    required: ['task_id']
  },
  execute: async (args: any): Promise<string> => {
    try {
      const docRef = db.collection(TASKS_COLLECTION).doc(args.task_id);
      const doc = await docRef.get();
      if (!doc.exists) return `Tarefa com ID "${args.task_id}" não encontrada.`;
      
      const title = (doc.data() as Task).title;

      if (!args.confirmed) {
        return `⚠️ PREVIEW DE REMOÇÃO (não removida ainda):\n\n` +
          `📌 "${title}"\nID: ${args.task_id}\n\n` +
          `🔒 Mostre ao usuário e peça confirmação. Se confirmado, chame delete_task com confirmed=true.`;
      }

      await docRef.delete();
      return `🗑️ Tarefa removida: "${title}"`;
    } catch (err: any) {
      return `Erro ao remover tarefa: ${err.message}`;
    }
  }
};
