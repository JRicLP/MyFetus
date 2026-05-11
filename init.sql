-- =====================================================
-- 🧠 BANCO DE DADOS - MyFetus
-- Criação e inicialização das tabelas principais
-- =====================================================

-- =====================================================
-- TABELA USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    birthdate DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- =====================================================
-- TABELA PREGNANTS
-- =====================================================
CREATE TABLE IF NOT EXISTS pregnants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1,

    altura DOUBLE PRECISION,
    peso_pregestacional DOUBLE PRECISION,
    peso_atual DOUBLE PRECISION,
    temperatura_materna DOUBLE PRECISION,
    pressao_sistole INTEGER DEFAULT 0,   
    pressao_diastole INTEGER DEFAULT 0,  


    antecedentes_diabetes BOOLEAN DEFAULT FALSE,
    antecedentes_hipertensao BOOLEAN DEFAULT FALSE,
    antecedentes_gemelar BOOLEAN DEFAULT FALSE,
    antecedentes_outros BOOLEAN DEFAULT FALSE,
    antecedentes_texto TEXT,

    gestacao_partos INTEGER DEFAULT 0,
    gestacao_vaginal INTEGER DEFAULT 0,
    gestacao_cesarea INTEGER DEFAULT 0,
    gestacao_bebe_maior_45 BOOLEAN DEFAULT FALSE,
    gestacao_bebe_maior_25 BOOLEAN DEFAULT FALSE,
    gestacao_eclampsia_pre_eclampsia BOOLEAN DEFAULT FALSE,
    gestacao_gestas BOOLEAN DEFAULT FALSE,
    gestacao_abortos INTEGER DEFAULT 0,
    gestacao_mais_tres_abortos BOOLEAN DEFAULT FALSE,
    gestacao_nascidos_vivos INTEGER DEFAULT 0,
    gestacao_nascidos_mortos INTEGER DEFAULT 0,
    gestacao_vivem INTEGER DEFAULT 0,
    gestacao_mortos_primeira_semana INTEGER DEFAULT 0,
    gestacao_mortos_depois_primeira_semana INTEGER DEFAULT 0,
    gestacao_final_gestacao_anterior_1ano BOOLEAN DEFAULT FALSE,

    antecedentes_clinicos_diabetes BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_infeccao_urinaria BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_infertilidade BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_dific_amamentacao BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_cardiopatia BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_tromboembolismo BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_hipertensao_arterial BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_cirur_per_uterina BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_cirurgia BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_outros BOOLEAN DEFAULT FALSE,
    antecedentes_clinicos_outros_texto TEXT,

    gestacao_atual_fumante BOOLEAN DEFAULT FALSE,
    gestacao_atual_quant_cigarros INTEGER DEFAULT 0,
    gestacao_atual_alcool BOOLEAN DEFAULT FALSE,
    gestacao_atual_outras_drogas BOOLEAN DEFAULT FALSE,
    gestacao_atual_hiv_aids BOOLEAN DEFAULT FALSE,
    gestacao_atual_sifilis BOOLEAN DEFAULT FALSE,
    gestacao_atual_toxoplasmose BOOLEAN DEFAULT FALSE,
    gestacao_atual_infeccao_urinaria BOOLEAN DEFAULT FALSE,
    gestacao_atual_anemia BOOLEAN DEFAULT FALSE,
    gestacao_atual_inc_istmocervical BOOLEAN DEFAULT FALSE,
    gestacao_atual_ameaca_parto_premat BOOLEAN DEFAULT FALSE,
    gestacao_atual_imuniz_rh BOOLEAN DEFAULT FALSE,
    gestacao_atual_oligo_polidramio BOOLEAN DEFAULT FALSE,
    gestacao_atual_rut_prem_membrana BOOLEAN DEFAULT FALSE,
    gestacao_atual_ciur BOOLEAN DEFAULT FALSE,
    gestacao_atual_pos_datismo BOOLEAN DEFAULT FALSE,
    gestacao_atual_febre BOOLEAN DEFAULT FALSE,
    gestacao_atual_hipertensao_arterial BOOLEAN DEFAULT FALSE,
    gestacao_atual_pre_eclamp_eclamp BOOLEAN DEFAULT FALSE,
    gestacao_atual_cardiopatia BOOLEAN DEFAULT FALSE,
    gestacao_atual_diabete_gestacional BOOLEAN DEFAULT FALSE,
    gestacao_atual_uso_insulina BOOLEAN DEFAULT FALSE,
    gestacao_atual_hemorragia_1trim BOOLEAN DEFAULT FALSE,
    gestacao_atual_hemorragia_2trim BOOLEAN DEFAULT FALSE,
    gestacao_atual_hemorragia_3trim BOOLEAN DEFAULT FALSE,

    exantema_rash BOOLEAN DEFAULT FALSE,

    vacina_antitetanica BOOLEAN DEFAULT FALSE,
    vacina_antitetanica_1dose TIMESTAMP,
    vacina_antitetanica_2dose TIMESTAMP,
    vacina_antitetanica_dtpa TIMESTAMP,

    vacina_hepatite_b BOOLEAN DEFAULT FALSE,
    vacina_hepatite_b_1dose TIMESTAMP,
    vacina_hepatite_b_2dose TIMESTAMP,
    vacina_hepatite_b_3dose TIMESTAMP,

    vacina_influenza BOOLEAN DEFAULT FALSE,
    vacina_influenza_1dose TIMESTAMP,

    vacina_covid19 BOOLEAN DEFAULT FALSE,
    vacina_covid19_1dose TIMESTAMP,
    vacina_covid19_2dose TIMESTAMP,

    info_gerais_edemas TEXT,
    info_gerais_sintomas TEXT,
    info_gerais_estado_geral_1 TEXT,
    info_gerais_estado_geral_2 TEXT,
    info_gerais_nutricional TEXT,
    info_gerais_psicossocial TEXT
);

