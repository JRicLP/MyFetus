import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildSignupConsents,
  getApiErrorInfo,
  getConsentLabel,
  getMissingRequired,
  parseConsentPolicy,
} from '../utils/consent';

const apiPolicy = {
  purposes: [
    { purpose: 'termos_de_uso_gestante', title: 'Termos de Uso (gestante)', kind: 'acceptance', required: true, highlighted: false, version: '0.1-rascunho', document_date: '2026-10-19', text: 'Termos' },
    { purpose: 'politica_de_privacidade', title: 'Política de Privacidade', kind: 'acknowledgment', required: true, highlighted: false, version: '0.1-rascunho', document_date: '2026-10-19', text: 'Política' },
    { purpose: 'tratamento_dados_saude', title: 'Consentimento para dados de saúde', kind: 'consent', required: true, highlighted: true, version: '0.1-rascunho', document_date: '2026-10-19', text: 'Dados' },
    { purpose: 'uso_ia', title: 'Uso opcional de IA', kind: 'consent', required: false, highlighted: false, version: '0.1-rascunho', document_date: '2026-10-19', text: 'IA' },
  ],
};

describe('consentimento no cadastro', () => {
  it('aceita a política vinda da API e rejeita formatos inválidos', () => {
    const policy = parseConsentPolicy(apiPolicy);
    assert.equal(policy?.purposes.length, 4);
    assert.equal(parseConsentPolicy({ purposes: [] }), null);
    assert.equal(parseConsentPolicy({ purposes: [{ ...apiPolicy.purposes[0], kind: 'outro' }] }), null);
    assert.equal(parseConsentPolicy(null), null);
  });

  it('usa rótulos distintos para aceite, ciência e consentimento opcional', () => {
    const [termos, politica, dados, ia] = parseConsentPolicy(apiPolicy)!.purposes;
    assert.equal(getConsentLabel(termos), 'Li e aceito os Termos de Uso (gestante)');
    assert.equal(getConsentLabel(politica), 'Declaro que li e estou ciente da Política de Privacidade');
    assert.equal(getConsentLabel(dados), 'Consentimento para dados de saúde');
    assert.equal(getConsentLabel(ia), 'Uso opcional de IA (opcional)');
  });

  it('aponta os obrigatórios faltando e não exige os opcionais', () => {
    const policy = parseConsentPolicy(apiPolicy)!;
    assert.deepEqual(getMissingRequired(policy, { termos_de_uso_gestante: true }).map((item) => item.purpose), [
      'politica_de_privacidade',
      'tratamento_dados_saude',
    ]);
    assert.deepEqual(
      getMissingRequired(policy, { termos_de_uso_gestante: true, politica_de_privacidade: true, tratamento_dados_saude: true }),
      []
    );
  });

  it('envia os obrigatórios e só os opcionais marcados, na versão vigente', () => {
    const policy = parseConsentPolicy(apiPolicy)!;
    const required = ['termos_de_uso_gestante', 'politica_de_privacidade', 'tratamento_dados_saude'];
    assert.deepEqual(buildSignupConsents(policy, {}).map((item) => item.purpose), required);
    assert.deepEqual(buildSignupConsents(policy, { uso_ia: true }).map((item) => item.purpose), [...required, 'uso_ia']);
    assert.ok(buildSignupConsents(policy, {}).every((item) => item.version === '0.1-rascunho'));
  });

  it('lê status, código e mensagem do erro da API (axios)', () => {
    const outdated = { response: { status: 409, data: { error: 'Versão desatualizada', code: 'CONSENT_VERSION_OUTDATED' } } };
    assert.deepEqual(getApiErrorInfo(outdated), { status: 409, code: 'CONSENT_VERSION_OUTDATED', message: 'Versão desatualizada' });
    assert.deepEqual(getApiErrorInfo(new Error('Network Error')), { status: null, code: null, message: null });
  });
});
