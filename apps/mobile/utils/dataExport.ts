/**
 * Exportação dos dados do titular (E7-02.1).
 *
 * Regras puras da tela "Meus dados": nome do arquivo, mensagens de erro da API
 * (POST /privacy/export) e resumo do que veio no arquivo. Senha errada chega
 * como 403 INVALID_PASSWORD; 401 continua sendo sessão expirada.
 */
import { getApiErrorInfo } from './consent';

export type DataExport = {
  formato: { nome: string; versao: string };
  gerado_em: string;
  titular: { id: number; name: string; role: string };
  [section: string]: unknown;
};

export type ExportSectionCount = {
  label: string;
  count: number;
};

const SECTION_LABELS: Record<string, string> = {
  consentimentos: 'Consentimentos',
  gestacoes: 'Gestações',
  eventos: 'Eventos da gestação',
  biometria_fetal: 'Medidas do bebê',
  peso_materno: 'Registros de peso',
  pedidos_de_exame: 'Pedidos de exame',
  documentos: 'Documentos de exames',
  vinculos_medicos: 'Vínculos com médicos',
};

export function parseDataExport(data: unknown): DataExport | null {
  const value = data as Partial<DataExport> | null;
  if (
    !value ||
    typeof value.gerado_em !== 'string' ||
    typeof value.formato?.versao !== 'string' ||
    typeof value.titular?.id !== 'number'
  ) {
    return null;
  }
  return value as DataExport;
}

export function exportFileName(generatedAt: string): string {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(generatedAt)?.[0] || 'arquivo';
  return `myfetus-meus-dados-${day}.json`;
}

// Só as seções em lista e com rótulo conhecido aparecem no resumo da tela.
export function summarizeExport(data: DataExport): ExportSectionCount[] {
  return Object.entries(SECTION_LABELS)
    .filter(([key]) => Array.isArray(data[key]))
    .map(([key, label]) => ({ label, count: (data[key] as unknown[]).length }));
}

export const EXPORT_GENERIC_ERROR = 'Não foi possível exportar seus dados agora. Tente novamente mais tarde.';

export function getExportErrorMessage(error: unknown): string {
  const info = getApiErrorInfo(error);
  if (info.code === 'INVALID_PASSWORD') return 'Senha incorreta. Confira e tente novamente.';
  if (info.code === 'PASSWORD_REQUIRED') return 'Digite sua senha para confirmar a exportação.';
  if (info.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (info.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (info.status === null) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return EXPORT_GENERIC_ERROR;
}
