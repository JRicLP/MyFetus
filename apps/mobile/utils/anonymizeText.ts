import nlp from 'compromise';

export type AnonymizationEntityType = 'person' | 'place' | 'organization';

export type AnonymizeTextOptions = {
  enableNer?: boolean;
  maskEmails?: boolean;
  maskPhones?: boolean;
  maskCpf?: boolean;
  maskCep?: boolean;
  maskDates?: boolean;
};

export type AnonymizeTextResult = {
  text: string;
  replacedCounts: {
    emails: number;
    phones: number;
    cpf: number;
    cep: number;
    dates: number;
    ner: {
      person: number;
      place: number;
      organization: number;
    };
  };
};

const DEFAULT_OPTIONS: Required<AnonymizeTextOptions> = {
  enableNer: true,
  maskEmails: true,
  maskPhones: true,
  maskCpf: true,
  maskCep: true,
  maskDates: true,
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceAllRegex = (input: string, pattern: RegExp, replacement: string) => {
  let count = 0;
  const out = input.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { out, count };
};

const replaceEntities = (input: string, entities: string[], placeholder: string) => {
  if (entities.length === 0) return { out: input, count: 0 };

  const unique = Array.from(
    new Set(
      entities
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter(Boolean)
    )
  ).sort((a, b) => b.length - a.length);

  let out = input;
  let count = 0;

  // Regex boundary approximation for PT-BR without using Unicode property escapes (Hermes-safe).
  const WORD_CHARS = 'A-Za-zÀ-ÖØ-öø-ÿ0-9_';

  for (const entity of unique) {
    // Word-boundary-ish replace: avoids replacing inside other words.
    // We keep it case-insensitive to catch different capitalizations.
    const pattern = new RegExp(`(^|[^${WORD_CHARS}])(${escapeRegExp(entity)})(?=$|[^${WORD_CHARS}])`, 'gi');
    out = out.replace(pattern, (match, prefix) => {
      count += 1;
      return `${prefix}${placeholder}`;
    });
  }

  return { out, count };
};

/**
 * Local anonymization for free-text fields before sending to backend.
 *
 * Strategy:
 * 1) Mask high-signal patterns (emails/phones/CPF/CEP/dates) using regex.
 * 2) Run a lightweight local NER (compromise) and mask people/places/orgs.
 *
 * Notes:
 * - NER quality for PT-BR varies; regex masks cover most sensitive tokens.
 * - Intended for *notes/descrições* fields, not for user identity fields.
 */
export const anonymizeText = (input: string, options?: AnonymizeTextOptions): AnonymizeTextResult => {
  const merged = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
  const trimmed = input ?? '';

  const replacedCounts: AnonymizeTextResult['replacedCounts'] = {
    emails: 0,
    phones: 0,
    cpf: 0,
    cep: 0,
    dates: 0,
    ner: {
      person: 0,
      place: 0,
      organization: 0,
    },
  };

  if (!trimmed.trim()) {
    return { text: trimmed, replacedCounts };
  }

  let text = trimmed;

  // --- Regex masks (PT-BR common PII) ---
  if (merged.maskEmails) {
    const res = replaceAllRegex(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
    text = res.out;
    replacedCounts.emails = res.count;
  }

  if (merged.maskPhones) {
    // Covers formats like: (11) 91234-5678, 11912345678, +55 11 91234-5678
    const phone = /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-\s]?\d{4}\b/g;
    const res = replaceAllRegex(text, phone, '[TELEFONE]');
    text = res.out;
    replacedCounts.phones = res.count;
  }

  if (merged.maskCpf) {
    const cpf = /\b\d{3}\.?(?:\d{3})\.?(?:\d{3})-?\d{2}\b/g;
    const res = replaceAllRegex(text, cpf, '[CPF]');
    text = res.out;
    replacedCounts.cpf = res.count;
  }

  if (merged.maskCep) {
    const cep = /\b\d{5}-?\d{3}\b/g;
    const res = replaceAllRegex(text, cep, '[CEP]');
    text = res.out;
    replacedCounts.cep = res.count;
  }

  if (merged.maskDates) {
    // DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const dates = /\b(?:\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})\b/g;
    const res = replaceAllRegex(text, dates, '[DATA]');
    text = res.out;
    replacedCounts.dates = res.count;
  }

  // --- NER (lightweight) ---
  if (merged.enableNer) {
    try {
      const doc = nlp(text);

      const people = doc.people().out('array') as unknown as string[];
      const places = doc.places().out('array') as unknown as string[];
      const orgs = doc.organizations().out('array') as unknown as string[];

      const p = replaceEntities(text, people, '[PESSOA]');
      text = p.out;
      replacedCounts.ner.person += p.count;

      const pl = replaceEntities(text, places, '[LOCAL]');
      text = pl.out;
      replacedCounts.ner.place += pl.count;

      const o = replaceEntities(text, orgs, '[ORGANIZACAO]');
      text = o.out;
      replacedCounts.ner.organization += o.count;
    } catch {
      // If NER fails for any reason, we still keep regex-masked output.
    }
  }

  return { text, replacedCounts };
};
