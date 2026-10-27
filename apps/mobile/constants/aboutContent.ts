/**
 * Textos da tela Sobre (E7-09, issue #115).
 *
 * Textos de limitações, avisos e equipe aprovados pela gestão em 23/10/2026.
 * Pendentes (a issue não fecha sem eles):
 *   - canal "Fale com a equipe" (entrega separada, ainda em definição);
 *   - termos de uso e política de privacidade aprovados na E7-01, com versão e data.
 *
 * Regras desta tela:
 *   - Não listar nomes de integrantes ou e-mails pessoais sem confirmação.
 *   - Não exibir URL da API, IDs de build ou segredos.
 */
export type AboutSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

// Ainda há itens pendentes de implementação/definição (canal de contato e documentos da E7-01).
export const ABOUT_IS_DRAFT = true;

export const ABOUT_DRAFT_NOTICE =
  'Em definição: canal “Fale com a equipe” e documentos de termos de uso e privacidade.';

export const ABOUT_SECTIONS: readonly AboutSection[] = [
  {
    id: 'limitacoes',
    title: 'Limitações e avisos',
    paragraphs: [
      'MyFetus é um projeto acadêmico de apoio ao acompanhamento materno-fetal, em desenvolvimento e avaliação. ' +
        'Nesta etapa, destina-se a testes com dados fictícios. Não insira dados reais de pacientes. ' +
        'O aplicativo não substitui consultas, o acompanhamento pré-natal ou a avaliação de profissionais de saúde. ' +
        'Informações, cálculos, alertas e respostas de inteligência artificial podem conter erros e precisam de avaliação profissional. ' +
        'A ausência de alertas não garante ausência de risco.',
    ],
  },
  {
    id: 'seguranca',
    title: 'Em caso de sinais de alarme',
    paragraphs: [
      'Procure a maternidade ou ligue 192 (SAMU) se tiver: sangramento pela vagina; perda de líquido; ' +
        'contrações regulares ou dor forte na barriga; bebê mexendo menos ou parado; dor de cabeça forte, ' +
        'visão embaçada ou inchaço repentino no rosto e nas mãos; febre; desmaio ou convulsão. ' +
        'Não aguarde uma resposta do aplicativo para buscar atendimento.',
    ],
  },
  {
    id: 'equipe',
    title: 'Equipe',
    paragraphs: ['Equipe MyFetus — ciclo 2026.2', 'Projeto acadêmico da Universidade de Pernambuco (UPE).'],
  },
  {
    id: 'contato',
    title: 'Contato',
    paragraphs: ['“Fale com a equipe” será disponibilizado no próprio app. Canal em implementação.'],
  },
  {
    id: 'termos',
    title: 'Termos de uso e privacidade',
    paragraphs: [
      'Os termos de uso e a política de privacidade serão disponibilizados nesta tela, com versão e data, após a aprovação.',
    ],
  },
];
