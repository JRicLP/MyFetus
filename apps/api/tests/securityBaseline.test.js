const assert = require('assert');
const {
  PUBLIC_REGISTRATION_ROLE,
  getAllowedUserUpdateFields,
} = require('../utils/userPolicy');
const {
  getWritableEntries,
  quoteIdentifier,
  validateChanges,
} = require('../utils/syncPolicy');

function assertThrowsWithMessage(fn, fragment) {
  assert.throws(fn, (error) => error.message.includes(fragment));
}

assert.strictEqual(PUBLIC_REGISTRATION_ROLE, 'gestante');

assert.deepStrictEqual(
  getAllowedUserUpdateFields({ id: 10, role: 'gestante' }, 10),
  ['name', 'email', 'birthdate', 'password']
);
assert.deepStrictEqual(
  getAllowedUserUpdateFields({ id: 20, role: 'medico' }, 10),
  ['name', 'birthdate']
);
assert.ok(
  getAllowedUserUpdateFields({ id: 1, role: 'admin' }, 10).includes('role')
);

validateChanges({
  pregnants: {
    created: [],
    updated: [{ id: 1, peso_atual: 70 }],
  },
});

assertThrowsWithMessage(
  () => validateChanges({ 'users; DROP TABLE users': { updated: [] } }),
  'Tabela nao permitida'
);
assertThrowsWithMessage(
  () => quoteIdentifier('name; DROP TABLE users'),
  'Identificador invalido'
);
assertThrowsWithMessage(
  () => getWritableEntries(
    { password: 'plain-text' },
    'users',
    new Set(['password'])
  ),
  'Nenhum campo gravavel'
);
assertThrowsWithMessage(
  () => getWritableEntries(
    { file_path: '/tmp/document.pdf' },
    'pregnant_documents',
    new Set(['file_path'])
  ),
  'Nenhum campo gravavel'
);

assert.deepStrictEqual(
  getWritableEntries(
    { peso_atual: 70, unknown_column: 'ignored' },
    'pregnants',
    new Set(['peso_atual'])
  ),
  [['peso_atual', 70]]
);

console.log('OK: baseline de autorizacao e sync validada.');
