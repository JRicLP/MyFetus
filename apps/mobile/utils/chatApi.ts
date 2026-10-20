import { api } from './apiClient';

export interface ChatFonte {
  fonte: string;
  secao?: string;
  relevancia: number;
}

export interface ChatResponse {
  resposta: string;
  fontes: ChatFonte[];
}

/**
 * Envia a pergunta da paciente para o chat clínico (retrieval + geração via Gemini)
 * em POST /api/internal/rag/chat.
 */
export async function askClinicalChat(query: string): Promise<ChatResponse> {
  const response = await api.post('/internal/rag/chat', { query });
  const data = response.data;
  return { resposta: data.resposta, fontes: data.fontes || [] };
}
