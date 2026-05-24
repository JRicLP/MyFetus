const client = require('../backend');

async function doctorCanAccessPregnant(doctorId, pregnantId) {
  const result = await client.query(
    `
    SELECT 1
    FROM doctor_patient_links
    WHERE doctor_id = $1
      AND pregnant_id = $2
      AND status = 'active'
    LIMIT 1
    `,
    [doctorId, pregnantId]
  );

  return result.rows.length > 0;
}

async function findPregnantById(pregnantId) {
  const result = await client.query(
    `
    SELECT id, user_id
    FROM pregnants
    WHERE id = $1
    `,
    [pregnantId]
  );

  return result.rows[0] || null;
}

async function findPregnancyById(pregnancyId) {
  const result = await client.query(
    `
    SELECT id, pregnant_id
    FROM pregnancies
    WHERE id = $1
    `,
    [pregnancyId]
  );

  return result.rows[0] || null;
}

async function findEventById(eventId) {
  const result = await client.query(
    `
    SELECT pe.id, pe.pregnancy_id, preg.pregnant_id
    FROM pregnancy_events pe
    JOIN pregnancies preg ON preg.id = pe.pregnancy_id
    WHERE pe.id = $1
    `,
    [eventId]
  );

  return result.rows[0] || null;
}

async function ensureCanAccessPregnant(req, res, pregnantId) {
  if (!req.user) {
    res.status(401).json({ error: 'Usuário não autenticado' });
    return false;
  }

  const pregnant = await findPregnantById(pregnantId);

  if (!pregnant) {
    res.status(404).json({ error: 'Gestante não encontrada' });
    return false;
  }

  if (req.user.role === 'admin') {
    return true;
  }

  if (req.user.role === 'gestante') {
    if (pregnant.user_id !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' });
      return false;
    }

    return true;
  }

  if (req.user.role === 'medico') {
    const allowed = await doctorCanAccessPregnant(req.user.id, pregnant.id);

    if (!allowed) {
      res.status(403).json({ error: 'Médico não vinculado a esta gestante' });
      return false;
    }

    return true;
  }

  res.status(403).json({ error: 'Perfil de usuário não autorizado' });
  return false;
}

async function ensureCanAccessPregnancy(req, res, pregnancyId) {
  const pregnancy = await findPregnancyById(pregnancyId);

  if (!pregnancy) {
    res.status(404).json({ error: 'Gestação não encontrada' });
    return false;
  }

  const canAccess = await ensureCanAccessPregnant(req, res, pregnancy.pregnant_id);
  if (!canAccess) return false;

  return pregnancy;
}

module.exports = {
  doctorCanAccessPregnant,
  ensureCanAccessPregnant,
  ensureCanAccessPregnancy,
  findEventById,
  findPregnancyById,
  findPregnantById,
};
