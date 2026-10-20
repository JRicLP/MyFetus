# Manifesto de fontes do RAG — MyFetus 3.0

| Campo | Valor |
| --- | --- |
| Issue | E4-01 — Manifesto de fontes do RAG |
| Versão do manifesto | 0.2.0 (metadados e hashes conferidos em 2026-10-09; aguarda kick-off) |
| Estado do manifesto | **Proposta — aguardando aprovação do P.O. e revisão clínica** |
| Elaborado em | 2026-10-09 |
| Próxima revalidação | A definir pelo P.O. (proposta: a cada 6 meses ou quando um órgão publicar nova edição) |
| Consumidor | E4-02 — ingestão reproduzível |

> **Aviso de uso.** A IA do MyFetus é apoio **educacional e de apoio à decisão**.
> Ela nunca faz diagnóstico, nunca prescreve e nunca substitui a avaliação de
> profissional de saúde. Aprovar este manifesto **não** libera respostas clínicas:
> isso depende dos guardrails e evals de E4-04 a E4-06.

---

## 1. Objetivo e regras

Este documento é a **fonte de verdade** sobre quais documentos oficiais o RAG pode
ingerir e citar. Regras:

1. **E4-02 só ingere itens com `estado: aprovado`.** Qualquer outro estado
   (`proposta`, `ajustar`, `rejeitado`, `substituido`, `suspenso`) é ignorado pela
   ingestão. Arquivo que não esteja listado aqui não é ingerido.
2. **O hash manda.** O PDF ingerido precisa ter o mesmo SHA-256 registrado aqui. Hash
   diferente bloqueia a ingestão até nova conferência e aprovação.
3. **Lacuna não vira orientação.** Um tema sem fonte aprovada (seção 6) não pode ser
   apresentado como orientação oficial. A resposta deve dizer que não há fonte
   aprovada e encaminhar à equipe de saúde.
4. **Toda resposta cita a fonte** pelo `document_id`, título oficial e edição/ano.
5. **Sem dados de pacientes.** O acervo tem apenas publicações oficiais públicas.
   Nenhum documento com dado pessoal ou clínico real entra no repositório, no bucket
   ou no índice vetorial.
6. **Suposições não são decisões.** Itens marcados "a confirmar" ou "pendente P.O."
   não podem ser tratados como requisito aprovado.

### Estados possíveis

| Estado | Significado | Ingerido em E4-02? |
| --- | --- | --- |
| `proposta` | Sugerido pela equipe, sem decisão do P.O. | Não |
| `aprovado` | P.O. aprovou, metadados e hash conferidos | **Sim** |
| `ajustar` | P.O. pediu mudança (edição, URL, escopo) | Não |
| `rejeitado` | P.O. recusou, com motivo registrado | Não |
| `substituido` | Edição anterior trocada por outra; manter rastro | Não |
| `suspenso` | Era aprovado, mas está em revisão (nova edição, erro, licença) | Não, e deve ser removido do índice |

### Hash

Algoritmo proposto: **SHA-256** sobre os bytes exatos do PDF baixado da URL oficial
(a confirmar pelo P.O.; não há padrão anterior de hash no repositório).

```bash
sha256sum caminho/do/arquivo.pdf
```

Para cada arquivo ficam registrados o hash, o tamanho em bytes e a data de acesso.
Os hashes abaixo foram calculados em **2026-10-09** sobre PDFs baixados das URLs
indicadas em cada ficha.

---

## 2. Resumo

