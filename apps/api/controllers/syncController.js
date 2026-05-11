const pool = require('../backend');

const TABLE_COLUMNS = {
  users: [
    'name',
    'email',
    'password',
    'birthdate',
    'is_active',
    'role'
  ],
  pregnants: [
    'user_id',
    'altura',
    'peso_pregestacional',
    'peso_atual',
    'temperatura_materna',
    'pressao_sistole',
    'pressao_diastole',
    'antecedentes_diabetes',
    'antecedentes_hipertensao',
    'antecedentes_gemelar',
    'antecedentes_outros',
    'antecedentes_texto',
    'gestacao_partos',
    'gestacao_vaginal',
    'gestacao_cesarea',
    'gestacao_bebe_maior_45',
    'gestacao_bebe_maior_25',
    'gestacao_eclampsia_pre_eclampsia',
    'gestacao_gestas',
    'gestacao_abortos',
    'gestacao_mais_tres_abortos',
    'gestacao_nascidos_vivos',
    'gestacao_nascidos_mortos',
    'gestacao_vivem',
    'gestacao_mortos_primeira_semana',
    'gestacao_mortos_depois_primeira_semana',
    'gestacao_final_gestacao_anterior_1ano',
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
    'antecedentes_clinicos_outros_texto',
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
    'vacina_covid19_2dose',
    'info_gerais_edemas',
    'info_gerais_sintomas',
    'info_gerais_estado_geral_1',
    'info_gerais_estado_geral_2',
    'info_gerais_nutricional',
    'info_gerais_psicossocial'
  ],
  pregnancies: [
    'pregnant_id',
    'weeks',
    'is_checked',
    'dum',
    'dpp',
    'ccn',
    'dgm',
    'glicemia',
    'frequencia_cardiaca',
    'altura_uterina',
    'regularidade_do_ciclo',
    'ig_ultrassonografia'
  ],
  pregnancy_events: [
    'pregnancy_id',
    'descricao',
    'data_evento'
  ],
  pregnant_documents: [
    'pregnant_id',
    'document_name',
    'document_type',
    'file_path',
    'uploaded_at'
  ]
};

const TABLE_SELECT_COLUMNS = {
  users: [
    'id',
    'name',
    'email',
    'birthdate',
    'is_active',
    'role',
    'created_at',
    'updated_at',
    'deleted_at',
    'version'
  ],
  pregnants: ['*'],
  pregnancies: ['*'],
  pregnancy_events: ['*'],
  pregnant_documents: ['*']
};

const SYSTEM_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'version'
]);

const ALLOWED_OPERATIONS = new Set(['insert', 'update', 'delete']);

const normalizeOperation = (operation) => {
  if (!operation) return null;
  const normalized = String(operation).toLowerCase();
  if (normalized === 'create') return 'insert';
  return normalized;
};

const filterPayload = (table, payload) => {
  if (!payload || typeof payload !== 'object') return {};
  const allowed = new Set(TABLE_COLUMNS[table] || []);
  const filtered = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (allowed.has(key) && !SYSTEM_COLUMNS.has(key)) {
      filtered[key] = value;
    }
  });
  return filtered;
};

const buildInsertQuery = (table, entityId, data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  if (entityId !== undefined && entityId !== null) {
    columns.unshift('id');
    values.unshift(entityId);
  }
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  return { query, values };
};

const buildUpdateQuery = (table, entityId, data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
  const query = `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
  return { query, values: [...values, entityId] };
};

const getSelectColumns = (table) => {
  const columns = TABLE_SELECT_COLUMNS[table];
  if (!columns || columns.length === 0) return '*';
  if (columns.length === 1 && columns[0] === '*') return '*';
  return columns.join(', ');
};

const enqueueOperation = async (dbClient, op, clientId) => {
  const existing = await dbClient.query(
    'SELECT id, status, error FROM sync_queue WHERE op_id = $1',
    [op.op_id]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const insert = await dbClient.query(
    `INSERT INTO sync_queue
      (op_id, client_id, entity_table, entity_id, operation, payload, base_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, status, error`,
    [
      op.op_id,
      clientId,
      op.table,
      op.entity_id || null,
      op.operation,
      op.payload || null,
      op.base_version || null
    ]
  );

  return insert.rows[0];
};

const applyOperation = async (dbClient, op) => {
  const table = op.table;
  const operation = op.operation;
  const entityId = op.entity_id;
  const data = filterPayload(table, op.payload);

  if (!TABLE_COLUMNS[table]) {
    return { status: 'failed', error: `Tabela nao suportada: ${table}` };
  }

  if (operation === 'insert') {
    if (Object.keys(data).length === 0) {
      return { status: 'failed', error: 'Payload vazio para insert' };
    }
    if (entityId !== undefined && entityId !== null) {
      const existing = await dbClient.query(
        `SELECT id, deleted_at FROM ${table} WHERE id = $1`,
        [entityId]
      );
      if (existing.rows.length > 0 && !existing.rows[0].deleted_at) {
        return { status: 'conflict', error: 'Registro ja existe' };
      }
    }

    const { query, values } = buildInsertQuery(table, entityId, data);
    const result = await dbClient.query(query, values);
    return { status: 'applied', row: result.rows[0] };
  }

  if (operation === 'update') {
    if (!entityId) {
      return { status: 'failed', error: 'entity_id obrigatorio para update' };
    }
    const existing = await dbClient.query(
      `SELECT id, version, deleted_at FROM ${table} WHERE id = $1 FOR UPDATE`,
      [entityId]
    );
    if (existing.rows.length === 0 || existing.rows[0].deleted_at) {
      return { status: 'conflict', error: 'Registro nao encontrado' };
    }
    if (op.base_version && Number(existing.rows[0].version) !== Number(op.base_version)) {
      return { status: 'conflict', error: 'Conflito de versao' };
    }
    if (Object.keys(data).length === 0) {
      const current = await dbClient.query(
        `SELECT ${getSelectColumns(table)} FROM ${table} WHERE id = $1`,
        [entityId]
      );
      return { status: 'applied', row: current.rows[0] };
    }

    const { query, values } = buildUpdateQuery(table, entityId, data);
    const result = await dbClient.query(query, values);
    return { status: 'applied', row: result.rows[0] };
  }

  if (operation === 'delete') {
    if (!entityId) {
      return { status: 'failed', error: 'entity_id obrigatorio para delete' };
    }
    const existing = await dbClient.query(
      `SELECT id, version, deleted_at FROM ${table} WHERE id = $1 FOR UPDATE`,
      [entityId]
    );
    if (existing.rows.length === 0 || existing.rows[0].deleted_at) {
      return { status: 'conflict', error: 'Registro nao encontrado' };
    }
    if (op.base_version && Number(existing.rows[0].version) !== Number(op.base_version)) {
      return { status: 'conflict', error: 'Conflito de versao' };
    }

    const result = await dbClient.query(
      `UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [entityId]
    );
    return { status: 'applied', row: result.rows[0] };
  }

  return { status: 'failed', error: `Operacao invalida: ${operation}` };
};

