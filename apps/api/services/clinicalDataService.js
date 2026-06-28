const cryptoService = require('./cryptoService');

function decryptPregnantSummary(row) {
  const user = cryptoService.decryptRecord(
    { name: row.patient_name, birthdate: row.birthdate },
    'users'
  );
  const pregnancy = cryptoService.decryptRecord(
    { weeks: row.semanas_gestacao },
    'pregnancies'
  );

  return {
    ...row,
    patient_name: user.name,
    birthdate: user.birthdate,
    semanas_gestacao: pregnancy.weeks,
  };
}

function eventTimestamp(event) {
  const timestamp = new Date(event.data_evento).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function decryptPregnantDetails(row, latestPregnancy, events) {
  const user = cryptoService.decryptRecord(
    { name: row.patient_name, birthdate: row.birthdate },
    'users'
  );
  const pregnant = cryptoService.decryptRecord(row, 'pregnants');
  const decryptedEvents = events
    .map((event) => cryptoService.decryptRecord(event, 'pregnancy_events'))
    .sort((left, right) => eventTimestamp(right) - eventTimestamp(left));

  return {
    ...pregnant,
    patient_name: user.name,
    birthdate: user.birthdate,
    latest_pregnancy: latestPregnancy
      ? cryptoService.decryptRecord(latestPregnancy, 'pregnancies')
      : null,
    all_events: decryptedEvents,
  };
}

module.exports = {
  decryptPregnantDetails,
  decryptPregnantSummary,
};
