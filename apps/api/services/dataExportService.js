/**
 * Exportação dos dados do titular (E7-02.1, LGPD art. 18, II e V).
 *
 * Monta o JSON com os dados do próprio usuário autenticado. As colunas de cada
 * tabela são uma lista explícita (allowlist): segredos (hash de senha, hash de
 * busca do e-mail), caminhos de arquivo, versões de chave e IDs de terceiros
 * nunca entram, mesmo que novas colunas sejam criadas no banco.
 *
 * Escopo aprovado pelo P.O. em 23/10/2026 (comentário na #69):
 *   - gestante: conta, consentimentos, prontuário, gestações, eventos, históricos,
 *     pedidos de exame, documentos (metadados e texto extraído) e vínculos;
 *   - médico: conta, consentimentos e o próprio perfil profissional, nunca os
 *     dados dos pacientes;
 *   - administrador: conta e consentimentos (exportação de terceiros só por
 *     procedimento operacional, fora da API).
 */
const { PREGNANT_CLINICAL_FIELDS } = require('../config/dataClassification');

const EXPORT_FORMAT_VERSION = '1.0';

const COLUMNS = Object.freeze({
  users: ['id', 'name', 'email', 'birthdate', 'role', 'is_active', 'created_at', 'updated_at'],
  consents: ['purpose', 'version', 'decision', 'created_at'],
  doctors: ['crm', 'crm_estado', 'especialidade', 'telefone', 'created_at', 'updated_at'],
  pregnants: ['id', ...PREGNANT_CLINICAL_FIELDS, 'created_at', 'updated_at'],
  pregnancies: [
    'id', 'pregnant_id', 'weeks', 'is_checked', 'dum', 'dpp', 'ccn', 'dgm', 'glicemia',
    'frequencia_cardiaca', 'altura_uterina', 'regularidade_do_ciclo', 'ig_ultrassonografia',
    'created_at', 'updated_at',
  ],
  pregnancy_events: ['id', 'pregnancy_id', 'descricao', 'data_evento', 'created_at', 'updated_at'],
  fetal_biometry_history: [
    'id', 'pregnancy_id', 'measured_at', 'gestational_age_weeks', 'dbp_mm', 'cc_mm', 'ca_mm',
    'cf_mm', 'estimated_weight_grams', 'expected_median_weight_grams', 'percentile', 'z_score',
    'notes', 'created_at', 'updated_at',
  ],
  maternal_weight_history: ['id', 'pregnancy_id', 'measured_at', 'weight_kg', 'notes', 'created_at', 'updated_at'],
  exam_requests: ['id', 'exam_name', 'instructions', 'status', 'requested_at', 'cancelled_at', 'created_at', 'updated_at'],
  pregnant_documents: [
    'id', 'exam_request_id', 'document_name', 'document_type', 'status', 'report_comment',
    'extracted_text', 'extraction_status', 'uploaded_at', 'reviewed_at', 'updated_at',
  ],
  doctor_patient_links: ['status', 'created_at', 'updated_at'],
});

// Tabelas sem classificação no cryptoService (dados em claro).
const PLAIN_TABLES = new Set([
  'consents', 'fetal_biometry_history', 'maternal_weight_history', 'doctor_patient_links',
]);

function selectList(table, alias) {
  return COLUMNS[table].map((column) => `${alias}.${column}`).join(', ');
}

function pick(row, table) {
  return Object.fromEntries(COLUMNS[table].map((column) => [column, row[column] ?? null]));
}

