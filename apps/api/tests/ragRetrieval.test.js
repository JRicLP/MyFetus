/**
 * ragRetrieval.test.js
 * 
 * Testes unitários para a lógica de busca semântica RAG
 * Executa: npm run test:rag
 */

const {
  cosineSimilarity,
  generateQueryEmbedding,
  semanticSearch,
  getChunkStats
} = require('../utils/ragRetrieval');

const { MOCK_CHUNKS } = require('../data/rag-mock-data');

// ============= TESTES =============

const failures = [];
const assertTrue = (condition, message) => {
  if (!condition) {
    failures.push(message);
    console.error(message);
  }
};

console.log('🧪 Iniciando testes RAG...\n');

// ---- Teste 1: Cosine Similarity ----
console.log('Teste 1: Cosine Similarity');
const vec1 = [1, 0, 0];
const vec2 = [1, 0, 0];
const vec3 = [0, 1, 0];

const sim1 = cosineSimilarity(vec1, vec2);
const sim2 = cosineSimilarity(vec1, vec3);

assertTrue(sim1 === 1, '❌ Vetores idênticos devem ter similaridade 1.0');
console.log(`✓ Vetores idênticos: ${sim1}`);

assertTrue(sim2 === 0, '❌ Vetores ortogonais devem ter similaridade 0.0');
console.log(`✓ Vetores ortogonais: ${sim2}`);
console.log('');

// ---- Teste 2: Query Embedding ----
console.log('Teste 2: Query Embedding');
const emb1 = generateQueryEmbedding('Pré-eclâmpsia');
const emb2 = generateQueryEmbedding('Pré-eclâmpsia');
const emb3 = generateQueryEmbedding('Diabete Gestacional');

assertTrue(emb1.length === 768, '❌ Embedding deve ter dimensão 768');
console.log(`✓ Embedding tem dimensão 768`);

assertTrue(JSON.stringify(emb1) === JSON.stringify(emb2), '❌ Mesma query deve gerar mesmo embedding');
console.log(`✓ Queries idênticas geram embeddings idênticos`);

assertTrue(JSON.stringify(emb1) !== JSON.stringify(emb3), '❌ Queries diferentes devem gerar embeddings diferentes');
console.log(`✓ Queries diferentes geram embeddings diferentes`);
console.log('');

// ---- Teste 3: Busca Semântica Básica ----
console.log('Teste 3: Busca Semântica Básica');
const resultado1 = semanticSearch('Pré-eclâmpsia', MOCK_CHUNKS, 5);

assertTrue(resultado1.resultados.length > 0, '❌ Deve retornar resultados');
console.log(`✓ Busca retornou ${resultado1.resultados.length} resultados`);

assertTrue(resultado1.query === 'Pré-eclâmpsia', '❌ Query deve estar na resposta');
console.log(`✓ Query armazenada corretamente`);

assertTrue(resultado1.total === resultado1.resultados.length, '❌ Total deve corresponder ao tamanho dos resultados');
console.log(`✓ Total correto: ${resultado1.total}`);

const primeiroResultado = resultado1.resultados[0];
assertTrue(primeiroResultado.relevancia >= 0 && primeiroResultado.relevancia <= 1, '❌ Relevância deve estar entre 0 e 1');
console.log(`✓ Relevância do primeiro resultado: ${primeiroResultado.relevancia}`);
console.log(`✓ Tema: ${primeiroResultado.tema}`);
console.log('');

// ---- Teste 4: Filtro por Especialidade ----
console.log('Teste 4: Filtro por Especialidade');
const resultado2 = semanticSearch('teste', MOCK_CHUNKS, 10, { especialidade: 'Obstetrícia' });

assertTrue(resultado2.resultados.length > 0, '❌ Deve haver resultados para o filtro de especialidade');
const todasEspecialidadeCorretas = resultado2.resultados.every(r => r.especialidade === 'Obstetrícia');
assertTrue(todasEspecialidadeCorretas, '❌ Todos os resultados devem ser da especialidade filtrada');
console.log(`✓ Filtro de especialidade funcionando (${resultado2.total} resultados)`);
console.log('');

// ---- Teste 5: Filtro por Fonte ----
console.log('Teste 5: Filtro por Fonte');
const resultado3 = semanticSearch('teste', MOCK_CHUNKS, 10, { fonte: 'FEBRASGO' });

assertTrue(resultado3.resultados.length > 0, '❌ Deve haver resultados para o filtro de fonte');
const todasFontesCorretas = resultado3.resultados.every(r => r.fonte === 'FEBRASGO');
assertTrue(todasFontesCorretas, '❌ Todos os resultados devem ser da fonte filtrada');
console.log(`✓ Filtro de fonte funcionando (${resultado3.total} resultados)`);
console.log('');

// ---- Teste 6: Filtro por Tema ----
console.log('Teste 6: Filtro por Tema');
const resultado4 = semanticSearch('teste', MOCK_CHUNKS, 10, { tema: 'Pré-eclâmpsia' });