-- =====================================================
-- TABELA PREGNANCIES
-- =====================================================
CREATE TABLE IF NOT EXISTS pregnancies (
    id SERIAL PRIMARY KEY,
    pregnant_id INTEGER REFERENCES pregnants(id) ON DELETE CASCADE,
    weeks INTEGER DEFAULT 0,
    is_checked BOOLEAN DEFAULT FALSE,
    dum DATE NOT NULL,
    dpp DATE NOT NULL,
    ccn FLOAT DEFAULT 0.0,
    dgm FLOAT DEFAULT 0.0,
    glicemia DOUBLE PRECISION,
    frequencia_cardiaca INTEGER DEFAULT 0,
    altura_uterina DOUBLE PRECISION DEFAULT 0, 
    regularidade_do_ciclo BOOLEAN DEFAULT TRUE,
    ig_ultrassonografia DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- =====================================================
-- TABELA PREGNANCY_EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS pregnancy_events (
    id SERIAL PRIMARY KEY,
    pregnancy_id INTEGER REFERENCES pregnancies(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    data_evento DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- =====================================================
-- TABELA PREGNANT_DOCUMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS pregnant_documents (
    id SERIAL PRIMARY KEY,
    pregnant_id INTEGER REFERENCES pregnants(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1
);

-- =====================================================
-- TABELA MEDIDAS_FETAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS medidas_fetais (
    id SERIAL PRIMARY KEY,
    ccn FLOAT DEFAULT 0.0,
    crl FLOAT DEFAULT 0.0,
    dgn FLOAT DEFAULT 0.0,
    idade_gestacional_semanas INTEGER NOT NULL
);

-- =====================================================
-- TABELA SYNC_QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS sync_queue (
        id SERIAL PRIMARY KEY,
        op_id UUID UNIQUE NOT NULL,
        client_id TEXT NOT NULL,
        entity_table TEXT NOT NULL,
        entity_id INTEGER,
        operation TEXT NOT NULL,
        payload JSONB,
        base_version INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue (status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue (entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_client ON sync_queue (client_id, created_at);

-- =====================================================
-- TRIGGERS DE UPDATED_AT E VERSION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_and_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    IF TG_OP = 'UPDATE' THEN
        NEW.version = COALESCE(NEW.version, 1) + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnants_updated_at ON pregnants;
CREATE TRIGGER trg_pregnants_updated_at
BEFORE UPDATE ON pregnants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnancies_updated_at ON pregnancies;
CREATE TRIGGER trg_pregnancies_updated_at
BEFORE UPDATE ON pregnancies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnancy_events_updated_at ON pregnancy_events;
CREATE TRIGGER trg_pregnancy_events_updated_at
BEFORE UPDATE ON pregnancy_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_and_version();

DROP TRIGGER IF EXISTS trg_pregnant_documents_updated_at ON pregnant_documents;
CREATE TRIGGER trg_pregnant_documents_updated_at
BEFORE UPDATE ON pregnant_documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_and_version();
