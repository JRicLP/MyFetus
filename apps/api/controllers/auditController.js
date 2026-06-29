const client = require('../backend');

const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
  const requestedLimit = Math.max(Number.parseInt(query.limit || '50', 10), 1);
  return {
    page,
    limit: Math.min(requestedLimit, MAX_LIMIT),
    offset: (page - 1) * Math.min(requestedLimit, MAX_LIMIT),
  };
}

function buildAuditFilters(query) {
  const clauses = [];
  const values = [];

  const add = (clause, value) => {
    values.push(value);
    clauses.push(clause.replace('?', `$${values.length}`));
  };

  if (query.actor_id) add('actor_id = ?', query.actor_id);
  if (query.action) add('action = ?', query.action);
  if (query.resource) add('resource = ?', query.resource);
  if (query.from) add('created_at >= ?', query.from);
  if (query.to) add('created_at <= ?', query.to);

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

const listAuditLogs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query || {});
    const { where, values } = buildAuditFilters(req.query || {});
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM audit_logs ${where}`,
      values
    );
    const dataResult = await client.query(
      `SELECT id, created_at, actor_id, actor_role, action, resource,
              resource_id, ip_address, user_agent, outcome, detail
         FROM audit_logs
         ${where}
        ORDER BY created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return res.json({
      page,
      limit,
      total: countResult.rows[0]?.total || 0,
      results: dataResult.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao consultar auditoria' });
  }
};

module.exports = {
  buildAuditFilters,
  listAuditLogs,
  parsePagination,
};
