const { sanitizeForLog } = require('./piiSanitizer');

const levelToSeverity = {
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

const formatLogRecord = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const severity = levelToSeverity[level] || 'INFO';

  let sanitizedMeta = {};
  if (meta !== undefined && meta !== null) {
    if (typeof meta === 'object') {
      try {
        sanitizedMeta = sanitizeForLog(meta);
      } catch (err) {
        sanitizedMeta = { error: 'failed_to_sanitize_log_meta' };
      }
    } else {
      sanitizedMeta = { details: String(meta) };
    }
  }

  const logObject = {
    ...(typeof sanitizedMeta === 'object' && sanitizedMeta !== null ? sanitizedMeta : { meta: sanitizedMeta }),
    timestamp,
    severity,
    level,
    message: typeof message === 'string' ? message : String(message),
  };

  return JSON.stringify(logObject);
};

const write = (level, message, meta) => {
  const line = formatLogRecord(level, message, meta);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  },
  request(req) {
    if (process.env.LOG_REQUESTS !== 'true') {
      return;
    }

    write('info', '[request]', {
      method: req.method,
      path: req.originalUrl,
      body: req.body
    });
  },
  startup(message) {
    write('info', message);
  }
};

module.exports = logger;
