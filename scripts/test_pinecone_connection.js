const path = require('path');
const { createRequire } = require('module');

const apiRequire = createRequire(path.resolve(__dirname, '..', 'apps', 'api', 'package.json'));
const dotenv = apiRequire('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', 'apps', 'api', '.env') });

const { getPineconeClient, getPineconeIndex } = apiRequire('./utils/pineconeClient');

async function main() {
  const indexName = process.env.PINECONE_INDEX_NAME;
  const expectedDimension = Number(process.env.EMBEDDINGS_DIMENSION || 1536);
  const client = getPineconeClient();
  const index = await getPineconeIndex();

  const [description, stats] = await Promise.all([
    client.describeIndex(indexName),
    index.describeIndexStats(),
  ]);

  const dimension = description.dimension || expectedDimension;
  const metric = description.metric || 'desconhecida';
  const vectorCount = stats.totalRecordCount ?? stats.totalVectorCount ?? 0;

  console.log('Conexao com Pinecone estabelecida');
  console.log(`   Indice: ${indexName}`);
  console.log(`   Dimensao: ${dimension}`);
  console.log(`   Vetores indexados: ${vectorCount}`);
  console.log(`   Metrica: ${metric}`);
}

main().catch((err) => {
  console.error('Falha ao conectar no Pinecone:', err.message);
  process.exit(1);
});