| # | document_id | Fonte | Categoria | Estado | SHA-256 (início) |
| --- | --- | --- | --- | --- | --- |
| 1 | `caderneta-gestante-ms-2026` | Caderneta Brasileira da Gestante — MS | Obrigatória | proposta | `068bb50763c5…` |
| 2 | `manual-gestacao-alto-risco-ms-2022` | Manual de Gestação de Alto Risco — MS | Obrigatória | proposta | `a09c39c0409d…` |
| 3 | `caderno32-prenatal-baixo-risco-ms-2012` | Cadernos de Atenção Básica nº 32 — MS | Obrigatória | proposta | `8deda10eb77e…` |
| 4 | `febrasgo-predicao-prevencao-pre-eclampsia-2023` | Position Statement FEBRASGO nº 1/2023 — pré-eclâmpsia | Obrigatória | proposta | `666b8c250ef0…` |
| 5 | `febrasgo-rastreamento-diagnostico-dmg-2019` | OPAS/MS/FEBRASGO/SBD, *Femina* 2019 — DMG | Obrigatória | proposta | `8b3325c42868…` |
| 6 | `opas-rastreamento-diagnostico-dmg-2016` | OPAS/MS/FEBRASGO/SBD — DMG (livro) | Opcional | proposta | `8877b755d2da…` |
| 7 | `opas-tratamento-dmg-2019` | OPAS/MS/FEBRASGO/SBD — tratamento do DMG | Opcional | proposta | `afd8e39f17c0…` |
| 7a | `ms-dmg-cuidados-obstetricos-2021` | MS/FEBRASGO — DMG, cuidados obstétricos | Opcional | proposta | não localizado |
| 8 | `acog-gestational-hypertension-preeclampsia-2020` | ACOG Practice Bulletin nº 222 | Pendente P.O. | proposta (fora até decisão) | — |
| 9 | `somanz-hypertension-pregnancy-2023` | SOMANZ 2023 | Rejeitada (proposta) | proposta de rejeição | — |

Detalhes nas seções 3 a 5. Registro de decisões na seção 8.

---

## 3. Fontes obrigatórias (lista mínima)

### 3.1 Caderneta Brasileira da Gestante

| Campo | Valor |
| --- | --- |
| document_id | `caderneta-gestante-ms-2026` |
| Título oficial | Caderneta brasileira da gestante [recurso eletrônico] (título da ficha catalográfica) |
| Órgão/autor | Ministério da Saúde — Secretaria de Atenção Primária à Saúde, Departamento de Gestão do Cuidado Integral |
| Edição/ano | 1ª edição, Brasília, 2026, 108 p. — ISBN 978-85-334-2907-9 |
| Idioma | pt-BR |
| URL oficial | https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/s/saude-da-mulher/publicacoes/caderneta-brasileira-da-gestante.pdf |
| Data de acesso | 2026-10-09 |
| Licença/uso | CC BY-NC-SA 4.0 — "É permitida a reprodução parcial ou total desta obra, desde que citada a fonte" (página de expediente) |
| SHA-256 | `068bb50763c549fdd7a4bf55f36653b5b8c763369e049d4d44c620db656db980` (9.439.119 bytes) |
| Temas cobertos | Direitos na gestação, mudanças do corpo, alimentação, atividade física, sinais de alerta, consultas e exames de pré-natal, vacinas, hipertensão/pré-eclâmpsia, diabetes gestacional, infecção urinária, ganho de peso, saúde bucal, saúde mental, parto, cuidados com o bebê, pós-parto, contracepção |
| Observações | A outra URL do gov.br (`.../composicao/saps/publicacoes/cadernetas-e-cartoes/caderneta-brasileira-da-gestante.pdf`) redireciona para um endereço inexistente (404) e foi descartada. O nome do arquivo não tem versão, então o MS pode trocar o PDF sem aviso: a revalidação deve comparar o hash. Metadados do PDF: criado em 2026-06-09. Versão digital (Meu SUS Digital) e versões estaduais **não** entram. |
| Estado | `proposta` |
| Aprovação | pendente |

### 3.2 Manual de Gestação de Alto Risco