assertTrue(resultado4.resultados.length > 0, '❌ Deve haver resultados para o filtro de tema');
const todosTemasCorretos = resultado4.resultados.every(r => r.tema === 'Pré-eclâmpsia');
assertTrue(todosTemasCorretos, '❌ Todos os resultados devem ser do tema filtrado');
console.log(`✓ Filtro de tema funcionando (${resultado4.total} resultados)`);
console.log('');

// ---- Teste 7: Múltiplos Filtros ----
console.log('Teste 7: Múltiplos Filtros');
const resultado5 = semanticSearch('teste', MOCK_CHUNKS, 10, {
  especialidade: 'Radiologia',
  fonte: 'FEBRASGO'
});

assertTrue(resultado5.resultados.length > 0, '❌ Deve haver resultados para múltiplos filtros');
const todosMultiplosCorretos = resultado5.resultados.every(
  r => r.especialidade === 'Radiologia' && r.fonte === 'FEBRASGO'
);
assertTrue(todosMultiplosCorretos, '❌ Todos os filtros devem ser aplicados');
console.log(`✓ Múltiplos filtros funcionando (${resultado5.total} resultados)`);
console.log('');

// ---- Teste 8: Query Vazia ----
console.log('Teste 8: Query Vazia');
const resultado6 = semanticSearch('', MOCK_CHUNKS, 5);

assertTrue(resultado6.resultados.length === 0, '❌ Query vazia deve retornar 0 resultados');
assertTrue(resultado6.erro !== undefined, '❌ Deve haver mensagem de erro');
console.log(`✓ Query vazia tratada corretamente`);
console.log('');

// ---- Teste 9: topK Respeitado ----
console.log('Teste 9: topK Respeitado');
const resultado7a = semanticSearch('teste', MOCK_CHUNKS, 3);
const resultado7b = semanticSearch('teste', MOCK_CHUNKS, 10);

assertTrue(resultado7a.resultados.length <= 3, '❌ topK=3 deve retornar no máximo 3 resultados');
console.log(`✓ topK=3 retornou ${resultado7a.resultados.length} resultados`);

assertTrue(resultado7b.resultados.length <= 10, '❌ topK=10 deve retornar no máximo 10 resultados');
console.log(`✓ topK=10 retornou ${resultado7b.resultados.length} resultados`);
console.log('');

// ---- Teste 10: Estrutura da Resposta ----
console.log('Teste 10: Estrutura da Resposta');
const resultado8 = semanticSearch('teste', MOCK_CHUNKS, 1);

const primeiroRez = resultado8.resultados[0];
assertTrue(primeiroRez.trecho !== undefined, '❌ Resposta deve conter trecho');
assertTrue(primeiroRez.fonte !== undefined, '❌ Resposta deve conter fonte');
assertTrue(primeiroRez.especialidade !== undefined, '❌ Resposta deve conter especialidade');
assertTrue(primeiroRez.tema !== undefined, '❌ Resposta deve conter tema');
assertTrue(primeiroRez.relevancia !== undefined, '❌ Resposta deve conter relevancia');
assertTrue(primeiroRez.documento_id !== undefined, '❌ Resposta deve conter documento_id');

console.log('✓ Estrutura da resposta está correta');
console.log('');

// ---- Teste 11: Estatísticas ----
console.log('Teste 11: Estatísticas');
const stats = getChunkStats(MOCK_CHUNKS);

assertTrue(stats.total_chunks === MOCK_CHUNKS.length, '❌ Total de chunks incorreto');
console.log(`✓ Total de chunks: ${stats.total_chunks}`);

assertTrue(Array.isArray(stats.especialidades), '❌ Especialidades deve ser array');
assertTrue(stats.especialidades.length > 0, '❌ Deve haver especialidades');
console.log(`✓ Especialidades: ${stats.especialidades.join(', ')}`);

assertTrue(Array.isArray(stats.fontes), '❌ Fontes deve ser array');
assertTrue(stats.fontes.length > 0, '❌ Deve haver fontes');
console.log(`✓ Fontes: ${stats.fontes.join(', ')}`);

assertTrue(Array.isArray(stats.temas), '❌ Temas deve ser array');
assertTrue(stats.temas.length > 0, '❌ Deve haver temas');
console.log(`✓ Temas: ${stats.temas.slice(0, 3).join(', ')}...`);
console.log('');

// ---- Teste 12: Performance ----
console.log('Teste 12: Performance');
const inicio = Date.now();
semanticSearch('teste de performance', MOCK_CHUNKS, 5);
const tempo = Date.now() - inicio;

assertTrue(tempo < 100, `⚠️  Busca levou ${tempo}ms (esperado < 100ms)`);
console.log(`✓ Busca executada em ${tempo}ms`);
console.log('');

if (failures.length > 0) {
  console.error(`\n❌ ${failures.length} teste(s) falharam.`);
  process.exitCode = 1;
  process.exit(1);
}

// ============= RESULTADO FINAL =============
console.log('✅ Todos os testes passaram!');
console.log('');
console.log('Próximos passos:');
console.log('  1. Testar endpoints HTTP com curl');
console.log('  2. Integrar com dados reais do Pessoa A');
console.log('  3. Conectar com Vector DB real (Pinecone)');
