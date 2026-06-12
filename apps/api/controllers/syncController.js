const client = require('../backend');
const { getEncryptedFields } = require('../config/dataClassification');
const cryptoService = require('../services/cryptoService');
const logger = require('../utils/logger');
const {
  SYNC_TABLES,
  getWritableEntries,
  quoteIdentifier,
  validateChanges,
} = require('../utils/syncPolicy');

async function getTableColumns(dbClient, table) {
  const result = await dbClient.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    `,
    [table]
  );
  return new Set(result.rows.map((row) => row.column_name));
}

function isValidationError(error) {
  return ['invalido', 'invalidas', 'permitida', 'deve ser', 'Nenhum campo']
    .some((fragment) => error.message.includes(fragment));
}

function protectSyncRecord(record, table) {
  const encryptedFields = getEncryptedFields(table);
  const containsProtectedData = encryptedFields.some(
    (field) => Object.prototype.hasOwnProperty.call(record, field)
  );
  if (!containsProtectedData) return record;

  return {
    ...cryptoService.encryptRecord(record, table),
    encryption_key_version: cryptoService.getCurrentVersion(),
  };
}

function revealSyncRows(rows, table) {
  if (getEncryptedFields(table).length === 0) return rows;
  return rows.map((row) => cryptoService.decryptRecord(row, table));
}

const syncData = async (req, res) => {
  const { last_sync_timestamp, changes } = req.body || {};
  const newSyncTimestamp = new Date().toISOString();
  let dbClient;

  try {
    validateChanges(changes);
    dbClient = await client.connect();
    await dbClient.query('BEGIN');

    if (changes) {
      for (const table of Object.keys(changes)) {
        const { created = [], updated = [] } = changes[table];
        const tableName = quoteIdentifier(table);
        const tableColumns = await getTableColumns(dbClient, table);

        for (const record of created) {
          const protectedRecord = protectSyncRecord(record, table);
          const entries = getWritableEntries(
            protectedRecord,
            table,
            tableColumns
          );
          const columns = entries.map(([column]) => quoteIdentifier(column)).join(', ');
          const values = entries.map(([, value]) => value);
          const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
          await dbClient.query(
            `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
            values
          );
        }

        for (const record of updated) {
          const { id, ...updateData } = record;
          if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            throw new Error(`ID invalido para atualizar a tabela ${table}`);
          }

          const protectedRecord = protectSyncRecord(updateData, table);
          const entries = getWritableEntries(
            protectedRecord,
            table,
            tableColumns
          );
          const setClause = entries
            .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
            .join(', ');
          const values = entries.map(([, value]) => value);
          await dbClient.query(
            `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length + 1}`,
            [...values, Number(id)]
          );
        }
      }
    }

    const serverChanges = {};
    for (const [table, config] of Object.entries(SYNC_TABLES)) {
      const selectColumns = config.pullColumns[0] === '*'
        ? '*'
        : config.pullColumns.map(quoteIdentifier).join(', ');
      const params = [];
      let query = `SELECT ${selectColumns} FROM ${quoteIdentifier(table)}`;

      if (last_sync_timestamp) {
        query += ' WHERE updated_at > $1';
        params.push(last_sync_timestamp);
      }

      const result = await dbClient.query(query, params);
      if (result.rows.length > 0) {
        serverChanges[table] = {
          created: [],
          updated: revealSyncRows(result.rows, table),
        };
      }
    }

    await dbClient.query('COMMIT');
    res.status(200).json({
      new_sync_timestamp: newSyncTimestamp,
      server_changes: serverChanges,
    });
  } catch (error) {
    if (dbClient) await dbClient.query('ROLLBACK');
    logger.error('Erro durante a sincronizacao', { details: error.message });
    res.status(isValidationError(error) ? 400 : 500).json({
      error: 'Erro durante a sincronizacao',
    });
  } finally {
    if (dbClient) dbClient.release();
  }
};

module.exports = {
  protectSyncRecord,
  revealSyncRows,
  syncData,
};
