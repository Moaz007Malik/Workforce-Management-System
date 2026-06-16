import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'descon-promgmt-dev-secret-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

export function defaultPasswordForRole(systemRole) {
  if (systemRole === 'Admin') return 'Admin@123';
  if (systemRole === 'HR') return 'Hr@123';
  return 'Manager@123';
}

/** Demo password keyed by PCP role, then system role */
export function defaultPasswordForEmployee(employee) {
  const pcp = employee?.pcpRole;
  if (pcp === 'Executive') return 'Executive@123';
  if (pcp === 'Admin') return 'Admin@123';
  if (pcp === 'Approver') return 'Approver@123';
  if (pcp === 'Requester') return 'Requester@123';
  return defaultPasswordForRole(employee?.systemRole || 'Manager');
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function sanitizeEmployee(employee) {
  if (!employee) return null;
  const { passwordHash, ...safe } = employee;
  return safe;
}

export function signAuthToken(employee) {
  return jwt.sign(
    {
      sub: employee.id,
      email: employee.email,
      systemRole: employee.systemRole || 'Manager',
      pcpRole: employee.pcpRole || null,
      businessUnit: employee.businessUnit || employee.department,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function authenticateEmployee(email, password) {
  const { repos } = await import('../repositories/index.js');
  const normalized = email?.trim().toLowerCase();
  const employees = await repos.employees.getAll();
  const employee = employees.find((e) => e.email?.toLowerCase() === normalized);
  if (!employee) return null;
  const valid = await verifyPassword(password, employee.passwordHash);
  if (!valid) return null;
  return employee;
}
