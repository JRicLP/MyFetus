# ADR 0001 — Hospedagem

## Contexto

Na versão anterior do projeto MyFetus, o sistema não possuía deploy e permanecia disponível apenas no ambiente local.

Para o ciclo 2026.2, o planejamento prevê disponibilizar uma versão de homologação online, com acesso por HTTPS.

## Decisão

O projeto deverá possuir uma hospedagem online para o ambiente de homologação, utilizando HTTPS.

O serviço específico de hospedagem não está definido no material de planejamento analisado e deverá ser registrado posteriormente quando a equipe tomar essa decisão.

## Consequências

* O sistema poderá ser acessado fora do ambiente local.
* O ambiente de homologação poderá ser utilizado para validação e demonstrações.
* Será necessário definir posteriormente o serviço/provedor de hospedagem.
* A infraestrutura deverá disponibilizar acesso utilizando HTTPS.
