const client = require('../backend');

const syncData = async (req, res) => {
  const { last_sync_timestamp, changes } = req.body;
  const newSyncTimestamp = new Date().toISOString();

  const dbClient = await client.connect();

  try {
    await dbClient.query('BEGIN');

    // Fase 1: Processar as alterações do cliente (Push)
    if (changes) {
      for (const table in changes) {
        const { created, updated } = changes[table];

        // Processar criações
        if (created && created.length > 0) {
          for (const record of created) {
            const columns = Object.keys(record).join(', ');
            const values = Object.values(record);
            const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');
            
            const query = `INSERT INTO ${table} (${columns}) VALUES (${valuePlaceholders}) RETURNING *`;
            await dbClient.query(query, values);
          }
        }

        // Processar atualizações
        if (updated && updated.length > 0) {
          for (const record of updated) {
            const { id, ...updateData } = record;
            const setClauses = Object.keys(updateData).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const values = Object.values(updateData);
            
            const query = `UPDATE ${table} SET ${setClauses} WHERE id = $${values.length + 1}`;
            await dbClient.query(query, [...values, id]);
          }
        }
      }
    }

    // Fase 2: Buscar as alterações do servidor (Pull)
    const serverChanges = {};
    const tablesToSync = ['users', 'pregnants', 'pregnancies', 'pregnancy_events', 'pregnant_documents', 'medidas_fetais'];
    
    for (const table of tablesToSync) {
      let query;
      const params = [];
      
      if (last_sync_timestamp) {
        query = `SELECT * FROM ${table} WHERE updated_at > $1`;
        params.push(last_sync_timestamp);
      } else {
        query = `SELECT * FROM ${table}`;
      }
      
      const result = await dbClient.query(query, params);
      if (result.rows.length > 0) {
        // Para simplificar, estamos enviando todos os registros que mudaram.
        // O cliente precisará diferenciar entre 'created' e 'updated' com base nos IDs que ele já conhece.
        serverChanges[table] = {
          created: [], // Lógica de diferenciação pode ser adicionada aqui ou no cliente
          updated: result.rows
        };
      }
    }

    await dbClient.query('COMMIT');

    res.status(200).json({
      new_sync_timestamp: newSyncTimestamp,
      server_changes: serverChanges
    });

  } catch (error) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ error: 'Erro durante a sincronização', details: error.message });
  } finally {
    dbClient.release();
  }
};

module.exports = {
  syncData,
};
