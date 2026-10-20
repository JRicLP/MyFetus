/** Carga sintetica e idempotente para desenvolvimento local. */
const fs = require('fs');
const path = require('path');
const net = require('net');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator > 0) {
      const key = trimmed.slice(0, separator).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(separator + 1).trim();
    }
  }
}

// O comando e executado no host, enquanto a API usa o nome DNS "db" no Compose.
if (!process.env.PG_HOST || process.env.PG_HOST === 'db') {
  process.env.PG_HOST = process.env.DB_ROTATION_HOST || '127.0.0.1';
}
if (!process.env.PG_PORT || process.env.PG_PORT === '5432') {
  process.env.PG_PORT = process.env.DB_ROTATION_PORT || '5434';
}

const host = String(process.env.PG_HOST).toLowerCase().replace(/^\[|\]$/g, '');
const isLoopback = host === 'localhost' || host === '::1'
  || (net.isIP(host) === 4 && host.startsWith('127.'));
if (!['development', 'test'].includes(process.env.NODE_ENV) || !isLoopback) {
  console.error('[ERRO] Seed permitido somente em NODE_ENV=development/test e PostgreSQL local (loopback).');
  process.exitCode = 1;
}

function apiDependency(name) {
  try {
    return require(path.resolve(__dirname, '../apps/api/node_modules', name));
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
    return require(name);
  }
}

