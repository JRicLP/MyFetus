/**
 * Consentimento versionado (E7-01.1).
 *
 * Cada aceite, recusa ou revogação é um novo registro em `consents`; o estado
 * de uma finalidade é sempre o registro mais recente do usuário. Os registros
 * ficam protegidos contra alteração durante o período de retenção (ver
 * migration_consents.sql e scripts/consent-retention.js).
 *
 * Funções recebem o cliente do banco para permitir uso dentro de transações.
 */
const {
  CONSENT_DECISIONS,
  CONSENT_KINDS,
  CONSENT_PURPOSES,
  CONSENT_REQUIRED_ROLES,
  getPurpose,
  getPurposesForRole,
  getRequiredPurposes,
} = require('../config/consentPolicy');

class ConsentValidationError extends Error {
  constructor(message, { status = 400, code = 'CONSENT_INVALID' } = {}) {
    super(message);
    this.name = 'ConsentValidationError';
    this.status = status;
    this.code = code;
  }
}

const outdatedVersionError = () => new ConsentValidationError(
  'Versão do documento desatualizada; recarregue a versão vigente',
  { status: 409, code: 'CONSENT_VERSION_OUTDATED' }
);

function describePurpose(purpose, config) {
  return {
    purpose,
    title: config.title,
    kind: config.kind,
    roles: [...config.roles],
    required: config.required,
    highlighted: Boolean(config.highlighted),
    version: config.version,
    document_date: config.documentDate,
    text: config.text,
  };
}

function getPolicy(role) {
  const entries = role
    ? getPurposesForRole(role).map(({ purpose }) => [purpose, CONSENT_PURPOSES[purpose]])
    : Object.entries(CONSENT_PURPOSES);
  return { purposes: entries.map(([purpose, config]) => describePurpose(purpose, config)) };
}

/**
 * Valida as autorizações enviadas no cadastro de um papel: todas as obrigatórias
 * na versão vigente; as opcionais enviadas também precisam ser válidas.
 * Retorna a lista normalizada ({ purpose, version }) a gravar como aceita.
 */
function validateSignupConsents(consents, role) {
  const sent = Array.isArray(consents) ? consents.filter(Boolean) : [];
  const allowed = new Map(getPurposesForRole(role).map((item) => [item.purpose, item]));

  for (const item of sent) {
    const config = allowed.get(item.purpose);
    if (!config) {
      throw new ConsentValidationError('Finalidade de consentimento inválida para este perfil');
    }
    if (item.version !== config.version) throw outdatedVersionError();
  }

  const missing = getRequiredPurposes(role).filter(
    ({ purpose }) => !sent.some((item) => item.purpose === purpose)
  );
  if (missing.length > 0) {
    throw new ConsentValidationError(
      'Aceite dos termos de uso, ciência da política de privacidade e consentimentos obrigatórios são necessários',
      { code: 'CONSENT_REQUIRED' }
    );
  }

  const unique = new Map(sent.map((item) => [item.purpose, allowed.get(item.purpose).version]));
  return [...unique].map(([purpose, version]) => ({ purpose, version }));
}

function normalizeDecision({ purpose, decision, version }, role) {
  const config = getPurpose(purpose);
  if (!config || !config.roles.includes(role)) {
    throw new ConsentValidationError('Finalidade de consentimento inválida para este perfil');
  }
  if (!CONSENT_DECISIONS.includes(decision) || !CONSENT_KINDS[config.kind].includes(decision)) {
    throw new ConsentValidationError(`Decisão "${decision}" não se aplica a esta finalidade`);
  }
  // Revogação vale para a finalidade; aceite/recusa precisam citar a versão vigente.
  if (decision !== 'revoked' && version !== config.version) throw outdatedVersionError();
  return { purpose, decision, version: config.version };
}

async function recordDecision(db, { userId, purpose, decision, version, ipAddress, userAgent }) {
  const result = await db.query(
    `INSERT INTO consents (user_id, purpose, version, decision, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, purpose, version, decision, created_at`,
    [userId, purpose, version, decision, ipAddress || null, userAgent || null]
  );
  return result.rows[0];
}

async function getLatestDecisions(db, userId) {
  const result = await db.query(
    `SELECT DISTINCT ON (purpose) purpose, version, decision, created_at
       FROM consents
      WHERE user_id = $1
      ORDER BY purpose, created_at DESC, id DESC`,
    [userId]
  );
  return result.rows;
}

function describeStatus(config, latest) {
  if (!latest) return 'pending';
  if (latest.decision !== 'accepted') return latest.decision;
  return latest.version === config.version ? 'accepted' : 'outdated';
}

/**
 * Status de consentimento do usuário nas finalidades do seu papel. `required`
 * indica se o papel exige aceite vigente e ainda há finalidade obrigatória pendente.
 */
async function getConsentStatus(db, { userId, role }) {
  const latestByPurpose = new Map(
    (await getLatestDecisions(db, userId)).map((row) => [row.purpose, row])
  );

  const purposes = getPurposesForRole(role).map((config) => {
    const latest = latestByPurpose.get(config.purpose) || null;
    return {
      purpose: config.purpose,
      kind: config.kind,
      current_version: config.version,
      required: config.required,
      status: describeStatus(config, latest),
      decided_version: latest ? latest.version : null,
      decided_at: latest ? latest.created_at : null,
    };
  });

  const pending = purposes
    .filter((item) => item.required && item.status !== 'accepted')
    .map(({ purpose, current_version: version }) => ({ purpose, version }));

  return {
    required: CONSENT_REQUIRED_ROLES.includes(role) && pending.length > 0,
    pending,
    purposes,
  };
}

module.exports = {
  ConsentValidationError,
  getConsentStatus,
  getPolicy,
  normalizeDecision,
  recordDecision,
  validateSignupConsents,
};
