/**
 * Controlador responsável por gerenciar usuários do sistema.
 * Inclui funções para criação, listagem, consulta, atualização, exclusão e autenticação de usuários.
 */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10

// Função de Sanitização de usuário:
function sanitizeUser(user) {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return safeUser;
}

// TODO: validação
/**
 * Função 1
 * Cria um novo usuário com senha criptografada.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body` com os campos (name, email, password, birthdate, is_active, role).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Usuário criado com sucesso.
 */
const createUser = async (req, res) => {
  const { name, email, password, birthdate, is_active = true } = req.body;
  const role = req.body.role || 'gestante';
  let dbClient;
  try {
    dbClient = await client.connect();
    await dbClient.query('BEGIN');

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await dbClient.query(
      `
      INSERT INTO users (name, email, password, birthdate, is_active, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, birthdate, is_active, role, created_at, updated_at
      `,
      [name, email, hashedPassword, birthdate, is_active, role]
    );

    const createdUser = result.rows[0];

    // Regra do app: usuários (role='user') representam pacientes e precisam existir em `pregnants`.
    if (role === 'gestante' || role === 'user') {
      await dbClient.query('INSERT INTO pregnants (user_id) VALUES ($1)', [createdUser.id]);
    }

    await dbClient.query('COMMIT');
    res.status(201).json(createdUser);
  } catch (err) {
    try {
      if (dbClient) await dbClient.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (dbClient) dbClient.release();
  }
};

/**
 * Função 2
 * Retorna todos os usuários cadastrados.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição HTTP.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Lista de usuários.
 */
const getUsers = async (req, res) => {
  try {
    const result = await client.query(`
      SELECT id, name, email, birthdate, is_active, role, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 3
 * Retorna um usuário específico pelo ID.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do usuário).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Dados do usuário encontrado.
 */
const getUserById = async (req, res) => {
  try {
    const result = await client.query(
      `
      SELECT id, name, email, birthdate, is_active, role, created_at, updated_at
      FROM users
      WHERE id = $1
      `,
     [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).send('Usuário não encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 4
 * Atualiza os dados de um usuário existente, incluindo criptografia da senha se alterada.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do usuário) e `body` (campos a atualizar).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Usuário atualizado.
 */
const updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    let updateData = rest;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      updateData.password = hashedPassword;
    }

    const updatedUser = await updateEntity('users', req.params.id, updateData);
    if (!updatedUser) return res.status(404).send('Usuário não encontrado');
    res.json(sanitizeUser(updatedUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 5
 * Exclui um usuário do sistema.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `params.id` (ID do usuário).
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [string]: Mensagem de confirmação da exclusão.
 */
const deleteUser = async (req, res) => {
  try {
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).send('Usuário não encontrado');
    res.send('Usuário deletado com sucesso');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Função 6
 * Realiza o login de um usuário validando email e senha.
 * 
 * Parâmetros:
 *  - req[Object]: Requisição contendo `body.email` e `body.password`.
 *  - res[Object]: Resposta HTTP.
 * 
 * Retorno:
 *  - [JSON]: Mensagem de sucesso e dados do usuário autenticado.
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const jwt = require('jsonwebtoken');

  try {
    const result = await client.query(
      `SELECT u.*, p.id AS pregnant_id
         FROM users u
         LEFT JOIN pregnants p ON p.user_id = u.id
        WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (result.rows.length === 0 || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Login ou senha inválidos' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      }
    );

    res.status(200).json({
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
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
};