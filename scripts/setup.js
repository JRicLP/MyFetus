/**
 * scripts/setup.js
 * Script de onboarding automatizado para o MyFetus (E1-06).
 * Prepara o ambiente de desenvolvimento local em comando unico:
 * - Valida pre-requisitos (Node.js >= 18, Docker).
 * - Cria e popula .env com segredos seguros.
 * - Instala dependencias necessarias.
 * - Inicializa o container PostgreSQL via Docker Compose.
 * - Aguarda a saude do banco de dados.
 * - Executa a carga de dados iniciais (seeds).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { runMigrations } = require('./migrate');

function runCommand(command, options = {}) {
  return execSync(command, {
    stdio: options.silent ? 'pipe' : 'inherit',
    encoding: 'utf8',
    ...options,
  });
}

function checkPrerequisites() {
  console.log('[INFO] Verificando pre-requisitos do ambiente...');

  // 1. Node.js >= 18
  const currentMajor = parseInt(process.versions.node.split('.')[0], 10);
  if (currentMajor < 18) {
    console.error(`[ERRO] Versao do Node.js incompativel (< 18). Versao atual: ${process.version}`);
    process.exit(1);
  }

  // 2. Docker CLI
  try {
    runCommand('docker --version', { silent: true });
  } catch (err) {
    console.error('[ERRO] Docker nao encontrado no PATH do sistema. Instale o Docker Desktop.');
    process.exit(1);
  }

  // 3. Docker Daemon ativo
  try {
    runCommand('docker info', { silent: true });
  } catch (err) {
    console.error('[ERRO] O daemon do Docker nao esta em execucao. Inicie o Docker Desktop e tente novamente.');
    process.exit(1);
  }

  console.log('[OK] Pre-requisitos basicos verificados (Node.js e Docker ativos).');
}

function handleEnvFile() {
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const envExamplePath = path.join(rootDir, '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    console.error('[ERRO] Arquivo .env.example nao encontrado na raiz do projeto.');
    process.exit(1);
  }

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('[OK] Arquivo .env criado a partir de .env.example.');
  } else {
    console.log('[INFO] Arquivo .env existente detectado. Preservando configuracoes existentes.');
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  function getEnvValue(key) {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  }

  function setEnvValue(key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  let secretsUpdated = false;

  // PG_PASSWORD
  if (!getEnvValue('PG_PASSWORD')) {
    setEnvValue('PG_PASSWORD', crypto.randomBytes(16).toString('hex'));
    secretsUpdated = true;
  }

  // JWT_SECRET (minimo 32 chars)
  const currentJwt = getEnvValue('JWT_SECRET');
  if (!currentJwt || currentJwt.length < 32) {
    setEnvValue('JWT_SECRET', crypto.randomBytes(32).toString('hex'));
    secretsUpdated = true;
  }

  // AES_ENCRYPTION_KEY_V1 (64 hex / 32 bytes)
  const currentAes = getEnvValue('AES_ENCRYPTION_KEY_V1');
  if (!currentAes || currentAes.length !== 64) {
    setEnvValue('AES_ENCRYPTION_KEY_V1', crypto.randomBytes(32).toString('hex'));
    secretsUpdated = true;
  }

  // EMAIL_LOOKUP_HMAC_KEY (64 hex / 32 bytes)
  const currentHmac = getEnvValue('EMAIL_LOOKUP_HMAC_KEY');
  if (!currentHmac || currentHmac.length !== 64) {
    setEnvValue('EMAIL_LOOKUP_HMAC_KEY', crypto.randomBytes(32).toString('hex'));
    secretsUpdated = true;
  }

  // AES_KEY_VERSION
  if (!getEnvValue('AES_KEY_VERSION')) {
    setEnvValue('AES_KEY_VERSION', '1');
    secretsUpdated = true;
  }

  if (secretsUpdated) {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('[OK] Segredos criptograficos locais gerados e salvos no .env.');
  } else {
    console.log('[INFO] Segredos locais ja configurados no .env.');
  }

  // Disponibiliza as configuracoes do .env para os comandos deste processo.
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }

  return envPath;
}

function installDependencies() {
  const rootDir = path.resolve(__dirname, '..');
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const apiNodeModules = path.join(rootDir, 'apps', 'api', 'node_modules');
  const mobileNodeModules = path.join(rootDir, 'apps', 'mobile', 'node_modules');

  if (!fs.existsSync(rootNodeModules)) {
    console.log('[INFO] Instalando dependencias da raiz do monorepo...');
    runCommand('npm install');
    console.log('[OK] Dependencias da raiz instaladas.');
  } else {
    console.log('[INFO] Dependencias da raiz ja instaladas.');
  }

  if (!fs.existsSync(apiNodeModules)) {
    console.log('[INFO] Instalando dependencias do backend (apps/api)...');
    runCommand('npm --prefix apps/api install');
    console.log('[OK] Dependencias do backend instaladas.');
  } else {
    console.log('[INFO] Dependencias do backend ja instaladas.');
  }

  if (!fs.existsSync(mobileNodeModules)) {
    console.log('[INFO] Instalando dependencias do app mobile (apps/mobile)...');
    runCommand('npm --prefix apps/mobile install');
    console.log('[OK] Dependencias do app mobile instaladas.');
  } else {
    console.log('[INFO] Dependencias do app mobile ja instaladas.');
  }
}

function startDatabase(isReset) {
  if (isReset) {
    console.log('[INFO] Modo reset ativado: derrubando containers e limpando volumes...');
    try {
      runCommand('docker compose down -v');
      console.log('[OK] Containers e volumes anteriores removidos.');
    } catch (err) {
      console.log('[AVISO] Nao foi possivel executar docker compose down -v (nenhum container ativo).');
    }
  }

  console.log('[INFO] Iniciando servico de banco de dados (PostgreSQL 15)...');
  runCommand('docker compose up -d db');
  console.log('[OK] Container do PostgreSQL iniciado.');
}

function waitForDatabaseReady(maxWaitSeconds = 60) {
  console.log('[INFO] Aguardando banco de dados estar pronto para conexoes...');

  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    try {
      // 1. Verifica se o container esta marcado como healthy pelo Docker
      const healthStatus = runCommand('docker inspect --format="{{.State.Health.Status}}" myfetus-db', { silent: true }).trim();
      
      // 2. Testa query simples de conexao ativa no PostgreSQL
      const databaseUser = process.env.PG_USER || 'myfetus_app';
      const databaseName = process.env.PG_DATABASE || 'myfetus';
      const queryCheck = runCommand(`docker compose exec -T db psql -U "${databaseUser}" -d "${databaseName}" -c "SELECT 1;"`, { silent: true });

      if (healthStatus === 'healthy' && queryCheck.includes('1')) {
        isReady = true;
        break;
      }
    } catch (e) {
      // Aguarda 1.5s antes da proxima tentativa
    }

    try {
      execSync('node -e "setTimeout(() => {}, 1500)"');
    } catch (e) {}
  }

  if (!isReady) {
    console.error(`[ERRO] O banco de dados nao respondeu dentro do limite de ${maxWaitSeconds} segundos.`);
    process.exit(1);
  }

  console.log('[OK] Banco de dados pronto para conexoes.');
}

function runSeeds() {
  console.log('[INFO] Executando carga inicial de dados (seeds)...');
  try {
    runCommand('node scripts/seed.js');
  } catch (err) {
    console.error('[ERRO] Falha ao rodar scripts de seed.');
    process.exit(1);
  }
}

function main() {
  const isReset = process.argv.includes('--reset');

  console.log('================================================================');
  console.log('             MyFetus 3.0 - Setup do Ambiente Local             ');
  console.log('================================================================');

  checkPrerequisites();
  handleEnvFile();
  installDependencies();
  startDatabase(isReset);
  waitForDatabaseReady();
  runMigrations();
  runSeeds();

  console.log('----------------------------------------------------------------');
  console.log('[OK] Setup concluido com sucesso!');
  console.log('[INFO] Servicos prontos:');
  console.log('       - PostgreSQL: localhost:5434 (db: myfetus, user: myfetus_app)');
  console.log('       - Executar API Backend: npm run dev:api');
  console.log('       - Executar App Mobile:  npm run dev:mobile');
  console.log('       - Migracoes do Banco:   npm run db:migrate');
  console.log('       - Reiniciar do zero:    npm run setup -- --reset');
  console.log('[AVISO] Para habilitar recursos de IA/RAG, preencha GEMINI_API_KEY e PINECONE_API_KEY no arquivo .env.');
  console.log('================================================================');
}

main();
