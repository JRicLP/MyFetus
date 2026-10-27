/**
 * Exclusão da conta pelo próprio titular (E7-02, LGPD art. 18, VI).
 *
 * Decisões do P.O. em 23/10/2026 (comentário na #69, item 4): excluir os dados
 * pessoais e anonimizar o que precisa ficar por retenção ou auditoria.
 *
 *   - gestante: a linha de `users` é apagada e o banco remove em cascata
 *     prontuário, gestações, eventos, históricos, pedidos de exame, documentos e
 *     vínculos. Os arquivos cifrados dos exames são removidos do disco depois do
 *     COMMIT (antes, só renomeados, para voltar atrás se a transação falhar).
 *   - médico: a conta é anonimizada, não apagada, porque os pedidos de exame e
 *     laudos dele fazem parte do prontuário das pacientes. Os vínculos são
 *     apagados, então ele perde o acesso às pacientes na hora.
 *   - administrador: fora do autoatendimento (procedimento operacional).
 *
 * Consentimentos e audit_logs ficam até o fim do projeto (resposta 4 da DPIA);
 * as duas tabelas não têm chave estrangeira para `users`.
 */
const nodeCrypto = require('crypto');
const nodeFs = require('fs/promises');

const ANONYMIZED_NAME = 'Conta excluída';
const ANONYMIZED_BIRTHDATE = '1900-01-01';
const ANONYMIZED_DOCTOR = Object.freeze({ crm: 'removido', crm_estado: 'XX' });

class AccountDeletionError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function anonymizedEmail(userId) {
  return `conta-excluida-${userId}@removido.invalid`;
}

function createAccountDeletionService({
  crypto,
  hashPassword,
  fs = nodeFs,
  randomUUID = nodeCrypto.randomUUID,
  logger = { error() {} },
}) {
  async function moveToTombstones(paths) {
    const moved = [];
    for (const original of paths) {
      const tombstone = `${original}.delete-${randomUUID()}`;
      try {
        await fs.rename(original, tombstone);
        moved.push({ original, tombstone });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          await restoreTombstones(moved);
          throw error;
        }
      }
    }
    return moved;
  }

  async function restoreTombstones(moved) {
    for (const { original, tombstone } of moved) {
      await fs.rename(tombstone, original).catch(() => {});
    }
  }

  async function removeTombstones(moved) {
    let failed = 0;
    for (const { tombstone } of moved) {
      try {
        await fs.unlink(tombstone);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          failed += 1;
          logger.error('Conta excluída, mas a remoção de um arquivo falhou', {
            code: 'ACCOUNT_DELETION_FILE_CLEANUP_FAILED',
            details: error.message,
          });
        }
      }
    }
    return { removed: moved.length - failed, failed };
  }

  async function deletePregnant(db, userId) {
    const files = await db.query(
      `SELECT d.file_path
       FROM pregnant_documents d
       JOIN pregnants p ON p.id = d.pregnant_id
       WHERE p.user_id = $1 AND d.file_path IS NOT NULL`,
      [userId]
    );
    const counts = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM pregnancies g JOIN pregnants p ON p.id = g.pregnant_id WHERE p.user_id = $1)::int AS gestacoes,
         (SELECT COUNT(*) FROM pregnant_documents d JOIN pregnants p ON p.id = d.pregnant_id WHERE p.user_id = $1)::int AS documentos`,
      [userId]
    );

    const moved = await moveToTombstones(files.rows.map((row) => row.file_path));
    try {
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
      await db.query('COMMIT');
    } catch (error) {
      await restoreTombstones(moved);
      throw error;
    }

    return { mode: 'deleted', counts: counts.rows[0], files: await removeTombstones(moved) };
  }

  async function anonymizeDoctor(db, userId) {
    const links = await db.query(
      'DELETE FROM doctor_patient_links WHERE doctor_id = $1 RETURNING id',
      [userId]
    );

    const user = crypto.encryptRecord(
      { name: ANONYMIZED_NAME, email: anonymizedEmail(userId), birthdate: ANONYMIZED_BIRTHDATE },
      'users'
    );
    // Senha aleatória descartada: ninguém consegue entrar de novo nesta conta.
    const unusablePassword = await hashPassword(nodeCrypto.randomBytes(32).toString('hex'));
    await db.query(
      `UPDATE users
       SET name = $2, email = $3, birthdate = $4, password = $5,
           email_lookup_hash = NULL, is_active = false, encryption_key_version = $6
       WHERE id = $1`,
      [userId, user.name, user.email, user.birthdate, unusablePassword, crypto.getCurrentVersion()]
    );

    const doctor = crypto.encryptRecord({ ...ANONYMIZED_DOCTOR }, 'doctors');
    await db.query(
      `UPDATE doctors
       SET crm = $2, crm_estado = $3, telefone = NULL, especialidade = NULL, encryption_key_version = $4
       WHERE user_id = $1`,
      [userId, doctor.crm, doctor.crm_estado, crypto.getCurrentVersion()]
    );
    await db.query('COMMIT');

    return { mode: 'anonymized', counts: { vinculos: links.rows.length }, files: { removed: 0, failed: 0 } };
  }

  /**
   * Recebe um client já conectado (não o pool) e controla a transação. O
   * `userId` vem sempre do token; o chamador já confirmou a senha.
   */
  async function deleteAccount(db, { userId }) {
    await db.query('BEGIN');
    try {
      const result = await db.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const role = result.rows[0]?.role;
      if (!role) throw new AccountDeletionError('USER_NOT_FOUND', 'Usuário não encontrado');
      if (role === 'gestante') return { role, ...(await deletePregnant(db, userId)) };
      if (role === 'medico') return { role, ...(await anonymizeDoctor(db, userId)) };
      throw new AccountDeletionError('ACCOUNT_DELETION_NOT_SELF_SERVICE', 'Exclusão desta conta é feita por procedimento operacional');
    } catch (error) {
      await db.query('ROLLBACK').catch(() => {});
      throw error;
    }
  }

  return Object.freeze({ deleteAccount });
}

module.exports = {
  ANONYMIZED_NAME,
  AccountDeletionError,
  anonymizedEmail,
  createAccountDeletionService,
};
