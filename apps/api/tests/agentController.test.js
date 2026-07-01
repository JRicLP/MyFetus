const test = require('node:test');
const assert = require('node:assert');

// 1. Criar os mocks ANTES de tudo
const clinicalDataServiceMock = {
    decryptPregnantDetails: test.mock.fn(async () => ({ id: '123', name: 'Maria' }))
};
const ragRetrievalMock = {
    search: test.mock.fn(async () => [{ fonte: 'FEBRASGO', trecho: 'Diretriz de teste' }])
};
const generationServiceMock = {
    generateMaternalAgentAnalysis: test.mock.fn(async () => 'Análise simulada pelo agente')
};

// 2. Interceptar o require para injetar os mocks com certeza absoluta
const Module = require('node:module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(request) {
    if (request.endsWith('clinicalDataService')) return clinicalDataServiceMock;
    if (request.endsWith('ragRetrieval')) return ragRetrievalMock;
    if (request.endsWith('generationService')) return generationServiceMock;
    return originalRequire.apply(this, arguments);
};

// 3. Importar o controller APÓS a interceptação estar ativa
const { handleMaternalAnalysis } = require('../controllers/agentController');

test.describe('Agent Controller - Maternal Analysis', () => {
    // ... o restante dos seus testes permanece igual ...
});