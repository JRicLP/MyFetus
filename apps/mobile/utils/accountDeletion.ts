/**
 * Exclusão da conta pelo titular (E7-02).
 *
 * Regras puras do cartão "Excluir minha conta": a palavra de confirmação, o
 * texto do que acontece em cada perfil e as mensagens de erro da API
 * (POST /privacy/delete). Senha errada chega como 403 INVALID_PASSWORD.
 */
import { getApiErrorInfo } from './consent';

export const DELETION_CONFIRMATION = 'EXCLUIR';

export const DELETION_GENERIC_ERROR = 'Não foi possível excluir sua conta agora. Tente novamente mais tarde.';

export type DeletionRole = 'gestante' | 'medico' | 'admin';

// A palavra precisa ser digitada exatamente; espaços nas pontas são ignorados.
export function isDeletionConfirmed(text: string): boolean {
  return text.trim() === DELETION_CONFIRMATION;
}

export function canSelfDelete(role: string): boolean {
  return role === 'gestante' || role === 'medico';
}

export function getDeletionDescription(role: string): string[] {
  if (role === 'gestante') {
    return [
      'Apaga sua conta, o prontuário, as gestações, os exames e os arquivos enviados. Não dá para desfazer.',
      'Antes, exporte seus dados acima se quiser guardar uma cópia.',
    ];
  }
  if (role === 'medico') {
    return [
      'Sua conta é desativada e seus dados pessoais (nome, e-mail, CRM e telefone) são apagados. Não dá para desfazer.',
      'Os pedidos de exame e laudos que você fez continuam no prontuário das pacientes, sem o seu nome.',
    ];
  }
  return ['A exclusão de conta de administrador é feita pela equipe do projeto.'];
}

export const DELETION_RETENTION_NOTE =
  'Seus aceites de termos e o registro de auditoria ficam guardados até o fim do projeto. Cópias de segurança são apagadas quando expiram.';

export function getDeletionErrorMessage(error: unknown): string {
  const info = getApiErrorInfo(error);
  if (info.code === 'INVALID_PASSWORD') return 'Senha incorreta. Confira e tente novamente.';
  if (info.code === 'PASSWORD_REQUIRED') return 'Digite sua senha para confirmar a exclusão.';
  if (info.code === 'CONFIRMATION_REQUIRED') return `Digite ${DELETION_CONFIRMATION} para confirmar.`;
  if (info.code === 'ACCOUNT_DELETION_NOT_SELF_SERVICE') return 'A exclusão desta conta é feita pela equipe do projeto.';
  if (info.status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (info.status === 429) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (info.status === null) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  return DELETION_GENERIC_ERROR;
}
