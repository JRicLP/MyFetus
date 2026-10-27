# ADR 0002 — E2E Mobile

## Contexto

No ciclo anterior do projeto, o aplicativo mobile possuía apenas verificação de lint e não possuía testes End-to-End (E2E). O planejamento também registra a realização de um teste E2E do agente no ciclo anterior.

Para o ciclo 2026.2, foi definida a necessidade de criar o arquivo `docs/adr/0002-e2e-mobile.md` para registrar a decisão arquitetural relacionada aos testes E2E do aplicativo mobile.

## Decisão

O projeto deverá considerar testes End-to-End (E2E) para o aplicativo mobile.

A ferramenta definida no material de planejamento para a execução desses testes é o **Maestro**. A estratégia consistirá no uso de arquivos YAML para descrever os testes, que deverão rodar de forma automatizada na esteira de integração contínua (CI), utilizando um emulador.

## Consequências

* O aplicativo mobile terá seus fluxos críticos validados de ponta a ponta.
* A estratégia cobrirá uma meta de **4 fluxos**, incluindo:

  * **Caminho da gestante:** cadastro → DUM → diário.
  * **Ciclo de exames:** médico solicita → gestante envia → extração → revisão → devolutiva visível.
* A ausência de E2E existente no ciclo anterior será tratada no novo ciclo.
* A equipe precisará utilizar a ferramenta Maestro e configurar o ambiente de CI para rodar o emulador automaticamente.
