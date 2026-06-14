const client = require('../backend');

function parseUserId(value) {
  const userId = Number(value);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

async function linkedDoctorCanAccessUser(doctorUserId, targetUserId) {
  const result = await client.query(
    `
    SELECT 1
    FROM doctor_patient_links dpl
    JOIN pregnants p ON p.id = dpl.pregnant_id
    WHERE dpl.doctor_id = $1
      AND p.user_id = $2
      AND dpl.status = 'active'
    LIMIT 1
    `,
    [doctorUserId, targetUserId]
  );

  return result.rows.length > 0;
}

async function requireUserAccess(req, res, next) {
  const targetUserId = parseUserId(req.params.id);

  if (!targetUserId) {
    return res.status(400).json({ error: 'ID de usuario invalido' });
  }

  if (req.user.role === 'admin' || req.user.id === targetUserId) {
    req.targetUserId = targetUserId;
    return next();
  }

  if (req.user.role === 'medico') {
    try {
      const allowed = await linkedDoctorCanAccessUser(req.user.id, targetUserId);

      if (allowed) {
        req.targetUserId = targetUserId;
        return next();
      }
    } catch (error) {
      return next(error);
    }
  }

  return res.status(403).json({ error: 'Acesso negado' });
}

module.exports = {
  linkedDoctorCanAccessUser,
  parseUserId,
  requireUserAccess,
};
