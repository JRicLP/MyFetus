//Expressões regulares com a função de ver padrões que identificam CPF, email, telefone, etc. e substituem pelo texto genérico
const PII_PATTERNS = [
  {
    name: 'CPF',
    regex: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
    masked: (match) => match.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '$1.***.***-$4'),
    redacted: '[CPF]'
  },
  {
    name: 'EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    masked: (match) => {
      const [user, domain] = match.split('@');
      const firstUser = user[0];
      const lastUser = user[user.length - 1];
      const firstDomain = domain[0];
      return `${firstUser}***${lastUser}@${firstDomain}***`;
    },
    redacted: '[EMAIL]'
  },
  {
    name: 'TELEFONE',
    regex: /(\(?\d{2}\)?\s?)(\d{4,5})-?(\d{2})(\d{2})/g,
    masked: (match, ddd, meio, penultimos, ultimos) => `(**) *****-${ultimos}`,
    redacted: '[TELEFONE]'
  },
  {
    name: 'DATA_NASCIMENTO',
    regex: /\b\d{2}\/\d{2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g,
    masked: (match) => match.replace(/(\d{2}|\d{4})(-|\/)(\d{2})(-|\/)(\d{2}|\d{4})/, '**$2**$4$5'),
    redacted: '[DATA]'
  },
  {
    name: 'CRM',
    regex: /CRM[-\s]?\d{4,6}[-\s]?[A-Z]{2}/gi,
    masked: (match) => match.replace(/\d{4,6}/, '****'),
    redacted: '[CRM]'
  }
];

// TIPO 1 — Identificadores pessoais
// Removidos completamente no modo redact (LLM)
// Mascarados parcialmente no modo mask (logs)
// São os campos que identificam QUEM é a pessoa
const PERSONAL_IDENTIFIERS = {
  users: ['name', 'email', 'password', 'birthdate'],
  doctors: ['crm', 'crm_estado', 'telefone'],
  pregnants: [
    'antecedentes_texto',
    'antecedentes_clinicos_outros_texto',
    'info_gerais_sintomas',
    'info_gerais_estado_geral_1',
    'info_gerais_estado_geral_2',
    'info_gerais_nutricional',
    'info_gerais_psicossocial',
    'info_gerais_edemas'
  ]
};

// TIPO 2 — Dados clínicos
// Mantidos para a LLM 
// Mascarados no modo mask (logs internos)
// São os campos que descrevem a SAÚDE da pessoa,
// mas sem identificá-la diretamente
const CLINICAL_DATA = {
  pregnants: [
    // Biometria
    'altura',
    'peso_pregestacional',
    'peso_atual',
    'temperatura_materna',
    'pressao_sistole',
    'pressao_diastole',

    // Antecedentes obstétricos
    'antecedentes_diabetes',
    'antecedentes_hipertensao',
    'antecedentes_gemelar',
    'antecedentes_outros',
    'gestacao_eclampsia_pre_eclampsia',
    'gestacao_mais_tres_abortos',

    // Antecedentes clínicos
    'antecedentes_clinicos_diabetes',
    'antecedentes_clinicos_infeccao_urinaria',
    'antecedentes_clinicos_infertilidade',
    'antecedentes_clinicos_dific_amamentacao',
    'antecedentes_clinicos_cardiopatia',
    'antecedentes_clinicos_tromboembolismo',
    'antecedentes_clinicos_hipertensao_arterial',
    'antecedentes_clinicos_cirur_per_uterina',
    'antecedentes_clinicos_cirurgia',
    'antecedentes_clinicos_outros',

    // Gestação atual
    'gestacao_atual_fumante',
    'gestacao_atual_quant_cigarros',
    'gestacao_atual_alcool',
    'gestacao_atual_outras_drogas',
    'gestacao_atual_hiv_aids',
    'gestacao_atual_sifilis',
    'gestacao_atual_toxoplasmose',
    'gestacao_atual_infeccao_urinaria',
    'gestacao_atual_anemia',
    'gestacao_atual_inc_istmocervical',
    'gestacao_atual_ameaca_parto_premat',
    'gestacao_atual_imuniz_rh',
    'gestacao_atual_oligo_polidramio',
    'gestacao_atual_rut_prem_membrana',
    'gestacao_atual_ciur',
    'gestacao_atual_pos_datismo',
    'gestacao_atual_febre',
    'gestacao_atual_hipertensao_arterial',
    'gestacao_atual_pre_eclamp_eclamp',
    'gestacao_atual_cardiopatia',
    'gestacao_atual_diabete_gestacional',
    'gestacao_atual_uso_insulina',
    'gestacao_atual_hemorragia_1trim',
    'gestacao_atual_hemorragia_2trim',
    'gestacao_atual_hemorragia_3trim',
    'exantema_rash',

    // Vacinas
    'vacina_antitetanica',
    'vacina_antitetanica_1dose',
    'vacina_antitetanica_2dose',
    'vacina_antitetanica_dtpa',
    'vacina_hepatite_b',
    'vacina_hepatite_b_1dose',
    'vacina_hepatite_b_2dose',
    'vacina_hepatite_b_3dose',
    'vacina_influenza',
    'vacina_influenza_1dose',
    'vacina_covid19',
    'vacina_covid19_1dose',
    'vacina_covid19_2dose'
  ]
};

