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
--   - documents: Armazenamento de documentos das gestantes.
--   - fetal_measurements: Referência com medidas esperadas do feto por idade gestacional.

-- Retorno:
--   - Estruturas físicas das tabelas criadas no banco de dados com chaves primárias,
--     estrangeiras e restrições de integridade referencial, preparadas para uso
--     conjunto com as triggers definidas em "triggers.sql".
-- ===============================================

-- Habilita a extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- Tabela de usuários (Users)
-- ===============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  birth_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de gestantes (Pregnants)
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Anthropometric Data
  height DOUBLE PRECISION,
  pre_pregnancy_weight DOUBLE PRECISION,
  current_weight DOUBLE PRECISION,
  maternal_temperature DOUBLE PRECISION,

  -- Obstetric History
  has_diabetes_history BOOLEAN DEFAULT FALSE,
  has_hypertension_history BOOLEAN DEFAULT FALSE,
  has_twin_pregnancy_history BOOLEAN DEFAULT FALSE,
  has_other_history BOOLEAN DEFAULT FALSE,
  other_history_description TEXT,

  previous_births INTEGER DEFAULT 0,
  vaginal_births INTEGER DEFAULT 0,
  cesarean_births INTEGER DEFAULT 0,
  had_baby_over_4_5kg BOOLEAN DEFAULT FALSE,
  had_baby_under_2_5kg BOOLEAN DEFAULT FALSE,
  had_eclampsia BOOLEAN DEFAULT FALSE,
  is_multiparous BOOLEAN DEFAULT FALSE, -- Renamed from gestacao_gestas
  abortions INTEGER DEFAULT 0,
  had_three_or_more_abortions BOOLEAN DEFAULT FALSE,
  live_births INTEGER DEFAULT 0,
  stillbirths INTEGER DEFAULT 0,
  children_alive INTEGER DEFAULT 0,
  deaths_first_week INTEGER DEFAULT 0,
  deaths_after_first_week INTEGER DEFAULT 0,
  last_pregnancy_ended_less_than_a_year_ago BOOLEAN DEFAULT FALSE,

  -- Clinical History
  has_clinical_diabetes_history BOOLEAN DEFAULT FALSE,
  has_urinary_tract_infection_history BOOLEAN DEFAULT FALSE,
  has_infertility_history BOOLEAN DEFAULT FALSE,
  has_breastfeeding_difficulty_history BOOLEAN DEFAULT FALSE,
  has_cardiopathy_history BOOLEAN DEFAULT FALSE,
  has_thromboembolism_history BOOLEAN DEFAULT FALSE,
  has_clinical_hypertension_history BOOLEAN DEFAULT FALSE,
  has_uterine_surgery_history BOOLEAN DEFAULT FALSE,
  has_surgery_history BOOLEAN DEFAULT FALSE,
  has_other_clinical_history BOOLEAN DEFAULT FALSE,
  other_clinical_history_description TEXT,

  -- Current Pregnancy
  is_smoker BOOLEAN DEFAULT FALSE,
  cigarettes_per_day INTEGER DEFAULT 0,
  consumes_alcohol BOOLEAN DEFAULT FALSE,
  uses_other_drugs BOOLEAN DEFAULT FALSE,
  is_hiv_positive BOOLEAN DEFAULT FALSE,
  has_syphilis BOOLEAN DEFAULT FALSE,
  has_toxoplasmosis BOOLEAN DEFAULT FALSE,
  has_urinary_tract_infection BOOLEAN DEFAULT FALSE,
  has_anemia BOOLEAN DEFAULT FALSE,
  has_isthmic_cervical_insufficiency BOOLEAN DEFAULT FALSE,
  has_threatened_preterm_labor BOOLEAN DEFAULT FALSE,
  has_rh_immunization BOOLEAN DEFAULT FALSE,
  has_oligohydramnios_polyhydramnios BOOLEAN DEFAULT FALSE,
  has_premature_rupture_of_membranes BOOLEAN DEFAULT FALSE,
  has_iugr BOOLEAN DEFAULT FALSE, -- Intrauterine Growth Restriction
  is_post_term BOOLEAN DEFAULT FALSE,
  has_fever BOOLEAN DEFAULT FALSE,
  has_hypertension BOOLEAN DEFAULT FALSE,
  has_preeclampsia BOOLEAN DEFAULT FALSE,
  has_cardiopathy BOOLEAN DEFAULT FALSE,
  has_gestational_diabetes BOOLEAN DEFAULT FALSE,
  uses_insulin BOOLEAN DEFAULT FALSE,
  had_first_trimester_bleeding BOOLEAN DEFAULT FALSE,
  had_second_trimester_bleeding BOOLEAN DEFAULT FALSE,
  had_third_trimester_bleeding BOOLEAN DEFAULT FALSE,
  has_exanthema BOOLEAN DEFAULT FALSE,

  -- Vaccines
  tetanus_vaccine_doses INTEGER DEFAULT 0,
  tetanus_vaccine_dose1_date TIMESTAMPTZ,
  tetanus_vaccine_dose2_date TIMESTAMPTZ,
  tetanus_vaccine_dtpa_date TIMESTAMPTZ,

  has_hepatitis_b_vaccine BOOLEAN DEFAULT FALSE,
  hepatitis_b_vaccine_dose1_date TIMESTAMPTZ,
  hepatitis_b_vaccine_dose2_date TIMESTAMPTZ,
  hepatitis_b_vaccine_dose3_date TIMESTAMPTZ,

  has_influenza_vaccine BOOLEAN DEFAULT FALSE,
  influenza_vaccine_dose1_date TIMESTAMPTZ,

  has_covid_vaccine BOOLEAN DEFAULT FALSE,
  covid_vaccine_dose1_date TIMESTAMPTZ,
  covid_vaccine_dose2_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de gestações (Pregnancies)
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnant_id UUID REFERENCES pregnants(id) ON DELETE CASCADE,
  gestational_age_weeks INTEGER NOT NULL,
  last_menstrual_period_date DATE NOT NULL,
  expected_delivery_date DATE NOT NULL,
  crown_rump_length DOUBLE PRECISION NOT NULL DEFAULT 0.00,
  dgm DOUBLE PRECISION NOT NULL DEFAULT 0.00,
  blood_glucose_level DOUBLE PRECISION DEFAULT 0,
  heart_rate INTEGER DEFAULT 0,
  has_regular_cycle BOOLEAN DEFAULT TRUE,
  ultrasound_gestational_age_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de eventos da gestação
-- ===============================================
CREATE TABLE IF NOT EXISTS pregnancy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnancy_id UUID REFERENCES pregnancies(id) ON DELETE CASCADE,
  descr TEXT NOT NULL,
  event_data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de documentos da gestante
-- ===============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pregnant_id UUID NOT NULL REFERENCES pregnants(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- Tabela de medidas fetais
-- ===============================================
CREATE TABLE IF NOT EXISTS fetal_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crown_lump_length FLOAT NOT NULL DEFAULT 0.00,
  dgn FLOAT NOT NULL DEFAULT 0.00,
  gestational_age_weeks INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
