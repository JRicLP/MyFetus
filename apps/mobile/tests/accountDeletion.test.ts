import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DELETION_GENERIC_ERROR,
  canSelfDelete,
  getDeletionDescription,
  getDeletionErrorMessage,
  isDeletionConfirmed,
} from '../utils/accountDeletion';

const apiError = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

describe('exclusão da conta (Meus dados)', () => {
  it('só confirma com a palavra EXCLUIR exata', () => {
    assert.equal(isDeletionConfirmed('EXCLUIR'), true);
    assert.equal(isDeletionConfirmed('  EXCLUIR '), true);
    assert.equal(isDeletionConfirmed('excluir'), false);
    assert.equal(isDeletionConfirmed('EXCLUI'), false);
    assert.equal(isDeletionConfirmed(''), false);
  });

  it('gestante e médico excluem pelo app; administrador não', () => {
    assert.equal(canSelfDelete('gestante'), true);
    assert.equal(canSelfDelete('medico'), true);
    assert.equal(canSelfDelete('admin'), false);
  });

  it('explica o que acontece em cada perfil', () => {
    assert.match(getDeletionDescription('gestante').join(' '), /prontuário.*Não dá para desfazer/);
    assert.match(getDeletionDescription('gestante').join(' '), /exporte seus dados/);
    assert.match(getDeletionDescription('medico').join(' '), /desativada.*laudos.*sem o seu nome/s);
    assert.match(getDeletionDescription('admin').join(' '), /equipe do projeto/);
  });

  it('senha errada (403) não é tratada como sessão expirada (401)', () => {
    assert.equal(getDeletionErrorMessage(apiError(403, { code: 'INVALID_PASSWORD' })), 'Senha incorreta. Confira e tente novamente.');
    assert.equal(getDeletionErrorMessage(apiError(401)), 'Sua sessão expirou. Entre novamente.');
  });

  it('traduz confirmação ausente, perfil sem autoatendimento, limite e erro interno', () => {
    assert.equal(getDeletionErrorMessage(apiError(400, { code: 'CONFIRMATION_REQUIRED' })), 'Digite EXCLUIR para confirmar.');
    assert.match(getDeletionErrorMessage(apiError(403, { code: 'ACCOUNT_DELETION_NOT_SELF_SERVICE' })), /equipe do projeto/);
    assert.match(getDeletionErrorMessage(apiError(429)), /Muitas tentativas/);
    assert.match(getDeletionErrorMessage(new Error('Network Error')), /Sem conexão/);
    assert.equal(getDeletionErrorMessage(apiError(500)), DELETION_GENERIC_ERROR);
  });
});
