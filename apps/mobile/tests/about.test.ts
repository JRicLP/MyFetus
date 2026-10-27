import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  ABOUT_DRAFT_NOTICE,
  ABOUT_IS_DRAFT,
  ABOUT_SECTIONS,
} from '../constants/aboutContent';
import {
  ACADEMIC_CYCLE,
  formatBuildDate,
  getAppVersionInfo,
  getEnvironmentLabel,
  TEST_ENVIRONMENT_LABEL,
} from '../utils/appVersion';

const root = join(__dirname, '..');
const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const aboutScreenSource = readFileSync(join(root, 'app', 'sobre.tsx'), 'utf8');
const layoutSource = readFileSync(join(root, 'app', '_layout.tsx'), 'utf8');
const allText = [
  ABOUT_DRAFT_NOTICE,
  ...ABOUT_SECTIONS.flatMap((section) => [section.title, ...section.paragraphs]),
].join('\n');

describe('versão exibida na tela Sobre', () => {
  it('coincide com a versão e o build do app.json (artefato do EAS)', () => {
    const info = getAppVersionInfo(appJson.expo, 'android');
    assert.equal(info.version, appJson.expo.version);
    assert.equal(info.build, String(appJson.expo.android.versionCode));
    assert.equal(info.label, `${appJson.expo.version} (build ${appJson.expo.android.versionCode})`);
  });

  it('a tela lê a versão do artefato (Constants.expoConfig), sem valor fixo', () => {
    assert.match(aboutScreenSource, /getAppVersionInfo\(Constants\.expoConfig,/);
  });

  it('usa o buildNumber no iOS e omite build quando não há', () => {
    assert.equal(getAppVersionInfo({ version: '1.2.3', ios: { buildNumber: '7' } }, 'ios').label, '1.2.3 (build 7)');
    assert.equal(getAppVersionInfo({ version: '1.2.3' }, 'web').label, '1.2.3');
  });

  it('não quebra sem configuração', () => {
    assert.deepEqual(getAppVersionInfo(null, 'android'), {
      version: 'não identificada',
      build: null,
      label: 'não identificada',
    });
  });

  it('identifica o ambiente de testes fora de produção', () => {
    assert.equal(getEnvironmentLabel(undefined), TEST_ENVIRONMENT_LABEL);
    assert.equal(getEnvironmentLabel('preview'), TEST_ENVIRONMENT_LABEL);
    assert.equal(getEnvironmentLabel('production'), null);
    assert.equal(TEST_ENVIRONMENT_LABEL, 'Ambiente de testes — uso acadêmico');
  });

  it('mostra a data da compilação só quando o build informa uma data válida', () => {
    assert.equal(formatBuildDate('2026-10-19T12:00:00Z'), '19/10/2026');
    assert.equal(formatBuildDate(undefined), null);
    assert.equal(formatBuildDate('ontem'), null);
    assert.match(aboutScreenSource, /Data da compilação/);
  });

  it('exibe o ciclo acadêmico separado da versão do aplicativo', () => {
    assert.equal(ACADEMIC_CYCLE, '2026.2');
    assert.match(aboutScreenSource, /Versão do aplicativo: \{versionInfo\.label\}/);
    assert.match(aboutScreenSource, /Ciclo acadêmico: \{ACADEMIC_CYCLE\}/);
  });
});

describe('conteúdo da tela Sobre', () => {
  it('usa os textos aprovados pela gestão', () => {
    const ids = ABOUT_SECTIONS.map((section) => section.id);
    assert.deepEqual(ids, ['limitacoes', 'seguranca', 'equipe', 'contato', 'termos']);
    assert.match(allText, /destina-se a testes com dados fictícios/);
    assert.match(allText, /não substitui consultas, o acompanhamento pré-natal/);
    assert.match(allText, /A ausência de alertas não garante ausência de risco\./);
    assert.match(allText, /ligue 192 \(SAMU\)/);
    assert.match(allText, /sangramento pela vagina/);
    assert.match(allText, /perda de líquido/);
    assert.match(allText, /convulsão/);
    assert.match(allText, /Não aguarde uma resposta do aplicativo/);
    assert.match(allText, /Equipe MyFetus — ciclo 2026\.2/);
    assert.match(allText, /Universidade de Pernambuco \(UPE\)/);
  });

  it('publica somente a lista de sinais de alarme aprovada pelo PO', () => {
    for (const sign of [/sangramento/i, /convuls/i, /perda de l[ií]quido/i, /vis[aã]o embaçada/i, /bebê mexendo|movimentos do beb/i]) {
      assert.match(allText, sign);
    }
  });

  it('não cita pessoas sem confirmação', () => {
    for (const name of [/Rui/, /N[óo]brega/]) {
      assert.doesNotMatch(allText, name);
    }
  });

  it('mantém marcado o que ainda está em definição (contato e termos)', () => {
    assert.equal(ABOUT_IS_DRAFT, true);
    assert.match(ABOUT_DRAFT_NOTICE, /Fale com a equipe/);
    assert.match(aboutScreenSource, /ABOUT_IS_DRAFT &&/);
  });

  it('não expõe ambiente interno, endereços ou segredos', () => {
    const forbidden = [
      /localhost/i,
      /\b\d{1,3}(\.\d{1,3}){3}\b/,
      /run\.app/i,
      /https?:\/\/(?!(www\.)?upe\.br)/i,
      /EXPO_PUBLIC_/,
      /JWT|token|secret|senha/i,
    ];
    for (const pattern of forbidden) {
      assert.doesNotMatch(allText, pattern);
    }
    for (const reference of ['process.env', 'apiClient', 'API_URL', 'projectId', 'extra']) {
      assert.equal(aboutScreenSource.includes(reference), false, `sobre.tsx não deve usar ${reference}`);
    }
  });

  it('não lista nomes de integrantes sem autorização', () => {
    const members = ['Felipe', 'Arthur', 'Bosco', 'Adryan', 'João', 'Lucas', 'Vinicius', 'Iually'];
    for (const name of members) {
      assert.equal(allText.includes(name), false, `nome não autorizado: ${name}`);
    }
  });
});

describe('navegação da tela Sobre', () => {
  it('a rota sobre fica fora dos Stack.Protected (disponível com e sem login)', () => {
    const outsideGuards = layoutSource.replace(/<Stack\.Protected[\s\S]*?<\/Stack\.Protected>/g, '');
    assert.match(outsideGuards, /<Stack\.Screen name="sobre"/);
  });

  it('a rota sobre é a última do Stack (não vira a tela inicial de quem está logado)', () => {
    // O expo-router envia rotas protegidas para a primeira tela disponível na ordem do Stack.
    const screens = [...layoutSource.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(screens.at(-1), 'sobre');
  });
});
