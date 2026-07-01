const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const client = require('../backend');
const cryptoService = require('../services/cryptoService');
const {
  hashEmail,
  normalizeEmail,
} = require('../services/emailLookupService');
const logger = require('../utils/logger');
const updateEntity = require('../utils/updateEntity');
const {
  PUBLIC_REGISTRATION_ROLE,
  VALID_ROLES,
  getAllowedUserUpdateFields,
} = require('../utils/userPolicy');

const SALT_ROUNDS = 10;

function sanitizeUser(user) {
  if (!user) return null;
  const {
    password,
    email_lookup_hash,
    encryption_key_version,
    ...safeUser
  } = user;
  return safeUser;
}

function decryptUser(user) {
  return user ? cryptoService.decryptRecord(user, 'users') : null;
}

async function migrateLegacyUser(dbClient, row, normalizedEmail, lookupHash) {
  const encrypted = cryptoService.encryptRecord(
    {
      name: row.name,
      email: normalizedEmail,
      birthdate: row.birthdate,
    },
    'users'
  );

  const result = await dbClient.query(
    `UPDATE users
        SET name = $1,
            email = $2,
            birthdate = $3,
            email_lookup_hash = $4,
            encryption_key_version = $5,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *`,
    [
      encrypted.name,
      encrypted.email,
      encrypted.birthdate,
      lookupHash,
      cryptoService.getCurrentVersion(),
      row.id,
    ]
  );

  return { ...result.rows[0], pregnant_id: row.pregnant_id };
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  const lookupHash = hashEmail(normalizedEmail);
  const dbClient = await client.connect();

  try {
    const indexed = await dbClient.query(
      `SELECT u.*, p.id AS pregnant_id
         FROM users u
         LEFT JOIN pregnants p ON p.user_id = u.id
        WHERE u.email_lookup_hash = $1
        LIMIT 1`,
      [lookupHash]
    );
    if (indexed.rows[0]) return indexed.rows[0];

    const legacy = await dbClient.query(
      `SELECT u.*, p.id AS pregnant_id
         FROM users u
         LEFT JOIN pregnants p ON p.user_id = u.id
        WHERE u.email_lookup_hash IS NULL`
    );
    const matched = legacy.rows.find((row) => {
      const decrypted = decryptUser(row);
      return normalizeEmail(decrypted.email) === normalizedEmail;
    });
    if (!matched) return null;

    await dbClient.query('BEGIN');
    const migrated = await migrateLegacyUser(
      dbClient,
      matched,
      normalizedEmail,
      lookupHash
    );
    await dbClient.query('COMMIT');
    return migrated;
  } catch (error) {
    try {
      await dbClient.query('ROLLBACK');
    } catch (_) {
      // Ignore rollback errors when no transaction was started.
    }
    throw error;
  } finally {
    dbClient.release();
  }
}

const createUser = async (req, res) => {
  const { name, email, password, birthdate } = req.body || {};
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    password.length < 8 ||
    typeof birthdate !== 'string' ||
    !birthdate
  ) {
    return res.status(400).json({
      error: 'Nome, email, data de nascimento e senha de ao menos 8 caracteres sao obrigatorios',
    });
  }

  let dbClient;
  try {
    const normalizedEmail = normalizeEmail(email);
    const encrypted = cryptoService.encryptRecord(
      { name: name.trim(), email: normalizedEmail, birthdate },
      'users'
    );
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    dbClient = await client.connect();
    await dbClient.query('BEGIN');
    const result = await dbClient.query(
      `INSERT INTO users (
         name, email, password, birthdate, is_active, role,
         email_lookup_hash, encryption_key_version
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        encrypted.name,
        encrypted.email,
        hashedPassword,
        encrypted.birthdate,
        true,
        PUBLIC_REGISTRATION_ROLE,
        hashEmail(normalizedEmail),
        cryptoService.getCurrentVersion(),
      ]
    );
    await dbClient.query('INSERT INTO pregnants (user_id) VALUES ($1)', [
      result.rows[0].id,
    ]);
    await dbClient.query('COMMIT');

    return res.status(201).json(sanitizeUser(decryptUser(result.rows[0])));
  } catch (error) {
    if (dbClient) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (_) {
        // Ignore rollback errors.
      }
    }
    logger.error('Erro ao criar usuario', {
      details: error.message,
      email,
    });
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email ja cadastrado' });
    }
    return res.status(500).json({ error: 'Erro ao criar usuario' });
  } finally {
    if (dbClient) dbClient.release();
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await client.query(
      `SELECT id, name, email, birthdate, is_active, role,
              created_at, updated_at, encryption_key_version
         FROM users
        ORDER BY id ASC`
    );
    return res.json(result.rows.map((row) => sanitizeUser(decryptUser(row))));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const result = await client.query(
      `SELECT id, name, email, birthdate, is_active, role,
              created_at, updated_at, encryption_key_version
         FROM users
        WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).send('Usuario nao encontrado');
    return res.json(sanitizeUser(decryptUser(result.rows[0])));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  const targetUserId = req.targetUserId || Number(req.params.id);
  try {
    const allowedFields = getAllowedUserUpdateFields(req.user, targetUserId);
    const updateData = Object.fromEntries(
      Object.entries(req.body || {}).filter(
        ([field, value]) => allowedFields.includes(field) && value !== undefined
      )
    );
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo valido para atualizar' });
    }
    if (updateData.role && !VALID_ROLES.has(updateData.role)) {
      return res.status(400).json({ error: 'Perfil de usuario invalido' });
    }
    if (updateData.password) {
      if (typeof updateData.password !== 'string' || updateData.password.length < 8) {
        return res.status(400).json({ error: 'A senha deve ter ao menos 8 caracteres' });
      }
      updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
    }
    if (updateData.email !== undefined) {
      updateData.email = normalizeEmail(updateData.email);
      updateData.email_lookup_hash = hashEmail(updateData.email);
    }

    const encrypted = cryptoService.encryptRecord(updateData, 'users');
    if (['name', 'email', 'birthdate'].some((field) => field in encrypted)) {
      encrypted.encryption_key_version = cryptoService.getCurrentVersion();
    }
    const internalAllowedFields = [
      ...allowedFields,
      'email_lookup_hash',
      'encryption_key_version',
    ];
    const updated = await updateEntity(
      'users',
      targetUserId,
      encrypted,
      internalAllowedFields
    );
    if (!updated) return res.status(404).send('Usuario nao encontrado');
    return res.json(sanitizeUser(decryptUser(updated)));
  } catch (error) {
    logger.error('Erro ao atualizar usuario', {
      details: error.message,
      targetUserId,
    });
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email ja cadastrado' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar usuario' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).send('Usuario nao encontrado');
    return res.send('Usuario deletado com sucesso');
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
  }

  try {
    const storedUser = await findUserByEmail(email);
    if (
      !storedUser ||
      !storedUser.is_active ||
      !(await bcrypt.compare(password, storedUser.password))
    ) {
      return res.status(401).json({ error: 'Login ou senha invalidos' });
    }

    const user = decryptUser(storedUser);
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    return res.status(200).json({
      message: 'Login bem-sucedido',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        pregnant_id: user.pregnant_id || null,
      },
    });
  } catch (error) {
    logger.error('Erro no login', { details: error.message });
    return res.status(500).json({ error: 'Erro no servidor' });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  findUserByEmail,
};
