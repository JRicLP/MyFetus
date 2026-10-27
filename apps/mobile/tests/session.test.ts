import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isClinicianRole,
  isPatientRole,
  parseSessionUser,
} from '../types/session';

describe('session contracts', () => {
  it('normaliza um perfil válido retornado pela API', () => {
    const user = parseSessionUser({
      id: 42,
      name: 'Maria',
      email: 'maria@example.com',
      role: 'gestante',
      pregnant_id: 7,
    });

    assert.deepEqual(user, {
      id: 42,
      name: 'Maria',
      email: 'maria@example.com',
      role: 'gestante',
      pregnant_id: 7,
    });
    assert.equal(isPatientRole(user.role), true);
    assert.equal(isClinicianRole(user.role), false);
  });

  it('rejeita perfis sem os campos mínimos da sessão', () => {
    assert.equal(
      parseSessionUser({ id: 42, email: 'maria@example.com', role: 'gestante' }),
      null
    );
  });

  it('reconhece os papéis clínicos aceitos pelo roteamento', () => {
    assert.equal(isClinicianRole('medico'), true);
    assert.equal(isClinicianRole('admin'), true);
    assert.equal(isPatientRole('user'), true);
  });
});
