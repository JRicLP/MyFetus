const DOCTOR_APPROVAL_STATUSES = Object.freeze([
  'pending',
  'approved',
  'rejected',
  'revoked',
]);

function getDefaultClient() {
  return require('../backend');
}

async function getDoctorApproval(userId, dbClient = getDefaultClient()) {
  const result = await dbClient.query(
    `SELECT approval_status, approval_reason, is_synthetic
       FROM doctors
      WHERE user_id = $1
      LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function getDoctorApprovalStatus(userId, dbClient = getDefaultClient()) {
  const doctor = await getDoctorApproval(userId, dbClient);
  return doctor?.approval_status || 'pending';
}

module.exports = {
  DOCTOR_APPROVAL_STATUSES,
  getDoctorApproval,
  getDoctorApprovalStatus,
};
