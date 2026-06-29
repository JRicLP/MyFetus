const client = require('../backend');
const logger = require('../utils/logger');
const { sanitizeText } = require('../utils/piiSanitizer');

const MAX_USER_AGENT_LENGTH = 500;

function sanitizeDetail(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeText(value, 'redact');
  if (Array.isArray(value)) return value.map(sanitizeDetail);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [key, sanitizeDetail(childValue)])
    );
  }
  return value;
}

function getIpAddress(req) {
  const forwardedFor = req?.headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || null;
}

function buildAuditEntry(req, event) {
  const userAgent = req?.headers?.['user-agent'] || null;
  return {
    actor_id: req?.user?.id || event.actor_id || null,
    actor_role: req?.user?.role || event.actor_role || null,
    action: event.action,
    resource: event.resource || null,
    resource_id: event.resource_id ? String(event.resource_id) : null,
    ip_address: getIpAddress(req),
    user_agent: userAgent ? String(userAgent).slice(0, MAX_USER_AGENT_LENGTH) : null,
    outcome: event.outcome || 'SUCCESS',
    detail: sanitizeDetail(event.detail || null),
  };
}

async function writeAuditLog(entry) {
  await client.query(
    `INSERT INTO audit_logs (
       actor_id, actor_role, action, resource, resource_id,
       ip_address, user_agent, outcome, detail
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.actor_id,
      entry.actor_role,
      entry.action,
      entry.resource,
      entry.resource_id,
      entry.ip_address,
      entry.user_agent,
      entry.outcome,
      entry.detail ? JSON.stringify(entry.detail) : null,
    ]
  );
}

function audit(req, event) {
  if (!event?.action) return;
  const entry = buildAuditEntry(req, event);
  setImmediate(() => {
    writeAuditLog(entry).catch((error) => {
      logger.error('Falha ao registrar audit trail', {
        details: error.message,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resource_id,
      });
    });
  });
}

module.exports = {
  audit,
  buildAuditEntry,
  sanitizeDetail,
  writeAuditLog,
};
