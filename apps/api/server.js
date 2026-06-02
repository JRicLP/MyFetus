/**
 * server.js
 *
 * Servidor principal do backend do projeto MyFetus.
 * Configura middlewares, rotas e inicializa o servidor Express.
 *
 * Funcionalidades:
 * 1. Configuração do CORS:
 *    - Permite requisições do frontend (React, Expo, etc.).
 *    - Em produção, deve-se limitar o `origin` ao domínio autorizado.
 *
 * 2. Middlewares:
 *    - `express.json()`: interpreta requisições com JSON.
 *    - `express.urlencoded()`: interpreta formulários.
 *
 * 3. Rotas importadas:
 *    - /api/users           → users.js
 *    - /api/pregnants       → pregnants.js
 *    - /api/pregnancies     → pregnancies.js
 *    - /api/pregnancyEvents → pregnancyEvents.js
 *    - /api/documents       → documents.js
 *    - /api/medicoes        → medicoes.js
 *
 * 4. Rota de teste:
 *    - GET /ping → retorna mensagem para verificar se o backend está ativo.
 *
 * 5. Inicialização do servidor:
 *    - Porta configurável via `process.env.PORT` (default 3000).
 *    - Host configurado como '0.0.0.0' para permitir conexões externas
 *      dentro do container Docker.
 *
 * Observações:
 * - Este arquivo deve ser o ponto de entrada do backend.
 * - Todas as rotas estão prefixadas com `/api` para padronização.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./backend');
const logger = require('./utils/logger');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  'http://127.0.0.1:3000',
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configuração do CORS — em produção, defina CORS_ORIGIN com os domínios permitidos.
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin não permitido pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

//Middlewares para interpretar JSON e formulários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.request(req);
  next();
});

//Importação das rotas
const userRoutes = require('./routes/users');
const pregnantRoutes = require('./routes/pregnants');
const pregnancyRoutes = require('./routes/pregnancies');
const pregnancyEventsRoutes = require('./routes/pregnancyEvents');
const documentsRoutes = require('./routes/documents');
const fetalMeasurementsRoutes = require('./routes/medicoes');
const syncRoutes = require('./routes/sync');
const internalLoincRoutes = require('./routes/internalLoinc');
const { startDocumentTextExtractionWorker } = require('./workers/pdfWorker');
const { startVectorIndexWorker } = require('./services/vectorIndexWorker');

//Prefixo /api para padronização das rotas
app.use('/api/users', userRoutes);
app.use('/api/pregnants', pregnantRoutes);
app.use('/api/pregnancies', pregnancyRoutes);
app.use('/api/pregnancyEvents', pregnancyEventsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/medicoes', fetalMeasurementsRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/internal/loinc', internalLoincRoutes);

//Rota de teste (para verificar se o backend está no ar)
app.get('/ping', (req, res) => {
  res.json({ message: 'Backend funcionando corretamente.' });
});

startDocumentTextExtractionWorker();
startVectorIndexWorker();

//Inicializa o servidor
const PORT = process.env.PORT || 3000;

//importante: use '0.0.0.0' para aceitar conexões externas dentro do container Docker
app.listen(PORT, '0.0.0.0', () => {
  logger.startup(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
});
