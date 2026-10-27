import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EXPORT_GENERIC_ERROR,
  exportFileName,
  getExportErrorMessage,
  parseDataExport,
  summarizeExport,
} from '../utils/dataExport';

const apiError = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } });

const gestanteExport = {
  formato: { nome: 'myfetus-exportacao-titular', versao: '1.0' },
  gerado_em: '2026-10-24T18:30:00.000Z',
  titular: { id: 1, name: 'Maria Sintetica', role: 'gestante' },
  consentimentos: [{ purpose: 'tratamento_dados_saude' }],
  prontuario: { id: 10 },
  gestacoes: [{ id: 100 }],
  eventos: [{ id: 1 }, { id: 2 }],
  biometria_fetal: [],
  peso_materno: [{ id: 1 }],
  pedidos_de_exame: [{ id: 500 }],
  documentos: [{ id: 900 }],
  vinculos_medicos: [{ status: 'active' }],
  observacoes: ['nota'],
};

describe('exportação dos dados do titular (Meus dados)', () => {
  it('aceita o formato da API e rejeita respostas inesperadas', () => {
    assert.equal(parseDataExport(gestanteExport)?.titular.id, 1);
    assert.equal(parseDataExport(null), null);
    assert.equal(parseDataExport({ ...gestanteExport, titular: undefined }), null);
    assert.equal(parseDataExport({ ...gestanteExport, formato: {} }), null);
    assert.equal(parseDataExport('<html>erro</html>'), null);
  });

  it('nomeia o arquivo com a data da geração', () => {
    assert.equal(exportFileName('2026-10-24T18:30:00.000Z'), 'myfetus-meus-dados-2026-10-24.json');
    assert.equal(exportFileName('data-invalida'), 'myfetus-meus-dados-arquivo.json');
  });

  it('resume as seções em lista, sem prontuário nem observações', () => {
    const summary = summarizeExport(parseDataExport(gestanteExport)!);

    assert.deepEqual(summary.find((item) => item.label === 'Eventos da gestação'), { label: 'Eventos da gestação', count: 2 });
    assert.deepEqual(summary.find((item) => item.label === 'Medidas do bebê'), { label: 'Medidas do bebê', count: 0 });
    assert.equal(summary.length, 8);
  });

  it('para o médico, o resumo só mostra os consentimentos', () => {
    const medico = {
      formato: { nome: 'myfetus-exportacao-titular', versao: '1.0' },
      gerado_em: '2026-10-24T18:30:00.000Z',
      titular: { id: 3, name: 'Dra Ana', role: 'medico' },
      consentimentos: [{}, {}],
      perfil_profissional: { crm: '000001' },
    };

    assert.deepEqual(summarizeExport(parseDataExport(medico)!), [{ label: 'Consentimentos', count: 2 }]);
  });

  it('diferencia senha errada (403) de sessão expirada (401)', () => {
    assert.equal(getExportErrorMessage(apiError(403, { code: 'INVALID_PASSWORD' })), 'Senha incorreta. Confira e tente novamente.');
    assert.equal(getExportErrorMessage(apiError(401, { error: 'Token inválido ou expirado' })), 'Sua sessão expirou. Entre novamente.');
    assert.equal(getExportErrorMessage(apiError(400, { code: 'PASSWORD_REQUIRED' })), 'Digite sua senha para confirmar a exportação.');
  });

  it('traduz limite, falta de conexão e erro interno sem expor detalhe técnico', () => {
    assert.match(getExportErrorMessage(apiError(429)), /Muitas tentativas/);
    assert.match(getExportErrorMessage(new Error('Network Error')), /Sem conexão/);
    assert.equal(getExportErrorMessage(apiError(500, { error: 'Erro ao exportar dados' })), EXPORT_GENERIC_ERROR);
  });
});
