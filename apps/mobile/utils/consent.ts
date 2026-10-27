/**
 * Consentimento no cadastro (E7-01.1).
 *
 * A política (finalidades, tipos, versões e textos) vem da API em
 * GET /consents/policy?role=<perfil>; o app envia de volta as versões vigentes
 * das finalidades obrigatórias e das opcionais que a pessoa autorizou.
 *
 * Tipos: acceptance = aceite dos Termos de Uso; acknowledgment = ciência da
 * Política de Privacidade; consent = consentimento (opcional quando required=false).
 */
export type ConsentKind = 'acceptance' | 'acknowledgment' | 'consent';

export type ConsentPurpose = {
  purpose: string;
  title: string;
  kind: ConsentKind;
  required: boolean;
  highlighted: boolean;
  version: string;
  document_date: string;
  text: string;
};

export type ConsentPolicy = {
  purposes: ConsentPurpose[];
};

export type ConsentReference = {
  purpose: string;
  version: string;
};

export type ConsentStatusPurpose = ConsentReference & {
  kind: ConsentKind;
  current_version: string;
  required: boolean;
  status: string;
  decided_version: string | null;
  decided_at: string | null;
};

export type ConsentStatus = {
  required: boolean;
  pending: ConsentReference[];
  purposes: ConsentStatusPurpose[];
};

export type ConsentSelection = Record<string, boolean>;

const KINDS: ConsentKind[] = ['acceptance', 'acknowledgment', 'consent'];

export function parseConsentPolicy(data: unknown): ConsentPolicy | null {
  const purposes = (data as { purposes?: unknown })?.purposes;
  if (!Array.isArray(purposes) || purposes.length === 0) return null;

  const valid = purposes.every(
    (item) =>
      item &&
      typeof item.purpose === 'string' &&
      typeof item.title === 'string' &&
      KINDS.includes(item.kind) &&
      typeof item.required === 'boolean' &&
      typeof item.version === 'string' &&
      typeof item.text === 'string'
  );
  if (!valid) return null;

  return {
    purposes: purposes.map((item) => ({
      ...item,
      highlighted: Boolean(item.highlighted),
      document_date: typeof item.document_date === 'string' ? item.document_date : '',
    })),
  };
}

// Rótulo do checkbox conforme o tipo: aceite, ciência ou consentimento (opcional).
export function getConsentLabel(item: ConsentPurpose): string {
  if (item.kind === 'acceptance') return `Li e aceito os ${item.title}`;
  if (item.kind === 'acknowledgment') return `Declaro que li e estou ciente da ${item.title}`;
  return item.required ? item.title : `${item.title} (opcional)`;
}

export function getMissingRequired(policy: ConsentPolicy, selection: ConsentSelection): ConsentPurpose[] {
  return policy.purposes.filter((item) => item.required && !selection[item.purpose]);
}

// Envia as obrigatórias e as opcionais marcadas, sempre na versão vigente recebida.
export function buildSignupConsents(policy: ConsentPolicy, selection: ConsentSelection): ConsentReference[] {
  return policy.purposes
    .filter((item) => item.required || selection[item.purpose])
    .map(({ purpose, version }) => ({ purpose, version }));
}

export type ApiErrorInfo = {
  status: number | null;
  code: string | null;
  message: string | null;
};

// Lê o corpo de erro da API ({ error, code }) a partir de um erro do axios.
export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  const response = (error as { response?: { status?: number; data?: { error?: unknown; code?: unknown } } })?.response;
  return {
    status: typeof response?.status === 'number' ? response.status : null,
    code: typeof response?.data?.code === 'string' ? response.data.code : null,
    message: typeof response?.data?.error === 'string' ? response.data.error : null,
  };
}
