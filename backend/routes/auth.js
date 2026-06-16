import { Router } from 'express';
import { repos } from '../repositories/index.js';
import {
  authenticateEmployee,
  sanitizeEmployee,
  signAuthToken,
  verifyAuthToken,
} from '../services/authService.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const employee = await authenticateEmployee(email, password);
    if (!employee) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (employee.active === false) {
      return res.status(403).json({ error: 'Account is inactive' });
    }
    const token = signAuthToken(employee);
    res.json({
      token,
      user: sanitizeEmployee(employee),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    const payload = verifyAuthToken(token);
    const employee = await repos.employees.getById(payload.sub);
    if (!employee) return res.status(401).json({ error: 'User not found' });
    res.json({ user: sanitizeEmployee(employee) });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

export default router;