const ADMIN = {
  email: 'admin_teste@myfetus.com', name: 'Administrador Local',
  birthdate: '1985-03-20', role: 'admin',
};
const DOCTORS = [
  {
    email: 'medico_teste@myfetus.com', name: 'Dr. Medico de Teste',
    birthdate: '1980-01-10', role: 'medico', crm: '123456', crmEstado: 'PE',
    telefone: '81999998888',
  },
  {
    email: 'medica_luiza@myfetus.com', name: 'Dra. Luiza Sintetica',
    birthdate: '1983-08-22', role: 'medico', crm: '654321', crmEstado: 'PE',
    telefone: '81999997777',
  },
];
const PREGNANTS = Array.from({ length: 10 }, (_, index) => ({
  email: index === 0 ? 'teste_gestante@myfetus.com'
    : `gestante_${String(index + 1).padStart(2, '0')}@myfetus.com`,
  name: index === 0 ? 'Paciente de Teste'
    : `Gestante Sintetica ${String(index + 1).padStart(2, '0')}`,
  birthdate: `${1990 + (index % 9)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
  role: 'gestante',
}));

function dateOffset(base, days) {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function findUser(client, spec, emailLookup, cryptoService) {
  const emailHash = emailLookup.hash(spec.email);
  const matched = await client.query(
    'SELECT id, role FROM users WHERE email_lookup_hash = $1', [emailHash]
  );
  if (matched.rows.length) return matched.rows[0];

  // A carga antiga podia criar contas com hash ausente. Busca pelo e-mail
  // descriptografado antes de inserir, para nao duplicar essas contas.
  const allUsers = await client.query('SELECT id, role, email FROM users');
  const legacyMatches = allUsers.rows.filter((row) => {
    const email = cryptoService.decrypt(row.email, { table: 'users', field: 'email' });
    return emailLookup.normalize(email) === emailLookup.normalize(spec.email);
  });
  if (legacyMatches.length > 1) {
    throw new Error(`Mais de uma conta existente para ${spec.email}; corrija a duplicidade antes do seed.`);
  }
  if (!legacyMatches.length) return null;

  const user = legacyMatches[0];
  await client.query(
    'UPDATE users SET email_lookup_hash = $1 WHERE id = $2', [emailHash, user.id]
  );
  return user;
}

async function ensureUser(client, spec, passwordHash, emailLookup, cryptoService, counts) {
  let user = await findUser(client, spec, emailLookup, cryptoService);
  if (user) {
    if (user.role !== spec.role) {
      throw new Error(`Conta ${spec.email} ja existe com perfil ${user.role}.`);
    }
    return user.id;
  }

  const encrypted = cryptoService.encryptRecord({
    name: spec.name, email: spec.email, birthdate: spec.birthdate,
  }, 'users');
  const inserted = await client.query(
    `INSERT INTO users (
       name, email, password, birthdate, role, is_active,
       email_lookup_hash, encryption_key_version
     ) VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING id`,
    [encrypted.name, encrypted.email, passwordHash, encrypted.birthdate,
      spec.role, emailLookup.hash(spec.email), cryptoService.currentVersion]
  );
  counts[spec.role]++;
  return inserted.rows[0].id;
}

async function ensureDoctor(client, userId, spec, cryptoService) {
  const existing = await client.query(
    'SELECT id FROM doctors WHERE user_id = $1 LIMIT 1', [userId]
  );
  if (existing.rows.length) return;
  const encrypted = cryptoService.encryptRecord({
    crm: spec.crm, crm_estado: spec.crmEstado, telefone: spec.telefone,
  }, 'doctors');
  await client.query(
    `INSERT INTO doctors (
       user_id, crm, crm_estado, telefone, especialidade, encryption_key_version
     ) VALUES ($1, $2, $3, $4, 'Obstetricia', $5)`,
    [userId, encrypted.crm, encrypted.crm_estado, encrypted.telefone,
      cryptoService.currentVersion]
  );
}

async function ensurePregnant(client, userId, index, cryptoService) {
  const existing = await client.query(
    'SELECT id FROM pregnants WHERE user_id = $1 LIMIT 1', [userId]
  );
  if (existing.rows.length) return existing.rows[0].id;
  const encrypted = cryptoService.encryptRecord({
    altura: 1.58 + index * 0.01,
    peso_pregestacional: 57 + index * 1.5,
    peso_atual: 59 + index * 1.5,
    gestacao_partos: index % 3,
    antecedentes_diabetes: index === 3,
    antecedentes_hipertensao: index === 6,
  }, 'pregnants');
  const inserted = await client.query(
    `INSERT INTO pregnants (
       user_id, altura, peso_pregestacional, peso_atual, gestacao_partos,
       antecedentes_diabetes, antecedentes_hipertensao, encryption_key_version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [userId, encrypted.altura, encrypted.peso_pregestacional,
      encrypted.peso_atual, encrypted.gestacao_partos,
      encrypted.antecedentes_diabetes, encrypted.antecedentes_hipertensao,
      cryptoService.currentVersion]
  );
  return inserted.rows[0].id;
}

async function ensurePregnancy(client, pregnantId, index, today, cryptoService) {
  const existing = await client.query(
    'SELECT id FROM pregnancies WHERE pregnant_id = $1 ORDER BY id LIMIT 1',
    [pregnantId]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const weeks = 18 + index;
  const dum = dateOffset(today, -weeks * 7);
  const encrypted = cryptoService.encryptRecord({
    weeks, is_checked: true, dum, dpp: dateOffset(dum, 280),
    ig_ultrassonografia: dateOffset(dum, 84),
    glicemia: 84 + index, frequencia_cardiaca: 76 + index,
    altura_uterina: 17 + index,
  }, 'pregnancies');
  const inserted = await client.query(
    `INSERT INTO pregnancies (
       pregnant_id, weeks, is_checked, dum, dpp, ig_ultrassonografia,
       glicemia, frequencia_cardiaca, altura_uterina, encryption_key_version
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [pregnantId, encrypted.weeks, encrypted.is_checked, encrypted.dum,
      encrypted.dpp, encrypted.ig_ultrassonografia, encrypted.glicemia,
      encrypted.frequencia_cardiaca, encrypted.altura_uterina,
      cryptoService.currentVersion]
  );
  return inserted.rows[0].id;
}

async function ensureHistory(client, pregnancyId, doctorId, index, today, cryptoService) {
  for (let visit = 0; visit < 3; visit++) {
    const notes = `Consulta pre-natal simulada ${visit + 1}/3`;
    const existing = await client.query(
      'SELECT id FROM maternal_weight_history WHERE pregnancy_id = $1 AND notes = $2 LIMIT 1',
      [pregnancyId, notes]
    );
    if (!existing.rows.length) {
      await client.query(
        `INSERT INTO maternal_weight_history
         (pregnancy_id, measured_at, weight_kg, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [pregnancyId, dateOffset(today, -42 + visit * 21),
          57 + index * 1.5 + visit, notes, doctorId]
      );
    }
  }

  const events = await client.query(
    'SELECT descricao FROM pregnancy_events WHERE pregnancy_id = $1',
    [pregnancyId]
  );
  const descriptions = new Set(events.rows.map((row) => cryptoService.decrypt(
    row.descricao, { table: 'pregnancy_events', field: 'descricao' }
  )));
  for (const [description, daysAgo] of [
    ['Primeira consulta pre-natal simulada', 42],
    ['Ultrassonografia pre-natal simulada', 21],
  ]) {
    if (descriptions.has(description)) continue;
    const encrypted = cryptoService.encryptRecord({
      descricao: description, data_evento: dateOffset(today, -daysAgo),
    }, 'pregnancy_events');
    await client.query(
      `INSERT INTO pregnancy_events
       (pregnancy_id, descricao, data_evento, encryption_key_version)
       VALUES ($1, $2, $3, $4)`,
      [pregnancyId, encrypted.descricao, encrypted.data_evento,
        cryptoService.currentVersion]
    );
  }
}

async function runSeed() {
  const { Pool } = apiDependency('pg');
  const bcrypt = apiDependency('bcrypt');
  const { createCryptoService } = require('../apps/api/services/cryptoService');
  const { createEmailLookupService } = require('../apps/api/services/emailLookupService');
  const cryptoService = createCryptoService();
  const emailLookup = createEmailLookupService();
  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD || 'SenhaTeste123!', 10);
  const pool = new Pool({
    user: process.env.PG_USER || 'myfetus_app',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE || 'myfetus',
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
  });
  let client;
  let inTransaction = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN');
    inTransaction = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext('myfetus:e1-08:seed'))");

    const counts = { admin: 0, medico: 0, gestante: 0 };
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await ensureUser(client, ADMIN, passwordHash, emailLookup, cryptoService, counts);
    const doctorIds = [];
    for (const doctor of DOCTORS) {
      const id = await ensureUser(client, doctor, passwordHash, emailLookup,
        cryptoService, counts);
      await ensureDoctor(client, id, doctor, cryptoService);
      doctorIds.push(id);
    }
    for (const [index, pregnant] of PREGNANTS.entries()) {
      const userId = await ensureUser(client, pregnant, passwordHash,
        emailLookup, cryptoService, counts);
      const pregnantId = await ensurePregnant(client, userId, index, cryptoService);
      const doctorId = doctorIds[index % doctorIds.length];
      await client.query(
        `INSERT INTO doctor_patient_links (doctor_id, pregnant_id, status)
         VALUES ($1, $2, 'active') ON CONFLICT (doctor_id, pregnant_id) DO NOTHING`,
        [doctorId, pregnantId]
      );
      const pregnancyId = await ensurePregnancy(client, pregnantId, index,
        today, cryptoService);
      await ensureHistory(client, pregnancyId, doctorId, index, today, cryptoService);
    }

    await client.query('COMMIT');
    inTransaction = false;
    console.log('[OK] Seeds disponiveis: 1 admin, 2 medicos e 10 gestantes com historico.');
    console.log(`[INFO] Novas contas nesta execucao: ${counts.admin} admin, ${counts.medico} medicos, ${counts.gestante} gestantes.`);
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`PostgreSQL indisponivel em ${process.env.PG_HOST}:${process.env.PG_PORT}. Execute npm run docker:up e npm run db:migrate.`);
    }
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

if (process.exitCode !== 1) {
  runSeed().catch((error) => {
    console.error('[ERRO] Falha ao executar seeds:', error.message);
    process.exitCode = 1;
  });
}
