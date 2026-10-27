import { api } from '../utils/apiClient';
import { PregnantDocument, DocumentExtractedTextResponse } from '../types/api.types';

export const documentService = {
  // busca a lista de exames exigindo o ID da gestante
  getDocuments: async (pregnantId: number): Promise<PregnantDocument[]> => {
    const response = await api.get<PregnantDocument[]>('/documents', {
      params: { pregnant_id: pregnantId },
    });
    return response.data;
  },

  // busca o texto que foi extraído (OCR) do exame
  getExtractedText: async (documentId: number): Promise<DocumentExtractedTextResponse> => {
    const response = await api.get<DocumentExtractedTextResponse>(`/documents/${documentId}/extracted-text`);
    return response.data;
  },
  
  // e  nvia a devolutiva (relatório) do médico sobre o exame
  updateDocumentReport: async (documentId: number, comment: string): Promise<{ message: string; document: PregnantDocument }> => {
    const response = await api.patch<{ message: string; document: PregnantDocument }>(`/documents/${documentId}/report`, {
      report_comment: comment,
    });
    return response.data;
  }
};