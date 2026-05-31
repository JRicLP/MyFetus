/**
 * loincInitializer.js
 * 
 * Responsável por carregar o catálogo LOINC no banco de dados.
 * 
 * Estratégia:
 * 1. Criar a tabela loinc_codes se não existir
 * 2. Verificar se a tabela tem registros
 * 3. Se vazia, inserir o catálogo inicial de termos frequentes
 * 4. No futuro, integrar com download de CSV do LOINC oficial
 */

const pool = require('../backend').pool; // Usa o pool da conexão principal

const INITIAL_LOINC_CATALOG = [
  {
    loinc: '718-7',
    canonicalTerm: 'Hemoglobina',
    aliases: ['hb', 'hemoglobin', 'hemoglobina', 'hemoglobina total'],
    category: 'hematologia',
    specimen: 'sangue',
    unit: 'g/dL',
  },
  {
    loinc: '4544-3',
    canonicalTerm: 'Hematócrito',
    aliases: ['hematocrito', 'hct', 'hematócrito'],
    category: 'hematologia',
    specimen: 'sangue',
    unit: '%',
  },
  {
    loinc: '6690-2',
    canonicalTerm: 'Leucócitos',
    aliases: ['leucocitos', 'wbc', 'white blood cells', 'leucócitos'],
    category: 'hematologia',
    specimen: 'sangue',
    unit: '10^3/uL',
  },
  {
    loinc: '777-3',
    canonicalTerm: 'Plaquetas',
    aliases: ['plaquetas', 'platelets', 'plt'],
    category: 'hematologia',
    specimen: 'sangue',
    unit: '10^3/uL',
  },
  {
    loinc: '2345-7',
    canonicalTerm: 'Glicose',
    aliases: ['glicose', 'glucose', 'glicemia'],
    category: 'bioquimica',
    specimen: 'sangue',
    unit: 'mg/dL',
  },
  {
    loinc: '2160-0',
    canonicalTerm: 'Creatinina',
    aliases: ['creatinina', 'creatinine'],
    category: 'bioquimica',
    specimen: 'sangue',
    unit: 'mg/dL',
  },
  {
    loinc: '3094-0',
    canonicalTerm: 'Ureia',
    aliases: ['ureia', 'urea nitrogen', 'bun'],
    category: 'bioquimica',
    specimen: 'sangue',
    unit: 'mg/dL',
  },
  {
    loinc: '1920-8',
    canonicalTerm: 'AST/TGO',
    aliases: ['ast', 'tgo', 'ast/tgo', 'aspartate aminotransferase'],
    category: 'enzimas',
    specimen: 'sangue',
    unit: 'U/L',
  },
  {
    loinc: '1742-6',
    canonicalTerm: 'ALT/TGP',
    aliases: ['alt', 'tgp', 'alt/tgp', 'alanine aminotransferase'],
    category: 'enzimas',
    specimen: 'sangue',
    unit: 'U/L',
  },
  {
    loinc: '2276-4',
    canonicalTerm: 'Ferritina',
    aliases: ['ferritina', 'ferritin'],
    category: 'estoque de ferro',
    specimen: 'sangue',
    unit: 'ng/mL',
  },
];

/**
 * Inicializa a tabela LOINC com dados iniciais
 */
async function initializeLoincTable() {
  try {
    // 1. Criar a tabela se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loinc_codes (
        id SERIAL PRIMARY KEY,
        loinc VARCHAR(10) UNIQUE NOT NULL,
        canonical_term VARCHAR(255) NOT NULL,
        aliases TEXT,
        category VARCHAR(100),
        specimen VARCHAR(100),
        unit VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Criar índices se não existirem
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loinc_code ON loinc_codes(loinc);
      CREATE INDEX IF NOT EXISTS idx_canonical_term ON loinc_codes(canonical_term);
      CREATE INDEX IF NOT EXISTS idx_category ON loinc_codes(category);
    `);

    // 3. Criar trigger de updated_at se não existir
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS \$\$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      \$\$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_loinc_codes_updated_at ON loinc_codes;
      CREATE TRIGGER update_loinc_codes_updated_at
        BEFORE UPDATE ON loinc_codes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // 4. Verificar se já existem registros
    const countResult = await pool.query('SELECT COUNT(*) as count FROM loinc_codes');
    const recordCount = countResult.rows[0]?.count || 0;

    if (recordCount > 0) {
      console.log(`✓ Tabela loinc_codes já contém ${recordCount} registros. Inicialização pulada.`);
      return;
    }

    // 5. Inserir o catálogo inicial
    for (const entry of INITIAL_LOINC_CATALOG) {
      const aliasesJson = JSON.stringify(entry.aliases);
      await pool.query(
        `INSERT INTO loinc_codes (loinc, canonical_term, aliases, category, specimen, unit)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (loinc) DO NOTHING`,
        [entry.loinc, entry.canonicalTerm, aliasesJson, entry.category, entry.specimen, entry.unit]
      );
    }

    console.log(`✓ Carregados ${INITIAL_LOINC_CATALOG.length} códigos LOINC iniciais no banco de dados`);
  } catch (error) {
    console.error('Erro ao inicializar tabela LOINC:', error.message);
    throw error;
  }
}

/**
 * Obtém todos os códigos LOINC do banco de dados e os formata como objetos
 */
async function getLoincCatalogFromDb() {
  try {
    const result = await pool.query('SELECT * FROM loinc_codes ORDER BY loinc');
    return result.rows.map((row) => ({
      loinc: row.loinc,
      canonicalTerm: row.canonical_term,
      aliases: JSON.parse(row.aliases || '[]'),
      category: row.category,
      specimen: row.specimen,
      unit: row.unit,
    }));
  } catch (error) {
    console.error('Erro ao recuperar catálogo LOINC do banco:', error.message);
    return INITIAL_LOINC_CATALOG; // Fallback para catálogo inicial
  }
}

module.exports = {
  initializeLoincTable,
  getLoincCatalogFromDb,
  INITIAL_LOINC_CATALOG,
};
