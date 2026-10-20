export type UserRole = 'gestante' | 'medico' | 'admin' | 'user';

export type SessionUser = {
  id: number;
  name: string;
  email?: string;
  role: UserRole;
  pregnant_id?: number | null;
};

export function isPatientRole(role: UserRole): boolean {
  return role === 'gestante' || role === 'user';
}

export function isClinicianRole(role: UserRole): boolean {
  return role === 'medico' || role === 'admin';
}

export function parseSessionUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<SessionUser>;
  const validRoles: UserRole[] = ['gestante', 'medico', 'admin', 'user'];

  if (
    typeof candidate.id !== 'number' ||
    !Number.isInteger(candidate.id) ||
    typeof candidate.name !== 'string' ||
    !candidate.name.trim() ||
    !candidate.role ||
    !validRoles.includes(candidate.role)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    email: typeof candidate.email === 'string' ? candidate.email : undefined,
    role: candidate.role,
    pregnant_id:
      typeof candidate.pregnant_id === 'number' ? candidate.pregnant_id : null,
  };
}
