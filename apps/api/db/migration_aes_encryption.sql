-- Prepares classified columns for AES-256-GCM envelopes, lookup hashes and
-- encryption key version tracking. Existing plaintext remains readable by the
-- application and is migrated opportunistically on subsequent writes/login.

DO $$
DECLARE
  item RECORD;
BEGIN
  FOR item IN
    SELECT *
    FROM (VALUES
      ('users', 'name'), ('users', 'email'), ('users', 'birthdate'),
      ('doctors', 'crm'), ('doctors', 'crm_estado'), ('doctors', 'telefone'),
      ('pregnants', 'altura'),
      ('pregnants', 'peso_pregestacional'),
      ('pregnants', 'peso_atual'),
      ('pregnants', 'temperatura_materna'),
      ('pregnants', 'pressao_sistole'),
      ('pregnants', 'pressao_diastole'),
      ('pregnants', 'antecedentes_diabetes'),
      ('pregnants', 'antecedentes_hipertensao'),
      ('pregnants', 'antecedentes_gemelar'),
      ('pregnants', 'antecedentes_outros'),
      ('pregnants', 'antecedentes_texto'),
      ('pregnants', 'gestacao_partos'),
      ('pregnants', 'gestacao_vaginal'),
      ('pregnants', 'gestacao_cesarea'),
      ('pregnants', 'gestacao_bebe_maior_45'),
      ('pregnants', 'gestacao_bebe_maior_25'),
      ('pregnants', 'gestacao_eclampsia_pre_eclampsia'),
      ('pregnants', 'gestacao_gestas'),
      ('pregnants', 'gestacao_abortos'),
      ('pregnants', 'gestacao_mais_tres_abortos'),
      ('pregnants', 'gestacao_nascidos_vivos'),
      ('pregnants', 'gestacao_nascidos_mortos'),
      ('pregnants', 'gestacao_vivem'),
      ('pregnants', 'gestacao_mortos_primeira_semana'),
      ('pregnants', 'gestacao_mortos_depois_primeira_semana'),
      ('pregnants', 'gestacao_final_gestacao_anterior_1ano'),
      ('pregnants', 'antecedentes_clinicos_diabetes'),
      ('pregnants', 'antecedentes_clinicos_infeccao_urinaria'),
      ('pregnants', 'antecedentes_clinicos_infertilidade'),
      ('pregnants', 'antecedentes_clinicos_dific_amamentacao'),
      ('pregnants', 'antecedentes_clinicos_cardiopatia'),
      ('pregnants', 'antecedentes_clinicos_tromboembolismo'),
      ('pregnants', 'antecedentes_clinicos_hipertensao_arterial'),
      ('pregnants', 'antecedentes_clinicos_cirur_per_uterina'),
      ('pregnants', 'antecedentes_clinicos_cirurgia'),
      ('pregnants', 'antecedentes_clinicos_outros'),
      ('pregnants', 'antecedentes_clinicos_outros_texto'),
      ('pregnants', 'gestacao_atual_fumante'),
      ('pregnants', 'gestacao_atual_quant_cigarros'),
      ('pregnants', 'gestacao_atual_alcool'),
      ('pregnants', 'gestacao_atual_outras_drogas'),
      ('pregnants', 'gestacao_atual_hiv_aids'),
      ('pregnants', 'gestacao_atual_sifilis'),
      ('pregnants', 'gestacao_atual_toxoplasmose'),
      ('pregnants', 'gestacao_atual_infeccao_urinaria'),
      ('pregnants', 'gestacao_atual_anemia'),
      ('pregnants', 'gestacao_atual_inc_istmocervical'),
      ('pregnants', 'gestacao_atual_ameaca_parto_premat'),
      ('pregnants', 'gestacao_atual_imuniz_rh'),
      ('pregnants', 'gestacao_atual_oligo_polidramio'),
      ('pregnants', 'gestacao_atual_rut_prem_membrana'),
      ('pregnants', 'gestacao_atual_ciur'),
      ('pregnants', 'gestacao_atual_pos_datismo'),
      ('pregnants', 'gestacao_atual_febre'),
      ('pregnants', 'gestacao_atual_hipertensao_arterial'),
      ('pregnants', 'gestacao_atual_pre_eclamp_eclamp'),
      ('pregnants', 'gestacao_atual_cardiopatia'),
      ('pregnants', 'gestacao_atual_diabete_gestacional'),
      ('pregnants', 'gestacao_atual_uso_insulina'),
      ('pregnants', 'gestacao_atual_hemorragia_1trim'),
      ('pregnants', 'gestacao_atual_hemorragia_2trim'),
      ('pregnants', 'gestacao_atual_hemorragia_3trim'),
      ('pregnants', 'exantema_rash'),
      ('pregnants', 'vacina_antitetanica'),
      ('pregnants', 'vacina_antitetanica_1dose'),
      ('pregnants', 'vacina_antitetanica_2dose'),
      ('pregnants', 'vacina_antitetanica_dtpa'),
      ('pregnants', 'vacina_hepatite_b'),
      ('pregnants', 'vacina_hepatite_b_1dose'),
      ('pregnants', 'vacina_hepatite_b_2dose'),
      ('pregnants', 'vacina_hepatite_b_3dose'),
      ('pregnants', 'vacina_influenza'),
      ('pregnants', 'vacina_influenza_1dose'),
      ('pregnants', 'vacina_covid19'),
      ('pregnants', 'vacina_covid19_1dose'),
      ('pregnants', 'vacina_covid19_2dose'),
      ('pregnants', 'info_gerais_edemas'),
      ('pregnants', 'info_gerais_sintomas'),
      ('pregnants', 'info_gerais_estado_geral_1'),
      ('pregnants', 'info_gerais_estado_geral_2'),
      ('pregnants', 'info_gerais_nutricional'),
      ('pregnants', 'info_gerais_psicossocial'),
      ('pregnancies', 'weeks'), ('pregnancies', 'is_checked'),
      ('pregnancies', 'dum'), ('pregnancies', 'dpp'),
      ('pregnancies', 'ccn'), ('pregnancies', 'dgm'),
      ('pregnancies', 'glicemia'),
      ('pregnancies', 'frequencia_cardiaca'),
      ('pregnancies', 'altura_uterina'),
      ('pregnancies', 'regularidade_do_ciclo'),
      ('pregnancies', 'ig_ultrassonografia'),
      ('pregnancy_events', 'descricao'),
      ('pregnancy_events', 'data_evento'),
      ('pregnant_documents', 'document_name'),
      ('pregnant_documents', 'document_type'),
      ('pregnant_documents', 'extracted_text'),
      ('pregnant_documents', 'extraction_error'),
      ('pregnant_documents', 'report_comment'),
      ('medidas_fetais', 'ccn'), ('medidas_fetais', 'crl'),
      ('medidas_fetais', 'dgn'),
      ('medidas_fetais', 'idade_gestacional_semanas')
    ) AS classified(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = item.table_name
        AND column_name = item.column_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT',
        item.table_name, item.column_name
      );
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::TEXT',
        item.table_name, item.column_name, item.column_name
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_lookup_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_email_lookup_hash_format'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_lookup_hash_format
      CHECK (
        email_lookup_hash IS NULL
        OR email_lookup_hash ~ '^[0-9a-f]{64}$'
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lookup_hash_unique
  ON users (email_lookup_hash)
  WHERE email_lookup_hash IS NOT NULL;

DO $$
DECLARE
  protected_table TEXT;
  constraint_name TEXT;
BEGIN
  FOREACH protected_table IN ARRAY ARRAY[
    'users', 'doctors', 'pregnants', 'pregnancies',
    'pregnancy_events', 'pregnant_documents', 'medidas_fetais'
  ]
  LOOP
    IF to_regclass('public.' || protected_table) IS NOT NULL THEN
      EXECUTE format(
        'ALTER TABLE %I ADD COLUMN IF NOT EXISTS encryption_key_version INTEGER',
        protected_table
      );
      constraint_name := protected_table || '_encryption_key_version_positive';
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = constraint_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I CHECK (encryption_key_version IS NULL OR encryption_key_version > 0)',
          protected_table, constraint_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;

COMMENT ON COLUMN users.email_lookup_hash IS
  'HMAC-SHA-256 of normalized email for deterministic lookup.';
COMMENT ON COLUMN users.encryption_key_version IS
  'AES key version; NULL denotes a legacy plaintext record.';
