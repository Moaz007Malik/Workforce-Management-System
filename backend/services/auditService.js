import { v4 as uuidv4 } from 'uuid';
import { repos } from '../repositories/index.js';

const auditRepo = repos.auditlogs;

export async function logAudit(action, entity, entityId, details, userId = 'system') {
  const entry = {
    id: uuidv4(),
    action,
    entity,
    entityId,
    details,
    userId,
    timestamp: new Date().toISOString(),
  };
  await auditRepo.create(entry);
  return entry;
}

export async function getAuditLogs(limit = 50) {
  const logs = await auditRepo.getAll();
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
}
