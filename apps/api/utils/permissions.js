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

module.exports = {
  doctorCanAccessPregnant
};