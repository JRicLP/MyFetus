-- ===============================================
-- BANCO DE DADOS: MyFetus
-- ===============================================
-- Definição:
--   Estrutura de criação das tabelas principais do sistema MyFetus,
--   responsável por armazenar dados de usuários, gestantes, gestações,
--   eventos gestacionais, documentos e medidas fetais.

-- Parâmetros ou Atributos:
--   - users: Cadastro de usuários do sistema.
--   - pregnants: Dados clínicos e antecedentes das gestantes.
--   - pregnancies: Informações de cada gestação registrada.
--   - pregnancy_events: Registro de eventos e intercorrências gestacionais.
--   - pregnant_documents: Armazenamento de documentos das gestantes.
--   - medidas_fetais: Referência com medidas esperadas do feto por idade gestacional.

-- Retorno:
--   - Estruturas físicas das tabelas criadas no banco de dados com chaves primárias,
--     estrangeiras e restrições de integridade referencial, preparadas para uso
--     conjunto com as triggers definidas em "triggers.sql".
-- ===============================================

-- ===============================================
-- Tabela de usuários
-- ===============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  birthdate DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de gestantes
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Dados antropométricos
  altura DOUBLE PRECISION,
  peso_pre_gestacional DOUBLE PRECISION,
  peso_atual DOUBLE PRECISION,
  temperatura_materna DOUBLE PRECISION,

  -- Antecedentes obstétricos
  antecedentes_diabetes BOOLEAN DEFAULT FALSE,
  antecedentes_hipertensao BOOLEAN DEFAULT FALSE,
  antecedentes_gemelar BOOLEAN DEFAULT FALSE,
  antecedentes_outros BOOLEAN DEFAULT FALSE,
  antecedentes_outros_texto TEXT,

  gestacao_partos INTEGER DEFAULT 0,
  gestacao_vaginal INTEGER DEFAULT 0,
  gestacao_cesarea INTEGER DEFAULT 0,
  gestacao_bebe_maior_45 BOOLEAN DEFAULT FALSE,
  gestacao_bebe_maior_25 BOOLEAN DEFAULT FALSE,
  gestacao_eclampsia BOOLEAN DEFAULT FALSE,
  gestacao_gestas BOOLEAN DEFAULT FALSE,
  gestacao_abortos INTEGER DEFAULT 0,
  gestacao_mais_tres_abortos BOOLEAN DEFAULT FALSE,
  gestacao_nascidos_vivos INTEGER DEFAULT 0,
  gestacao_nascidos_mortos INTEGER DEFAULT 0,
  gestacao_vivem INTEGER DEFAULT 0,
  gestacao_mortos_primeira_semana INTEGER DEFAULT 0,
  gestacao_mortos_depois_primeira_semana INTEGER DEFAULT 0,
  gestacao_final_anterior_um_ano BOOLEAN DEFAULT FALSE,

  -- Antecedentes clínicos
  antecedentes_clinicos_diabetes BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_infeccao_urinaria BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_infertilidade BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_dific_amamentacao BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_cardiopatia BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_tromboembolismo BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_hipertensao BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_cirur_per_uterina BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_cirurgia BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_outros BOOLEAN DEFAULT FALSE,
  antecedentes_clinicos_outros_texto TEXT,

  -- Gestação atual
  gestacao_atual_fumante BOOLEAN DEFAULT FALSE,
  gestacao_atual_qtd_cigarros INTEGER DEFAULT 0,
  gestacao_atual_alcool BOOLEAN DEFAULT FALSE,
  gestacao_atual_outras_drogas BOOLEAN DEFAULT FALSE,
  gestacao_atual_hiv BOOLEAN DEFAULT FALSE,
  gestacao_atual_sifilis BOOLEAN DEFAULT FALSE,
  gestacao_atual_toxoplasmose BOOLEAN DEFAULT FALSE,
  gestacao_atual_infeccao_urinaria BOOLEAN DEFAULT FALSE,
  gestacao_atual_anemia BOOLEAN DEFAULT FALSE,
  gestacao_atual_insuficiencia_istmocervical BOOLEAN DEFAULT FALSE,
  gestacao_atual_ameaca_parto_prematuro BOOLEAN DEFAULT FALSE,
  gestacao_atual_imunizacao_rh BOOLEAN DEFAULT FALSE,
  gestacao_atual_oligo_polidramnio BOOLEAN DEFAULT FALSE,
  gestacao_atual_ruptura_prematura_membranas BOOLEAN DEFAULT FALSE,
  gestacao_atual_ciur BOOLEAN DEFAULT FALSE,
  gestacao_atual_pos_datismo BOOLEAN DEFAULT FALSE,
  gestacao_atual_febre BOOLEAN DEFAULT FALSE,
  gestacao_atual_hipertensao BOOLEAN DEFAULT FALSE,
  gestacao_atual_pre_eclampsia BOOLEAN DEFAULT FALSE,
  gestacao_atual_cardiopatia BOOLEAN DEFAULT FALSE,
  gestacao_atual_diabete_gestacional BOOLEAN DEFAULT FALSE,
  gestacao_atual_uso_insulina BOOLEAN DEFAULT FALSE,
  gestacao_atual_hemorragia_1tri BOOLEAN DEFAULT FALSE,
  gestacao_atual_hemorragia_2tri BOOLEAN DEFAULT FALSE,
  gestacao_atual_hemorragia_3tri BOOLEAN DEFAULT FALSE,
  gestacao_atual_exantema BOOLEAN DEFAULT FALSE,

  -- Vacinas
  vacinas_antitetanica INTEGER DEFAULT 0,
  vacinas_antitetanica_1dose TIMESTAMP,
  vacinas_antitetanica_2dose TIMESTAMP,
  vacinas_antitetanica_dtpa TIMESTAMP,

  vacinas_hepatiteb BOOLEAN DEFAULT FALSE,
  vacinas_hepatiteb_1dose TIMESTAMP,
  vacinas_hepatiteb_2dose TIMESTAMP,
  vacinas_hepatiteb_3dose TIMESTAMP,

  vacinas_influenza BOOLEAN DEFAULT FALSE,
  vacinas_influenza_1dose TIMESTAMP,

  vacinas_covid BOOLEAN DEFAULT FALSE,
  vacinas_covid_1dose TIMESTAMP,
  vacinas_covid_2dose TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de gestações
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnancies (
  id SERIAL PRIMARY KEY,
  pregnant_id INTEGER REFERENCES pregnants(id) ON DELETE CASCADE,
  weeks INTEGER NOT NULL,
  dum DATE NOT NULL,
  dpp DATE NOT NULL,
  ccn FLOAT NOT NULL DEFAULT 0.00,
  dgm FLOAT NOT NULL DEFAULT 0.00,
  glicemia DOUBLE PRECISION DEFAULT 0,
  frequencia_cardiaca INTEGER DEFAULT 0,
  regularidade_do_ciclo BOOLEAN DEFAULT TRUE,
  ig_ultrassonografia DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de eventos da gestação
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnancy_events (
  id SERIAL PRIMARY KEY,
  pregnancy_id INTEGER REFERENCES pregnancies(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data_evento DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de documentos da gestante
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnant_documents (
  id SERIAL PRIMARY KEY,
  pregnant_id INTEGER NOT NULL REFERENCES pregnants(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de medidas fetais
-- ===============================================
CREATE TABLE IF NOT EXISTS medidas_fetais (
  id SERIAL PRIMARY KEY,
  ccn FLOAT NOT NULL DEFAULT 0.00,
  crl FLOAT NOT NULL DEFAULT 0.00,
  dgn FLOAT NOT NULL DEFAULT 0.00,
  idade_gestacional_semanas INTEGER NOT NULL
);
