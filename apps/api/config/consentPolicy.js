/**
 * Política de consentimento (E7-01.1, issue #143).
 *
 * Fonte única das finalidades, da versão vigente de cada documento e do texto
 * exibido no cadastro. Alterar `version` faz todo aceite anterior daquela
 * finalidade ficar desatualizado (novo aceite exigido).
 *
 * Decisões da gestão (19/10/2026):
 *   - Aceite dos Termos de Uso separado da ciência da Política de Privacidade.
 *   - Consentimento específico e destacado para tratamento de dados de saúde.
 *   - Pesquisa/usabilidade e uso de IA com autorização própria e opcional.
 *   - Médicos aceitam termos do próprio perfil; isso não substitui a
 *     autorização da gestante sobre os dados dela.
 *
 * RASCUNHO: textos e versões aguardam revisão da gestão/orientação jurídica
 * (ver docs/lgpd/consentimento.md).
 */
const fs = require('fs');
const path = require('path');

// accepted: aceite/ciência/consentimento dado; refused: recusado; revoked: consentimento revogado.
const CONSENT_DECISIONS = Object.freeze(['accepted', 'refused', 'revoked']);

// acceptance = aceite de termos; acknowledgment = ciência (não é consentimento); consent = consentimento.
const CONSENT_KINDS = Object.freeze({
  acceptance: Object.freeze(['accepted', 'refused']),
  acknowledgment: Object.freeze(['accepted']),
  consent: Object.freeze(['accepted', 'refused', 'revoked']),
});

const DOCUMENT_DATE = '2026-10-19';

function readLegalDocument(fileName) {
  return fs.readFileSync(path.join(__dirname, '..', 'legal', fileName), 'utf8');
}

const CONSENT_PURPOSES = Object.freeze({
  termos_de_uso_gestante: Object.freeze({
    title: 'Termos de Uso (gestante)',
    kind: 'acceptance',
    roles: Object.freeze(['gestante']),
    required: true,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text: readLegalDocument('termos-de-uso-gestante.md'),
  }),
  termos_de_uso_medico: Object.freeze({
    title: 'Termos de Uso (profissional de saúde)',
    kind: 'acceptance',
    roles: Object.freeze(['medico']),
    required: true,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text: readLegalDocument('termos-de-uso-medico.md'),
  }),
  politica_de_privacidade: Object.freeze({
    title: 'Política de Privacidade',
    kind: 'acknowledgment',
    roles: Object.freeze(['gestante', 'medico']),
    required: true,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text: readLegalDocument('politica-de-privacidade.md'),
  }),
  tratamento_dados_saude: Object.freeze({
    title: 'Consentimento para tratamento dos meus dados de saúde',
    kind: 'consent',
    roles: Object.freeze(['gestante']),
    required: true,
    highlighted: true,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text:
      'Autorizo o tratamento dos meus dados de saúde (informações da gestação, sinais clínicos, medidas e documentos de exames) ' +
      'para o acompanhamento da minha gestação no MyFetus, inclusive o acesso do médico que eu vincular. ' +
      'Posso revogar esta autorização a qualquer momento; a revogação interrompe o tratamento baseado nela e restringe apenas as funcionalidades que dependem dela.',
  }),
  uso_ia: Object.freeze({
    title: 'Uso opcional de inteligência artificial',
    kind: 'consent',
    roles: Object.freeze(['gestante']),
    required: false,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text:
      'Autorizo, de forma opcional, que minhas perguntas e, quando necessário, informações da minha gestação sejam processadas pelo serviço de inteligência artificial (Google Gemini) ' +
      'para gerar respostas de apoio. Sem esta autorização, as demais funcionalidades continuam disponíveis.',
  }),
  pesquisa_usabilidade: Object.freeze({
    title: 'Participação opcional em pesquisa e avaliação de usabilidade',
    kind: 'consent',
    roles: Object.freeze(['gestante', 'medico']),
    required: false,
    version: '0.1-rascunho',
    documentDate: DOCUMENT_DATE,
    text:
      'Autorizo, de forma opcional, ser convidado(a) e participar de avaliações de usabilidade e de pesquisa do projeto. ' +
      'Sem esta autorização, as demais funcionalidades continuam disponíveis.',
  }),
});

// Papéis que precisam ter as finalidades obrigatórias vigentes. Admin: decisão pendente.
const CONSENT_REQUIRED_ROLES = Object.freeze(['gestante', 'medico']);

function getPurpose(purpose) {
  return Object.prototype.hasOwnProperty.call(CONSENT_PURPOSES, purpose)
    ? CONSENT_PURPOSES[purpose]
    : null;
}

function getPurposesForRole(role) {
  return Object.entries(CONSENT_PURPOSES)
    .filter(([, config]) => config.roles.includes(role))
    .map(([purpose, config]) => ({ purpose, ...config }));
}

function getRequiredPurposes(role) {
  return getPurposesForRole(role)
    .filter((item) => item.required)
    .map(({ purpose, version }) => ({ purpose, version }));
}

module.exports = {
  CONSENT_DECISIONS,
  CONSENT_KINDS,
  CONSENT_PURPOSES,
  CONSENT_REQUIRED_ROLES,
  getPurpose,
  getPurposesForRole,
  getRequiredPurposes,
};
