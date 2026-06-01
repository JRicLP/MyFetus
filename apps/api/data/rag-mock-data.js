/**
 * rag-mock-data.js
 * 
 * Dataset mock com chunks de exemplo para testes locais
 * Em produção, será substituído por dados reais do Pessoa A
 * 
 * Embeddings são vetores aleatórios simulados (dimensão 768)
 * Em produção, serão gerados com modelo real (OpenAI, HuggingFace, etc.)
 */

// Função auxiliar para gerar embedding mock determinístico
function generateMockEmbedding(seed) {
  const random = Math.sin(seed) * 10000;
  const arr = new Float32Array(768);
  for (let i = 0; i < 768; i++) {
    arr[i] = Math.sin(random + i) * 0.5;
  }
  return Array.from(arr);
}

const MOCK_CHUNKS = [
  {
    id: 'feb_001_chunk_001',
    texto: 'Pré-eclâmpsia é uma complicação grave da gestação caracterizada por hipertensão (≥140/90 mmHg) e proteinúria (≥300 mg/24h) após 20 semanas de gestação em mulher previamente normotensa.',
    embedding: generateMockEmbedding(1),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Obstetrícia',
      tema: 'Pré-eclâmpsia',
      seção: '3.1',
      tipo: 'definição'
    }
  },
  {
    id: 'feb_001_chunk_002',
    texto: 'O marcador sFlt-1/PlGF é utilizado para predição de pré-eclâmpsia. Um razão ≥85 em mulheres com ≥34 semanas aumenta significativamente o risco de pré-eclâmpsia grave nos próximos 4 dias.',
    embedding: generateMockEmbedding(2),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Obstetrícia',
      tema: 'Pré-eclâmpsia',
      seção: '3.2',
      tipo: 'recomendação'
    }
  },
  {
    id: 'feb_001_chunk_003',
    texto: 'O protocolo recomenda monitoramento contínuo com cardiotocografia (CTG) a cada 6 horas em pacientes com pré-eclâmpsia grave após 24 semanas de gestação.',
    embedding: generateMockEmbedding(3),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Obstetrícia',
      tema: 'Pré-eclâmpsia',
      seção: '4.1',
      tipo: 'protocolo'
    }
  },
  {
    id: 'feb_002_chunk_001',
    texto: 'Hemoglobina materna normal durante a gestação é 11 g/dL. Valores menores indicam anemia gestacional e requerem suplementação de ferro.',
    embedding: generateMockEmbedding(4),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Hematologia',
      tema: 'Anemia Gestacional',
      seção: '2.1',
      tipo: 'definição'
    }
  },
  {
    id: 'acog_001_chunk_001',
    texto: 'American College of Obstetricians and Gynecologists recomenda rastreamento universal para diabete gestacional entre 24-28 semanas com teste de tolerância à glicose.',
    embedding: generateMockEmbedding(5),
    metadados: {
      fonte: 'ACOG',
      especialidade: 'Obstetrícia',
      tema: 'Diabete Gestacional',
      seção: '1.1',
      tipo: 'recomendação'
    }
  },
  {
    id: 'acog_001_chunk_002',
    texto: 'Crescimento fetal restrito é diagnosticado quando o peso estimado é menor que 10º percentil para idade gestacional. Exames de Doppler são recomendados para avaliação de bem-estar fetal.',
    embedding: generateMockEmbedding(6),
    metadados: {
      fonte: 'ACOG',
      especialidade: 'Obstetrícia',
      tema: 'Crescimento Fetal Restrito',
      seção: '5.2',
      tipo: 'protocolo'
    }
  },
  {
    id: 'feb_003_chunk_001',
    texto: 'Ganho de peso gestacional recomendado varia conforme índice de massa corporal (IMC) pré-gestacional: IMC < 18.5 (ganho 12.5-18 kg), IMC 18.5-24.9 (ganho 11.5-16 kg), IMC 25-29.9 (ganho 7-11.5 kg).',
    embedding: generateMockEmbedding(7),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Nutrição',
      tema: 'Ganho de Peso',
      seção: '6.1',
      tipo: 'recomendação'
    }
  },
  {
    id: 'feb_004_chunk_001',
    texto: 'Ultrassonografia obstétrica de primeiro trimestre (11-14 semanas) inclui medida de translucência nucal para rastreamento de anomalias cromossômicas.',
    embedding: generateMockEmbedding(8),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Radiologia',
      tema: 'Ultrassom Obstétrico',
      seção: '7.1',
      tipo: 'protocolo'
    }
  },
  {
    id: 'acog_002_chunk_001',
    texto: 'Ruptura prematura de membranas (RPM) é definida como perda de integridade das membranas amnióticas antes do início do trabalho de parto, em qualquer idade gestacional.',
    embedding: generateMockEmbedding(9),
    metadados: {
      fonte: 'ACOG',
      especialidade: 'Obstetrícia',
      tema: 'Ruptura de Membranas',
      seção: '8.1',
      tipo: 'definição'
    }
  },
  {
    id: 'feb_005_chunk_001',
    texto: 'Infecção do trato urinário na gestação requer tratamento com antibiótico seguro (amoxicilina, cefalexina) mesmo se assintomática para prevenir parto prematuro.',
    embedding: generateMockEmbedding(10),
    metadados: {
      fonte: 'FEBRASGO',
      especialidade: 'Infecção',
      tema: 'ITU Gestacional',
      seção: '9.1',
      tipo: 'recomendação'
    }
  }
];

module.exports = {
  MOCK_CHUNKS
};