| Campo | Valor |
| --- | --- |
| document_id | `manual-gestacao-alto-risco-ms-2022` (já usado em `apps/api/services/ragIngestionService.js`) |
| Título oficial | Manual de gestação de alto risco [recurso eletrônico] |
| Órgão/autor | Ministério da Saúde — Secretaria de Atenção Primária à Saúde, Departamento de Ações Programáticas |
| Edição/ano | 1ª edição, 2022, versão eletrônica (final), 692 p. — ISBN 978-65-5993-312-9 |
| Idioma | pt-BR |
| URL oficial | https://bvsms.saude.gov.br/bvs/publicacoes/manual_gestacao_alto_risco.pdf |
| Data de acesso | 2026-10-09 |
| Licença/uso | CC BY-NC-SA 4.0 — "É permitida a reprodução parcial ou total desta obra, desde que citada a fonte" |
| SHA-256 | `a09c39c0409d86b040f2ef0d424b207b7379b762e7675b09a03be28485802e96` (4.785.334 bytes) |
| Temas cobertos | Síndromes hipertensivas, diabetes, infecções, anemias, crescimento fetal, prematuridade, doenças maternas prévias, critérios de referência ao alto risco |
| Observações | O arquivo da BVS-MS é a versão final ("1ª edição – 2022 – versão eletrônica"). Cópias de terceiros marcadas "VERSÃO PRELIMINAR" (ex.: site do MPMG) **não** devem ser usadas. O ISBN 978-85-334-1767-0 é da 5ª ed. de 2012, não deste manual. Substitui o Manual Técnico de 2012 (ver 5.1). |
| Estado | `proposta` |
| Aprovação | pendente |

### 3.3 Cadernos de Atenção Básica nº 32 — Atenção ao pré-natal de baixo risco

| Campo | Valor |
| --- | --- |
| document_id | `caderno32-prenatal-baixo-risco-ms-2012` (já usado no código) |
| Título oficial | Atenção ao pré-natal de baixo risco (Série A. Normas e Manuais Técnicos — Cadernos de Atenção Básica, n. 32) |
| Órgão/autor | Ministério da Saúde — Secretaria de Atenção à Saúde, Departamento de Atenção Básica |
| Edição/ano | 1ª edição, Brasília, 2012 (tiragem de 35.000 exemplares), 318 p. — ISBN 978-85-334-1936-0 |
| Idioma | pt-BR |
| URL oficial | https://bvsms.saude.gov.br/bvs/publicacoes/cadernos_atencao_basica_32_prenatal.pdf |
| Data de acesso | 2026-10-09 |
| Licença/uso | "© 2012 Ministério da Saúde. Todos os direitos reservados. É permitida a reprodução parcial ou total desta obra, desde que citada a fonte e que não seja para venda ou qualquer fim comercial." |
| SHA-256 | `8deda10eb77ece327fb3e91ce9e46b82bf1c401df44251cd7ab74819d9e25144` (20.676.898 bytes) |
| Temas cobertos | Rotina de consultas e exames de baixo risco, queixas comuns, intercorrências clínicas e obstétricas comuns, nutrição, parto iminente, puerpério, aspectos legais |
| Observações | O arquivo da URL é a 1ª edição de 2012 (metadados do PDF: 2012-07-12); não há revisão posterior nesse endereço. Ainda é citado na Portaria GM/MS nº 5.350/2024, mas partes podem estar desatualizadas em relação à Caderneta 2026 e ao Manual de 2022 (ex.: vacinação, rastreio de DMG). **Regra de conflito proposta:** em divergência, prevalece a fonte mais recente do MS — decisão da revisão clínica. A licença proíbe uso comercial: compatível com o MyFetus apenas se o uso não for comercial (ponto para o P.O.). |
| Estado | `proposta` |
| Aprovação | pendente |

### 3.4 FEBRASGO — pré-eclâmpsia

