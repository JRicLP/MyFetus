# Auditoria técnica de acessibilidade mobile

Este documento registra a parte técnica executada no card #110, sem transformar
decisões de produto em suposições de implementação.

## Telas auditadas no código

- Login: campos e ações com nome acessível, estado de carregamento e escala de texto.
- Início: saída da sessão, semana gestacional e informações principais com contraste revisado.
- Água: ações nomeadas, progresso anunciado como valor e cores de progresso acompanhadas do valor textual.
- Checklist: abas de trimestre, itens como checkbox e progresso com valor atual.
- Exames: solicitações, envio, abertura de arquivo e estados indisponíveis nomeados.
- Chat: campo de pergunta, envio desabilitado durante consulta e escala de texto.
- Navegação por abas: rótulos acessíveis para cada destino.

## Medidas aplicadas

- A paleta de texto e ações usa cores com contraste mínimo AA de 4,5:1 sobre branco.
- Vermelho, amarelo e verde não são a única informação: o valor textual continua visível e é anunciado.
- O componente `AccessibleText` mantém `allowFontScaling` ativo e usa multiplicador máximo
  consistente de 1,5 nas telas auditadas.
- O teste `tests/accessibility.test.ts` impede regressão da paleta AA e do multiplicador de texto.

## Limites desta entrega

- O repositório não possui uma rota de diário da gestante nem uma rota de alertas dentro
  da jornada da gestante para auditar neste card; esses fluxos não foram inventados.
- Ainda falta validação manual em Android com TalkBack e no Expo Web, caso ambos sejam
  mantidos como plataformas suportadas.
- Não foram alterados textos clínicos, regras de risco, conteúdo editorial ou o escopo médico.
- A formalização de WCAG AA, plataformas mínimas e eventual revisão de textos continua
  sendo decisão do PO quando for necessária para uma entrega de produto.
