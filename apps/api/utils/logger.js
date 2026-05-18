const { sanitizeForLog } = require('./piiSanitizer');

const stringifyMeta = (meta) => {
  if (meta === undefined || meta === null) {
    return '';
  }

  if (typeof meta === 'string') {
    return meta;
  }

  try {
    return JSON.stringify(sanitizeForLog(meta));
  } catch (error) {
    return JSON.stringify({ error: 'failed_to_stringify_log_meta' });
  }
};

const write = (level, message, meta) => {
  const suffix = stringifyMeta(meta);
  const line = suffix ? `${message} ${suffix}` : message;

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
