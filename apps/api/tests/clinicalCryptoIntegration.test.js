const assert = require('assert');
const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../../.env'),
  override: true,
});
process.env.PG_HOST = '127.0.0.1';
process.env.PG_PORT = '5434';

const client = require('../backend');
const { createUser } = require('../controllers/userController');
const {
  getPregnantById,
  updatePregnant,
} = require('../controllers/pregnantController');
const { createPregnancy } = require('../controllers/pregnancyController');
const { createEvent } = require('../controllers/pregnancyEventsController');

function createResponse() {
  return {
    body: undefined,
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

async function run() {
  const email = `clinical-${Date.now()}@example.test`;
  const admin = { id: 999999, role: 'admin' };
  let userId;
  let pregnantId;
  let pregnancyId;

  try {
    const createdUser = createResponse();
    await createUser({
      body: {
        name: 'Paciente Clinica',
        email,
        password: 'StrongPass123!',
        birthdate: '1994-03-12',
      },
    }, createdUser);
    assert.strictEqual(createdUser.statusCode, 201);
    userId = createdUser.body.id;

    const pregnantResult = await client.query(
      'SELECT id FROM pregnants WHERE user_id = $1',
      [userId]
    );
    pregnantId = pregnantResult.rows[0].id;

    const updatedPregnant = createResponse();
    await updatePregnant({
      params: { id: pregnantId },
      user: admin,
      body: {
        altura: 1.67,
        pressao_sistole: 118,
        antecedentes_diabetes: false,
      },
    }, updatedPregnant);
    assert.strictEqual(updatedPregnant.statusCode, 200);
    assert.strictEqual(updatedPregnant.body.altura, 1.67);

    const createdPregnancy = createResponse();
    await createPregnancy({
      user: admin,
      body: {
        pregnant_id: pregnantId,
        weeks: 22,
        dum: '2026-01-10',
        dpp: '2026-10-17',
        glicemia: 89,
        frequencia_cardiaca: 145,
        altura_uterina: 21,
        ig_ultrassonografia: '2026-02-20',
      },
    }, createdPregnancy);
    assert.strictEqual(createdPregnancy.statusCode, 201);
    pregnancyId = createdPregnancy.body.id;
    assert.strictEqual(createdPregnancy.body.glicemia, 89);

    const createdEvent = createResponse();
    await createEvent({
      user: admin,
      body: {
        pregnancy_id: pregnancyId,
        descricao: 'Ultrassonografia morfologica',
        data_evento: '2026-06-10',
      },
    }, createdEvent);
    assert.strictEqual(createdEvent.statusCode, 201);

    const stored = await client.query(
      `SELECT p.altura, preg.glicemia, pe.descricao
         FROM pregnants p
         JOIN pregnancies preg ON preg.pregnant_id = p.id
         JOIN pregnancy_events pe ON pe.pregnancy_id = preg.id
        WHERE p.id = $1`,
      [pregnantId]
    );
    assert.match(stored.rows[0].altura, /^v1:/);
    assert.match(stored.rows[0].glicemia, /^v1:/);
    assert.match(stored.rows[0].descricao, /^v1:/);

    const aggregate = createResponse();
    await getPregnantById({
      params: { id: pregnantId },
      user: admin,
    }, aggregate);
    assert.strictEqual(aggregate.statusCode, 200);
    assert.strictEqual(aggregate.body.patient_name, 'Paciente Clinica');
    assert.strictEqual(aggregate.body.altura, 1.67);
    assert.strictEqual(aggregate.body.latest_pregnancy.glicemia, 89);
    assert.strictEqual(
      aggregate.body.all_events[0].descricao,
      'Ultrassonografia morfologica'
    );

    console.log('clinical crypto integration: OK');
  } finally {
    if (pregnancyId) {
      await client.query(
        'DELETE FROM pregnancy_events WHERE pregnancy_id = $1',
        [pregnancyId]
      );
      await client.query('DELETE FROM pregnancies WHERE id = $1', [pregnancyId]);
    }
    if (pregnantId) {
      await client.query('DELETE FROM pregnants WHERE id = $1', [pregnantId]);
    }
    if (userId) {
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
