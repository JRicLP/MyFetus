const PUBLIC_REGISTRATION_ROLE = 'gestante';
const SELF_UPDATE_FIELDS = Object.freeze(['name', 'email', 'birthdate', 'password']);
const LINKED_DOCTOR_UPDATE_FIELDS = Object.freeze(['name', 'birthdate']);
const ADMIN_UPDATE_FIELDS = Object.freeze([
  'name',
  'email',
  'birthdate',
  'password',
  'is_active',
  'role',
]);
const VALID_ROLES = new Set(['gestante', 'medico', 'admin']);

function getAllowedUserUpdateFields(requester, targetUserId) {
  if (requester.role === 'admin') return ADMIN_UPDATE_FIELDS;
  if (requester.id === targetUserId) return SELF_UPDATE_FIELDS;
  return LINKED_DOCTOR_UPDATE_FIELDS;
}

module.exports = {
  ADMIN_UPDATE_FIELDS,
  LINKED_DOCTOR_UPDATE_FIELDS,
  PUBLIC_REGISTRATION_ROLE,
  SELF_UPDATE_FIELDS,
  VALID_ROLES,
  getAllowedUserUpdateFields,
};