| Campo | Valor |
| --- | --- |
| document_id | `febrasgo-predicao-prevencao-pre-eclampsia-2023` (já usado no código) |
| Título oficial | Predição e prevenção da pré-eclâmpsia — FEBRASGO Position Statement nº 1, janeiro de 2023 |
| Órgão/autor | FEBRASGO — referendado pela Comissão Nacional Especializada em Ultrassonografia em Ginecologia e Obstetrícia |
| Edição/ano | 2023 — *Femina* 2023;51(1):6-13 (7 p.). Versão em inglês: Rev Bras Ginecol Obstet 2023;45(1):49-54, DOI 10.1055/s-0043-1763495 |
| Idioma | pt-BR |
| URL oficial | https://femina.org.br/wp-content/uploads/sites/12/articles_xml/0100-7254-femina-51-1-0006/0100-7254-femina-51-1-0006.pdf (página do artigo: https://femina.org.br/article/predicao-e-prevencao-da-pre-eclampsia-numero-1-janeiro-2023/). A URL antiga em `febrasgo.org.br/images/pec/...` devolve 404 |
| Data de acesso | 2026-10-09 |
| Licença/uso | Sem declaração de licença no PDF nem na página do artigo. A versão em inglês (RBGO) é indicada como CC BY 4.0 pela editora (não conferido). Uso em RAG: pedir confirmação à FEBRASGO ou usar a versão RBGO |
| SHA-256 | `666b8c250ef0ddc974ea7f0516f31edfe73631615df30c5c635a1df482f945df` (261.908 bytes) |
| Temas cobertos | Definição e classificação da pré-eclâmpsia, rastreamento combinado no 1º trimestre, AAS profilático, prevenção |
| Observações | O documento não trata de suplementação de cálcio, então a mudança de 2026 da FEBRASGO/RBEHG sobre cálcio não o contradiz diretamente. **A revisão clínica ainda deve confirmar se este é o documento vigente.** Documentos anteriores sobre o tema estão em 5.1. |
| Estado | `proposta` |
| Aprovação | pendente |

### 3.5 FEBRASGO — diabetes mellitus gestacional

| Campo | Valor |
| --- | --- |
| document_id | `febrasgo-rastreamento-diagnostico-dmg-2019` |
| Título oficial | Rastreamento e diagnóstico de diabetes mellitus gestacional no Brasil |
| Órgão/autor | Ação conjunta OPAS, Ministério da Saúde, FEBRASGO e Sociedade Brasileira de Diabetes — publicado em *Femina* 2019;47(11):786-96 |
| Edição/ano | 2019 (versão em periódico do consenso de 2016, ver 4.1) |
| Idioma | pt-BR |
| URL oficial | https://docs.bvsalud.org/biblioref/2019/12/1046553/femina-2019-4711-786-796.pdf (BVS/LILACS). Não há cópia em `febrasgo.org.br` |
| Data de acesso | 2026-10-09 |
| Licença/uso | Nota no artigo: "A reprodução desta publicação foi autorizada." Sem licença aberta declarada |
| SHA-256 | `8b3325c42868a78f0a9cdaf7425a40847eca51852fbf102d05ae1788735b0054` (317.858 bytes) |
| Temas cobertos | Rastreio e diagnóstico de DMG, glicemia de jejum, TOTG 75 g, diabetes prévio diagnosticado na gestação |
| Observações | Não cobre tratamento (ver 4.2). Conteúdo equivalente ao livro da OPAS de 2016 (4.1) — usar um dos dois para evitar duplicidade no índice. |
| Estado | `proposta` |
| Aprovação | pendente |

---

## 4. Fontes opcionais

Não fazem parte da lista mínima. Só entram se o P.O. aprovar.

### 4.1 OPAS — rastreamento e diagnóstico de DMG

| Campo | Valor |
| --- | --- |
| document_id | `opas-rastreamento-diagnostico-dmg-2016` |
| Título oficial | Rastreamento e diagnóstico de diabetes mellitus gestacional no Brasil |
| Órgão/autor | OPAS, Ministério da Saúde, FEBRASGO, Sociedade Brasileira de Diabetes |
| Edição/ano | Brasília: OPAS, 2016, 32 p. — ISBN 978-85-7967-118-0 |
| Idioma | pt-BR |
| URL oficial | Registro: https://iris.paho.org/handle/10665.2/34278 — arquivo: https://iris.paho.org/server/api/core/bitstreams/fde90dce-c202-49a0-9354-b32d82126948/content (a URL antiga `.../bitstream/handle/10665.2/34278/9788579671180-por.pdf` hoje devolve página HTML) |
| Data de acesso | 2026-10-09 |
| Licença/uso | "© 2016 Organização Pan-Americana da Saúde. Ministério da Saúde. FEBRASGO. SBD. Todos os direitos reservados." — **sem licença aberta**; uso em RAG exige autorização |
| SHA-256 | `8877b755d2daef9c94bf9b3e82ffdb5c11390c63adde2e63dedd9eca42ee9c2d` (4.752.499 bytes) |
| Temas cobertos | Mesmos de 3.5 |
| Estado | `proposta` (alternativa a 3.5) |

