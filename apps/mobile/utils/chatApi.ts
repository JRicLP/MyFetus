import { apiUrl, fetchWithAuth } from './api';

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
  const response = await fetchWithAuth(apiUrl('/api/internal/rag/chat'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || 'Falha ao consultar o assistente clínico.');
  }

  const data = await response.json();
  return { resposta: data.resposta, fontes: data.fontes || [] };
}
