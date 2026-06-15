const {
  calculateHadlockPercentile,
} = require('../utils/hadlockCalculator');

class HistoryValidationError extends Error {}

function requirePositiveNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new HistoryValidationError(
      `${field} deve ser um numero maior que zero`
    );
  }

  return value;
}

function validateMeasuredAt(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HistoryValidationError(
      'measured_at deve estar no formato YYYY-MM-DD'
    );
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HistoryValidationError('measured_at deve ser uma data valida');
  }

  return value;
}

function validateNotes(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || value.length > 2000) {
    throw new HistoryValidationError(
      'notes deve ser um texto de no maximo 2000 caracteres'
    );
  }

  return value.trim() || null;
}

function validatePregnancyId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new HistoryValidationError('pregnancy_id invalido');
  }

  return id;
}

function parseHistoryFilters(query = {}) {
  const filters = {
    from: validateMeasuredAt(query.from),
    to: validateMeasuredAt(query.to),
    order: String(query.order || 'asc').toLowerCase(),
    limit: query.limit === undefined ? 200 : Number(query.limit),
  };

  if (!['asc', 'desc'].includes(filters.order)) {
    throw new HistoryValidationError('order deve ser asc ou desc');
  }

  if (
    !Number.isInteger(filters.limit) ||
    filters.limit < 1 ||
    filters.limit > 500
  ) {
    throw new HistoryValidationError('limit deve ser um inteiro entre 1 e 500');
  }

  if (filters.from && filters.to && filters.from > filters.to) {
    throw new HistoryValidationError('from nao pode ser posterior a to');
  }

  return filters;
}

function buildHistoryQuery(table, columns, pregnancyId, filters) {
  const values = [pregnancyId];
  const conditions = ['pregnancy_id = $1', 'deleted_at IS NULL'];

  if (filters.from) {
    values.push(filters.from);
    conditions.push(`measured_at >= $${values.length}`);
  }

  if (filters.to) {
    values.push(filters.to);
    conditions.push(`measured_at <= $${values.length}`);
  }

  values.push(filters.limit);

  return {
    text: `
      SELECT ${columns}
      FROM ${table}
      WHERE ${conditions.join(' AND ')}
      ORDER BY measured_at ${filters.order.toUpperCase()}, id ${filters.order.toUpperCase()}
      LIMIT $${values.length}
    `,
    values,
  };
}

async function createFetalBiometry(
  db,
  pregnancyIdValue,
  payload = {},
  userId
) {
  const pregnancyId = validatePregnancyId(pregnancyIdValue);
  const gestationalAgeWeeks = requirePositiveNumber(
    payload.gestational_age_weeks,
    'gestational_age_weeks'
  );

  if (gestationalAgeWeeks < 10 || gestationalAgeWeeks > 42) {
    throw new HistoryValidationError(
      'gestational_age_weeks deve estar entre 10 e 42'
    );
  }

  const biometrics = {
    dbp: requirePositiveNumber(payload.dbp_mm, 'dbp_mm'),
    cc: requirePositiveNumber(payload.cc_mm, 'cc_mm'),
    ca: requirePositiveNumber(payload.ca_mm, 'ca_mm'),
    cf: requirePositiveNumber(payload.cf_mm, 'cf_mm'),
  };
  const measuredAt = validateMeasuredAt(payload.measured_at);
  const notes = validateNotes(payload.notes);
  const result = calculateHadlockPercentile(
    gestationalAgeWeeks,
    biometrics
  );

  const inserted = await db.query(
    `
    INSERT INTO fetal_biometry_history (
      pregnancy_id,
      measured_at,
      gestational_age_weeks,
      dbp_mm,
      cc_mm,
      ca_mm,
      cf_mm,
      estimated_weight_grams,
      expected_median_weight_grams,
      percentile,
      z_score,
      notes,
      created_by_user_id
    )
    VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
    `,
    [
      pregnancyId,
      measuredAt,
      gestationalAgeWeeks,
      biometrics.dbp,
      biometrics.cc,
      biometrics.ca,
      biometrics.cf,
      result.estimatedWeightGrams,
      result.expectedMedianWeight,
      result.percentile,
      result.zScore,
      notes,
      userId,
    ]
  );

  return inserted.rows[0];
}

async function createMaternalWeight(
  db,
  pregnancyIdValue,
  payload = {},
  userId
) {
  const pregnancyId = validatePregnancyId(pregnancyIdValue);
  const weightKg = requirePositiveNumber(payload.weight_kg, 'weight_kg');

  if (weightKg > 500) {
    throw new HistoryValidationError('weight_kg deve ser menor ou igual a 500');
  }

  const measuredAt = validateMeasuredAt(payload.measured_at);
  const notes = validateNotes(payload.notes);
  const inserted = await db.query(
    `
    INSERT INTO maternal_weight_history (
      pregnancy_id,
      measured_at,
      weight_kg,
      notes,
      created_by_user_id
    )
    VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5)
    RETURNING *
    `,
    [pregnancyId, measuredAt, weightKg, notes, userId]
  );

  return inserted.rows[0];
}

async function listFetalBiometries(db, pregnancyIdValue, query) {
  const pregnancyId = validatePregnancyId(pregnancyIdValue);
  const filters = parseHistoryFilters(query);
  const statement = buildHistoryQuery(
    'fetal_biometry_history',
    '*',
    pregnancyId,
    filters
  );
  const result = await db.query(statement.text, statement.values);

  return result.rows;
}

async function listMaternalWeights(db, pregnancyIdValue, query) {
  const pregnancyId = validatePregnancyId(pregnancyIdValue);
  const filters = parseHistoryFilters(query);
  const statement = buildHistoryQuery(
    'maternal_weight_history',
    '*',
    pregnancyId,
    filters
  );
  const result = await db.query(statement.text, statement.values);

  return result.rows;
}

module.exports = {
  HistoryValidationError,
  createFetalBiometry,
  createMaternalWeight,
  listFetalBiometries,
  listMaternalWeights,
  parseHistoryFilters,
  validatePregnancyId,
};