### 4.2 OPAS — tratamento do DMG

| Campo | Valor |
| --- | --- |
| document_id | `opas-tratamento-dmg-2019` |
| Título oficial | Tratamento do diabetes mellitus gestacional no Brasil |
| Órgão/autor | OPAS, Ministério da Saúde, FEBRASGO, Sociedade Brasileira de Diabetes |
| Edição/ano | Brasília: OPAS, 2019, 57 p. — ISBN 978-85-94091-12-3 |
| Idioma | pt-BR |
| URL oficial | https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2020/11/Consenso_Brasileiro_Manejo_DMG_2019.pdf (Portal de Boas Práticas — Fiocruz). Não está no IRIS/OPAS; a cópia da SBD (`diabetes.org.br`) devolve 404 |
| Data de acesso | 2026-10-09 |
| Licença/uso | "© 2019 OPAS. MS. FEBRASGO. SBD. Todos os direitos reservados." — **sem licença aberta**; uso em RAG exige autorização |
| SHA-256 | `afd8e39f17c092fd4eb42edabdf6d91f68b9485879b4ad648bf69e5fde663176` (1.142.528 bytes) |
| Temas cobertos | Dieta, atividade física, metas glicêmicas, insulina e outros tratamentos do DMG, seguimento pós-parto |
| Observações | Hospedado pela Fiocruz, não pelos autores. Se o P.O. exigir URL do próprio emissor, fica sem URL oficial. |
| Estado | `proposta` |

### 4.3 MS/FEBRASGO — DMG: cuidados obstétricos

| Campo | Valor |
| --- | --- |
| document_id | `ms-dmg-cuidados-obstetricos-2021` |
| Título oficial | Diabetes mellitus gestacional no Brasil — cuidados obstétricos (título não conferido) |
| Órgão/autor | Ministério da Saúde, com FEBRASGO (autoria não conferida) |
| Edição/ano | 2021 |
| Idioma | pt-BR |
| URL oficial | **Não localizada.** A cópia antes indicada no site da FEBRASGO (`.../images/pec/vitamina-d/Diabetes-Mellitus-Gestacional-No-Brasil---Cuidados-obstetricos-1.pdf`) devolve 404 em 2026-10-09 |
| Licença/uso | não conferida |
| SHA-256 | não calculado |
| Temas cobertos | Seguimento obstétrico e parto na gestante com DMG |
| Observações | Sem arquivo disponível, **não pode ser aprovado**. Proposta: retirar da lista se a revisão clínica não indicar outra fonte. |
| Estado | `proposta` |

### 4.4 Candidatas FEBRASGO para os temas extras

Citadas no planejamento, **não** entram automaticamente. Precisam de documento,
versão e licença indicados pelo P.O./revisão clínica.