function createDataExportService({ crypto, now = () => new Date() }) {
  function decryptRows(rows, table) {
    return rows.map((row) => {
      const clean = pick(row, table);
      return PLAIN_TABLES.has(table) ? clean : crypto.decryptRecord(clean, table);
    });
  }

  async function rowsOf(db, table, sql, params) {
    const result = await db.query(sql, params);
    return decryptRows(result.rows, table);
  }

  async function exportPregnantData(db, userId) {
    const pregnants = await rowsOf(
      db,
      'pregnants',
      `SELECT ${selectList('pregnants', 'p')} FROM pregnants p WHERE p.user_id = $1 ORDER BY p.id`,
      [userId]
    );
    if (pregnants.length === 0) {
      return {
        prontuario: null, gestacoes: [], eventos: [], biometria_fetal: [], peso_materno: [],
        pedidos_de_exame: [], documentos: [], vinculos_medicos: [],
      };
    }

    const pregnantIds = pregnants.map((row) => row.id);
    const pregnancies = await rowsOf(
      db,
      'pregnancies',
      `SELECT ${selectList('pregnancies', 'g')} FROM pregnancies g
       WHERE g.pregnant_id = ANY($1::int[]) ORDER BY g.id`,
      [pregnantIds]
    );
    const pregnancyIds = pregnancies.map((row) => row.id);

    // Em sequência: o mesmo client do snapshot não aceita consultas simultâneas.
    const eventos = await rowsOf(db, 'pregnancy_events',
      `SELECT ${selectList('pregnancy_events', 'e')} FROM pregnancy_events e
       WHERE e.pregnancy_id = ANY($1::int[]) ORDER BY e.id`,
      [pregnancyIds]);
    const biometria = await rowsOf(db, 'fetal_biometry_history',
      `SELECT ${selectList('fetal_biometry_history', 'b')} FROM fetal_biometry_history b
       WHERE b.pregnancy_id = ANY($1::int[]) AND b.deleted_at IS NULL ORDER BY b.measured_at, b.id`,
      [pregnancyIds]);
    const peso = await rowsOf(db, 'maternal_weight_history',
      `SELECT ${selectList('maternal_weight_history', 'w')} FROM maternal_weight_history w
       WHERE w.pregnancy_id = ANY($1::int[]) AND w.deleted_at IS NULL ORDER BY w.measured_at, w.id`,
      [pregnancyIds]);
    const pedidos = await rowsOf(db, 'exam_requests',
      `SELECT ${selectList('exam_requests', 'r')} FROM exam_requests r
       WHERE r.pregnant_id = ANY($1::int[]) ORDER BY r.requested_at, r.id`,
      [pregnantIds]);
    const documentos = await rowsOf(db, 'pregnant_documents',
      `SELECT ${selectList('pregnant_documents', 'd')} FROM pregnant_documents d
       WHERE d.pregnant_id = ANY($1::int[]) ORDER BY d.uploaded_at, d.id`,
      [pregnantIds]);
    const vinculos = await rowsOf(db, 'doctor_patient_links',
      `SELECT ${selectList('doctor_patient_links', 'l')} FROM doctor_patient_links l
       WHERE l.pregnant_id = ANY($1::int[]) ORDER BY l.created_at`,
      [pregnantIds]);

    return {
      prontuario: pregnants.length === 1 ? pregnants[0] : pregnants,
      gestacoes: pregnancies,
      eventos,
      biometria_fetal: biometria,
      peso_materno: peso,
      pedidos_de_exame: pedidos,
      documentos,
      vinculos_medicos: vinculos,
    };
  }

  async function exportDoctorData(db, userId) {
    const rows = await rowsOf(
      db,
      'doctors',
      `SELECT ${selectList('doctors', 'd')} FROM doctors d WHERE d.user_id = $1 ORDER BY d.id LIMIT 1`,
      [userId]
    );
    return { perfil_profissional: rows[0] || null };
  }

  /**
   * Retorna `null` quando o usuário não existe. O chamador já autenticou o
   * titular; o `userId` vem sempre do token, nunca do corpo ou da URL.
   */
  async function buildExport(db, { userId }) {
    const [user] = await rowsOf(
      db,
      'users',
      `SELECT ${selectList('users', 'u')} FROM users u WHERE u.id = $1`,
      [userId]
    );
    if (!user) return null;

    const consentimentos = await rowsOf(
      db,
      'consents',
      `SELECT ${selectList('consents', 'c')} FROM consents c WHERE c.user_id = $1 ORDER BY c.created_at, c.id`,
      [userId]
    );

    let dados = {};
    if (user.role === 'gestante') dados = await exportPregnantData(db, userId);
    if (user.role === 'medico') dados = await exportDoctorData(db, userId);

    return {
      formato: { nome: 'myfetus-exportacao-titular', versao: EXPORT_FORMAT_VERSION },
      gerado_em: now().toISOString(),
      titular: user,
      consentimentos,
      ...dados,
      observacoes: [
        'Contém somente dados do próprio titular. Não inclui senhas, chaves, registros internos de segurança nem dados de terceiros.',
        ...(user.role === 'gestante'
          ? ['Os arquivos originais dos exames não vão neste JSON; documentos trazem metadados e o texto extraído.']
          : []),
      ],
    };
  }

  return Object.freeze({ buildExport });
}

function summarize(exportData) {
  return Object.fromEntries(
    Object.entries(exportData)
      .filter(([key, value]) => Array.isArray(value) && key !== 'observacoes')
      .map(([key, value]) => [key, value.length])
  );
}

module.exports = {
  COLUMNS,
  EXPORT_FORMAT_VERSION,
  createDataExportService,
  summarize,
};