const getChangesSince = async (lastSyncAt) => {
  const tables = Object.keys(TABLE_COLUMNS);
  const changes = {};

  for (const table of tables) {
    const selectColumns = getSelectColumns(table);
    if (!lastSyncAt) {
      const result = await pool.query(`SELECT ${selectColumns} FROM ${table}`);
      changes[table] = result.rows;
      continue;
    }

    const result = await pool.query(
      `SELECT ${selectColumns} FROM ${table}
       WHERE (updated_at > $1 OR created_at > $1 OR deleted_at > $1)`,
      [lastSyncAt]
    );
    changes[table] = result.rows;
  }

  return changes;
};

const sync = async (req, res) => {
  const { client_id: clientId, last_sync_at: lastSyncAt, operations } = req.body;

  if (!clientId || !Array.isArray(operations)) {
    return res.status(400).json({ error: 'client_id e operations sao obrigatorios' });
  }

  const applied = [];
  const conflicts = [];
  const failed = [];

  for (const op of operations) {
    const normalizedOperation = normalizeOperation(op.operation);
    const normalized = {
      op_id: op.op_id,
      table: op.table,
      operation: normalizedOperation,
      entity_id: op.entity_id,
      payload: op.payload,
      base_version: op.base_version
    };

    if (!normalized.op_id || !normalized.table || !normalized.operation) {
      failed.push({ op_id: op.op_id || null, error: 'Campos obrigatorios ausentes' });
      continue;
    }
    if (!TABLE_COLUMNS[normalized.table]) {
      failed.push({ op_id: normalized.op_id, error: 'Tabela nao suportada' });
      continue;
    }
    if (!ALLOWED_OPERATIONS.has(normalized.operation)) {
      failed.push({ op_id: normalized.op_id, error: 'Operacao nao suportada' });
      continue;
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      const queueRow = await enqueueOperation(dbClient, normalized, clientId);

      if (queueRow.status === 'applied') {
        applied.push({ op_id: normalized.op_id, status: 'applied' });
        await dbClient.query('COMMIT');
        continue;
      }
      if (queueRow.status === 'conflict') {
        conflicts.push({ op_id: normalized.op_id, error: queueRow.error || 'Conflito' });
        await dbClient.query('COMMIT');
        continue;
      }

      const result = await applyOperation(dbClient, normalized);

      if (result.status === 'applied') {
        await dbClient.query(
          'UPDATE sync_queue SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE op_id = $2',
          ['applied', normalized.op_id]
        );
        applied.push({ op_id: normalized.op_id, row: result.row });
      } else if (result.status === 'conflict') {
        await dbClient.query(
          'UPDATE sync_queue SET status = $1, error = $2, processed_at = CURRENT_TIMESTAMP WHERE op_id = $3',
          ['conflict', result.error, normalized.op_id]
        );
        conflicts.push({ op_id: normalized.op_id, error: result.error });
      } else {
        await dbClient.query(
          'UPDATE sync_queue SET status = $1, error = $2, processed_at = CURRENT_TIMESTAMP WHERE op_id = $3',
          ['failed', result.error, normalized.op_id]
        );
        failed.push({ op_id: normalized.op_id, error: result.error });
      }

      await dbClient.query('COMMIT');
    } catch (error) {
      await dbClient.query('ROLLBACK');
      await pool.query(
        'UPDATE sync_queue SET status = $1, error = $2, processed_at = CURRENT_TIMESTAMP WHERE op_id = $3',
        ['failed', error.message, normalized.op_id]
      );
      failed.push({ op_id: normalized.op_id, error: error.message });
    } finally {
      dbClient.release();
    }
  }

  try {
    const changes = await getChangesSince(lastSyncAt);
    return res.json({ applied, conflicts, failed, changes });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  sync
};