| Tema | Situação |
| --- | --- |
| Anemia na gestação | Candidato encontrado: FEBRASGO Position Statement nº 5/2026 — "Anemia ferropriva na gestação: prevenção, diagnóstico e tratamento" (https://femina.org.br/article/anemia-ferropriva-na-gestacao-prevencao-diagnostico-e-tratamento-numero-5-2026/). Não baixado nem conferido. Coberto parcialmente por 3.2 e 3.3 |
| Infecção do trato urinário | Documento FEBRASGO não identificado. Coberto parcialmente por 3.1, 3.2 e 3.3 |
| Crescimento fetal / restrição de crescimento | Documento FEBRASGO não identificado. Coberto parcialmente por 3.2 |
| Vacinação na gestação | Documento FEBRASGO não identificado. Coberto por 3.1; avaliar Calendário Nacional de Vacinação/PNI do MS como fonte oficial |

---

## 5. Fontes rejeitadas, substituídas e pendentes de decisão

### 5.1 Substituídas

| Documento | Substituído por | Motivo |
| --- | --- | --- |
| Gestação de Alto Risco — Manual Técnico, MS, 5ª ed., 2012 | 3.2 (2022) | Nova edição do MS |
| Edições anteriores da Caderneta da Gestante | 3.1 (2026) | Nova edição do MS |
| FEBRASGO — Protocolo nº 8 Pré-eclâmpsia/eclâmpsia (2018/2020) e Série Orientações e Recomendações nº 8 (2017) | 3.4 (2023), **sujeito à revisão clínica** | Documento mais recente para predição/prevenção. A revisão clínica decide se o protocolo de 2020 continua necessário para manejo |
| Critério FEBRASGO de DMG anterior a 2016 (jejum ≥ 85 mg/dL) | 3.5 / 4.1 | Critério diagnóstico alterado |

### 5.2 Pendente de decisão do P.O.

| Documento | Proposta da equipe |
| --- | --- |
| ACOG Practice Bulletin nº 222 — Gestational Hypertension and Preeclampsia (2020), inglês. Já mapeado no código | **Fora do RAG até decisão.** Opções: (a) fonte autorizada, (b) referência secundária só para a equipe clínica, sem ingestão, (c) fora. Sugestão: (b), por ser estrangeiro, em inglês e com direitos restritos do ACOG |

### 5.3 Rejeitadas (proposta)

| Documento | Motivo |
| --- | --- |
| SOMANZ — Hypertension in Pregnancy Guideline 2023. Já mapeado no código | Não consta do planejamento; diretriz australiana/neozelandesa; não é fonte brasileira priorizada |
| Qualquer PDF em `apps/api/data/guidelines/` sem entrada neste manifesto | Hoje `ragIngestionService.js` aceita qualquer PDF da pasta com metadados `unknown`. E4-02 deve trocar isso pela leitura deste manifesto |
| Protocolos municipais/estaduais, blogs, cursos, resumos e cópias de terceiros (incluindo a "versão preliminar" do Manual de Alto Risco hospedada pelo MPMG) | Não são a fonte oficial; podem estar desatualizados ou alterados |

---

## 6. Lacunas

Tema sem fonte `aprovado` não pode ser respondido como orientação oficial.

| Tema | Fonte prevista | Situação |
| --- | --- | --- |
| Pré-natal de baixo risco | 3.1, 3.3 | Aguardando aprovação |
| Alto risco (geral) | 3.2 | Aguardando aprovação |
| Pré-eclâmpsia | 3.1, 3.2, 3.4 | Aguardando aprovação; licença FEBRASGO não declarada |
| DMG — diagnóstico | 3.5 ou 4.1 | Aguardando aprovação; licença sem uso aberto ("reprodução autorizada" / "todos os direitos reservados") |
| DMG — tratamento | 3.2, 4.2 | Sem fonte específica aprovada; 4.2 com todos os direitos reservados |
| Vacinação | 3.1 | Sem fonte específica de vacinação (PNI) |
| Anemia | 3.2, 3.3 | Sem fonte específica; candidata FEBRASGO nº 5/2026 em 4.4 |
| ITU | 3.1, 3.2, 3.3 | Sem fonte específica |
| Crescimento fetal | 3.2 | Sem fonte específica |
| Nutrição | 3.1, 3.3 | Sem fonte específica; escopo a confirmar |
| Saúde mental perinatal, medicamentos na gestação, aborto, intercorrências de urgência | — | **Fora do escopo.** O RAG deve recusar e encaminhar |

Enquanto todos os itens estiverem `proposta`, **nenhum** tema tem fonte aprovada.

---

## 7. Armazenamento dos PDFs

- Os PDFs **não** são versionados no Git. `.gitignore` já ignora
  `apps/api/data/guidelines/*.pdf`.
- **Proposta (a confirmar pelo P.O.):** bucket privado no GCP (ambiente de staging já
  existe), com o caminho `rag-sources/<document_id>/<sha256>.pdf`. O hash no nome
  impede sobrescrever uma edição aprovada sem que se perceba.
- Localmente, E4-02 baixa do bucket (ou da URL oficial) para
  `apps/api/data/guidelines/`, confere o SHA-256 contra este manifesto e só então
  ingere.
- O bucket contém apenas publicações oficiais públicas. **Proibido** guardar
  prontuários, exames, laudos ou qualquer dado real de paciente.
- Para E4-02, recomenda-se extrair a tabela de fontes para um arquivo legível por
  máquina (ex.: `docs/rag/manifesto.yaml`) mantido em sincronia com este documento.
  Até lá, este Markdown é a referência.

### Metadados mínimos que cada chunk deve carregar (para E4-02)

`document_id`, `title`, `issuer`, `edition_year`, `language`, `source_url`,
`sha256`, `manifest_version`, `page` (quando disponível), `topics`.

---

## 8. Registro de aprovação

Preenchido pelo P.O. Cada item precisa de decisão com data e responsável.
Revisão clínica: **responsável ainda não identificado** (ver `docs/respostas-projeto-myfetus.md`).

| # | document_id | Decisão (aprovado / ajustar / rejeitado) | Observação do P.O. | Responsável | Data | Hash conferido por |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `caderneta-gestante-ms-2026` | | | | | |
| 2 | `manual-gestacao-alto-risco-ms-2022` | | | | | |
| 3 | `caderno32-prenatal-baixo-risco-ms-2012` | | | | | |
| 4 | `febrasgo-predicao-prevencao-pre-eclampsia-2023` | | | | | |
| 5 | `febrasgo-rastreamento-diagnostico-dmg-2019` | | | | | |
| 6 | `opas-rastreamento-diagnostico-dmg-2016` | | | | | |
| 7 | `opas-tratamento-dmg-2019` | | | | | |
| 7a | `ms-dmg-cuidados-obstetricos-2021` | | | | | |
| 8 | `acog-gestational-hypertension-preeclampsia-2020` | | | | | |
| 9 | `somanz-hypertension-pregnancy-2023` | | | | | |

### Como alterar o manifesto

1. Toda mudança é feita por PR que altera este arquivo e incrementa a versão
   (seção de cabeçalho).
2. Nova fonte ou nova edição entra como `proposta`; a anterior vira `substituido`
   só depois que a nova for `aprovado`.
3. Aprovação exige: URL oficial, edição/ano, licença e SHA-256 conferidos, e
   registro na tabela acima. **Quem aprova e o prazo de revalidação: a definir.**
4. Mudança de estado de `aprovado` para `suspenso` ou `substituido` exige
   reingestão (remover os chunks antigos do índice).

---

## 9. Pontos a confirmar com o cliente/P.O.

| # | Pergunta | Proposta da equipe |
| --- | --- | --- |
| 1 | Título e URL exatos da Caderneta 2026? | Respondido na conferência: título da ficha, 1ª ed. 2026, ISBN e URL em 3.1 (a outra URL está quebrada) |
| 2 | Edição/ano e URL do Caderno nº 32? | Respondido: 1ª ed. 2012, URL da BVS-MS (3.3). Licença veda uso comercial |
| 3 | Quais documentos FEBRASGO, versões e permissões? | 3.4 (pré-eclâmpsia: arquivo conferido, sem licença declarada, vigência a confirmar) e 3.5 (DMG). Nenhum documento de DMG tem licença aberta: pedir autorização formal ou aceitar a nota "reprodução autorizada" |
| 4 | ACOG: autorizada, secundária ou fora? | Secundária, sem ingestão (5.2) |
| 5 | PDFs no repositório ou bucket privado? | Bucket privado; nunca no Git (seção 7) |
| 6 | SHA-256 é o algoritmo aceito? | Sim, proposto (seção 1) |
| 7 | Quem aprova alterações e prazo de revalidação? | P.O. + responsável clínico; revalidação semestral ou a cada nova edição |
| 8 | A lista já cobre vacinação, anemia, ITU, crescimento fetal e nutrição? | Não com fonte específica; registrado como lacuna (seção 6) |

---

## 10. Fora do escopo desta issue

Download e ingestão, embeddings, Pinecone, eval set e UI de fontes (E4-02 em diante).
