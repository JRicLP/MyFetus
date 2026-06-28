const SYNC_TABLES = Object.freeze({
  users: {
    pullColumns: [
      'id', 'name', 'email', 'birthdate', 'is_active', 'role',
      'created_at', 'updated_at',
    ],
    blockedWriteColumns: new Set([
      'id', 'name', 'email', 'password', 'birthdate', 'is_active', 'role',
      'created_at', 'updated_at',
    ]),
  },
  pregnants: {
    pullColumns: ['*'],
    blockedWriteColumns: new Set(['id', 'created_at', 'updated_at']),
  },
  pregnancies: {
    pullColumns: ['*'],
    blockedWriteColumns: new Set(['id', 'created_at', 'updated_at']),
  },
  pregnancy_events: {
    pullColumns: ['*'],
    blockedWriteColumns: new Set(['id', 'created_at', 'updated_at']),
  },
  pregnant_documents: {
    pullColumns: ['*'],
    blockedWriteColumns: new Set([
      'id', 'file_path', 'created_at', 'uploaded_at', 'updated_at',
    ]),
  },
  medidas_fetais: {
    pullColumns: ['*'],
    blockedWriteColumns: new Set(['id', 'created_at', 'updated_at']),
  },
});

function quoteIdentifier(identifier) {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    throw new Error(`Identificador invalido: ${identifier}`);
  }
  return `"${identifier}"`;
}

function validateChanges(changes) {
  if (changes === undefined || changes === null) return;
  if (typeof changes !== 'object' || Array.isArray(changes)) {
    throw new Error('changes deve ser um objeto');
  }

  for (const [table, tableChanges] of Object.entries(changes)) {
    if (!SYNC_TABLES[table]) {
      throw new Error(`Tabela nao permitida para sincronizacao: ${table}`);
    }
    if (!tableChanges || typeof tableChanges !== 'object' || Array.isArray(tableChanges)) {
      throw new Error(`Alteracoes invalidas para a tabela ${table}`);
    }
    for (const operation of ['created', 'updated']) {
      if (tableChanges[operation] !== undefined && !Array.isArray(tableChanges[operation])) {
        throw new Error(`${table}.${operation} deve ser um array`);
      }
    }
  }
}

function getWritableEntries(record, table, tableColumns) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(`Registro invalido para a tabela ${table}`);
  }
  if (!SYNC_TABLES[table]) {
    throw new Error(`Tabela nao permitida para sincronizacao: ${table}`);
  }

  const config = SYNC_TABLES[table];
  const entries = Object.entries(record).filter(([column, value]) => (
    value !== undefined &&
    tableColumns.has(column) &&
    !config.blockedWriteColumns.has(column)
  ));

  if (entries.length === 0) {
    throw new Error(`Nenhum campo gravavel informado para a tabela ${table}`);
  }

  entries.forEach(([column]) => quoteIdentifier(column));
  return entries;
}

module.exports = {
  SYNC_TABLES,
  getWritableEntries,
  quoteIdentifier,
  validateChanges,
};