// Função auxiliar: maskName
// Aplica abreviação ao nome: "Maria Silva Santos" → "Maria S. S."
const maskName = (name) => {
  if (!name || typeof name !== 'string') return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const abbreviated = parts.slice(1).map(p => `${p[0]}.`).join(' ');
  return `${firstName} ${abbreviated}`;
};

const shouldRedactAsName = (key) => /(^name$|_name$|patient_name|doctor_name|full_name)/i.test(key);
const shouldRedactAsDate = (key) => /(birthdate|date|data|dum|dpp|evento)/i.test(key);
const shouldRedactAsSecret = (key) => /(password|token|secret|authorization)/i.test(key);

const sanitizeForLog = (data, key = '') => {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    if (shouldRedactAsSecret(key)) return '[REDACTED]';
    if (shouldRedactAsName(key)) return maskName(data);
    if (shouldRedactAsDate(key)) return sanitizeText(data, 'mask');
    return sanitizeText(data, 'mask');
  }

  // Tratar especialmente objetos Date (que também são typeof 'object')
  if (data instanceof Date) {
    if (shouldRedactAsDate(key)) {
      return sanitizeText(data.toISOString(), 'mask');
    }
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item, key));
  }

  if (typeof data === 'object') {
    const sanitized = {};

    for (const [childKey, childValue] of Object.entries(data)) {
      if (typeof childValue === 'string') {
        sanitized[childKey] = sanitizeForLog(childValue, childKey);
      } else if (Array.isArray(childValue) || (childValue && typeof childValue === 'object')) {
        sanitized[childKey] = sanitizeForLog(childValue, childKey);
      } else {
        sanitized[childKey] = childValue;
      }
    }

    return sanitized;
  }

  return data;
};

// Função 1: sanitizeText
// Higieniza um texto livre aplicando os padrões de PII
// Parâmetros:
// - text [string]: texto a ser higienizado
// - mode [string]: 'mask' para mascaramento parcial, 'redact' para remoção total
// Retorno:
//   - [string]: texto higienizado
const sanitizeText = (text, mode = 'redact') => {
  if (!text || typeof text !== 'string') return text;

  let sanitized = text;

  for (const pattern of PII_PATTERNS) {
    if (mode === 'mask') {
      sanitized = sanitized.replace(pattern.regex, pattern.masked);
    } else {
      sanitized = sanitized.replace(pattern.regex, pattern.redacted);
    }
  }

  return sanitized;
};

// Função 2: sanitizeRecord
// Higieniza um objeto (registro do banco) campo a campo
// Parâmetros:
//   - record [Object]: objeto com os dados do registro
//   - table [string]: nome da tabela ('users', 'doctors', 'pregnants')
//   - mode [string]: 'mask' ou 'redact'
// Retorno:
//   - [Object]: novo objeto com campos sensíveis higienizados
const sanitizeRecord = (record, table, mode = 'redact') => {
  if (!record || typeof record !== 'object') return record;

  const identifiers = PERSONAL_IDENTIFIERS[table] || [];
  const clinical = CLINICAL_DATA[table] || [];
  const sanitized = { ...record };

  // Aplica higienização nos identificadores pessoais
  for (const field of identifiers) {
    if (sanitized[field] === undefined || sanitized[field] === null) continue;

    if (field === 'name') {
      sanitized[field] = mode === 'mask' ? maskName(sanitized[field]) : '[NOME]';
    } else if (field === 'email') {
      sanitized[field] = mode === 'mask' ? sanitizeText(sanitized[field], 'mask') : '[EMAIL]';
    } else if (field === 'telefone') {
      sanitized[field] = mode === 'mask' ? sanitizeText(sanitized[field], 'mask') : '[TELEFONE]';
    } else if (field === 'password') {
      sanitized[field] = '********';
    } else if (typeof sanitized[field] === 'string') {
      sanitized[field] = mode === 'redact' ? '[DADO REMOVIDO]' : '***';
    }
  }

  // Aplica higienização nos dados clínicos
  // No modo redact (LLM): MANTÉM os dados clínicos (a IA precisa deles)
  // No modo mask (logs): mascara para não expor em logs
  if (mode === 'mask') {
    for (const field of clinical) {
      if (sanitized[field] === undefined || sanitized[field] === null) continue;

      if (typeof sanitized[field] === 'number') {
        sanitized[field] = 0;
      } else if (typeof sanitized[field] === 'boolean') {
        sanitized[field] = sanitized[field];
      }
    }
  }

  return sanitized;
};

// Função 3: sanitizeForLLM
// Prepara dados para envio à LLM:
// - Remove identificadores pessoais (nome, email, etc.)
// - Mantém dados clínicos (a IA precisa para analisar)
// - O ID da paciente pode ir junto para referência
// Parâmetros:
//   - data [string | Object]: texto ou objeto a higienizar
//   - table [string]: necessário se data for um objeto
// Retorno:
//   - [string | Object]: dado pronto para envio à LLM
const sanitizeForLLM = (data, table = null) => {
  if (typeof data === 'string') {
    return sanitizeText(data, 'redact');
  }
  if (typeof data === 'object' && table) {
    return sanitizeRecord(data, table, 'redact');
  }
  return data;
};

module.exports = {
  sanitizeText,
  sanitizeRecord,
  sanitizeForLLM,
  sanitizeForLog,
  maskName,
  PERSONAL_IDENTIFIERS,
  CLINICAL_DATA
};