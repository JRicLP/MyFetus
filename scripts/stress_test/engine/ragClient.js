const { performance } = require('perf_hooks');

class RagClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RagClientError';
    Object.assign(this, details);
  }
}

class RagTimeoutError extends RagClientError {
  constructor(timeoutMs, details = {}) {
    super(`RAG request timed out after ${timeoutMs}ms`, {
      code: 'RAG_TIMEOUT',
      timeoutMs,
      ...details,
    });
    this.name = 'RagTimeoutError';
  }
}

class RagHttpError extends RagClientError {
  constructor(status, responseBody, details = {}) {
    super(`RAG endpoint returned HTTP ${status}`, {
      code: 'RAG_HTTP_ERROR',
      status,
      responseBody,
      ...details,
    });
    this.name = 'RagHttpError';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RagClient {
  constructor({
    baseUrl = process.env.RAG_BASE_URL || 'http://localhost:3000',
    token = process.env.RAG_TEST_JWT || process.env.JWT_TEST_TOKEN,
    timeoutMs = Number(process.env.RAG_TIMEOUT_MS || 5000),
    maxAttempts = Number(process.env.RAG_MAX_ATTEMPTS || 2),
    retryDelayMs = Number(process.env.RAG_RETRY_DELAY_MS || 100),
    fetchImpl = globalThis.fetch,
    sleepImpl = sleep,
  } = {}) {
    if (typeof fetchImpl !== 'function') {
      throw new RagClientError('A Fetch API não está disponível neste runtime.');
    }

    if (!token) {
      throw new RagClientError(
        'JWT ausente. Gere um token com apps/api/scripts/generate-jwt-test-token.js e defina RAG_TEST_JWT.'
      );
    }

    this.endpoint = `${baseUrl.replace(/\/$/, '')}/api/internal/rag/search`;
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.maxAttempts = Math.max(1, maxAttempts);
    this.retryDelayMs = Math.max(0, retryDelayMs);
    this.fetchImpl = fetchImpl;
    this.sleepImpl = sleepImpl;
  }

  async query(query, topK = 5, options = {}) {
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    const maxAttempts = Math.max(1, options.maxAttempts ?? this.maxAttempts);
    const requestStartedAt = performance.now();
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await this.fetchImpl(this.endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            topK,
            ...(options.filtros ? { filtros: options.filtros } : {}),
          }),
          signal: controller.signal,
        });

        const responseBody = await this.parseResponseBody(response);
        const latencyMs = Math.round(performance.now() - requestStartedAt);

        if (response.ok) {
          return {
            status: response.status,
            attempts: attempt,
            latencyMs,
            data: responseBody,
          };
        }

        const httpError = new RagHttpError(response.status, responseBody, {
          attempts: attempt,
          latencyMs,
        });

        if (response.status >= 500 && attempt < maxAttempts) {
          lastError = httpError;
          await this.sleepImpl(this.retryDelayMs * attempt);
          continue;
        }

        throw httpError;
      } catch (error) {
        const latencyMs = Math.round(performance.now() - requestStartedAt);

        if (error?.name === 'AbortError') {
          throw new RagTimeoutError(timeoutMs, {
            attempts: attempt,
            latencyMs,
          });
        }

        if (error instanceof RagClientError) {
          throw error;
        }

        lastError = new RagClientError(`Falha de rede ao consultar o RAG: ${error.message}`, {
          code: 'RAG_NETWORK_ERROR',
          attempts: attempt,
          latencyMs,
          cause: error,
        });

        throw lastError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new RagClientError('Falha desconhecida ao consultar o RAG.');
  }

  async parseResponseBody(response) {
    const contentType = response.headers?.get?.('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  async queryMany(queries, {
    mode = 'sequential',
    concurrency = queries.length || 1,
    topK = 5,
    ...options
  } = {}) {
    if (mode === 'sequential') {
      const results = [];

      for (const query of queries) {
        results.push(await this.query(query, topK, options));
      }

      return results;
    }

    const output = new Array(queries.length);
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, queries.length));

    async function worker(client) {
      while (nextIndex < queries.length) {
        const index = nextIndex;
        nextIndex += 1;
        output[index] = await client.query(queries[index], topK, options);
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker(this)));
    return output;
  }
}

module.exports = {
  RagClient,
  RagClientError,
  RagHttpError,
  RagTimeoutError,
};
