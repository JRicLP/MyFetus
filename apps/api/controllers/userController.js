/**
 * Controlador responsável por gerenciar usuários do sistema.
 * Inclui funções para criação, listagem, consulta, atualização, exclusão e autenticação de usuários.
 */
const client = require('../backend');
const updateEntity = require('../utils/updateEntity');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10

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
  const { name, email, password, birthdate, is_active = true, role = 'user' } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await client.query(
      'INSERT INTO users (name, email, password, birthdate, is_active, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, email, hashedPassword, birthdate, is_active, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const result = await client.query('SELECT * FROM users');
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
    const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
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
    res.json(updatedUser);
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

  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    const user = result.rows[0];

    if (result.rows.length === 0 || !(await bcrypt.compare(password, result.rows[0].password))) {
      return res.status(401).json({ error: 'Login ou senha inválidos' });
    }

    res.status(200).json({
      message: 'Login bem-sucedido',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
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