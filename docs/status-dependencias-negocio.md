# Perguntas de negócio para liberar o desenvolvimento — MyFetus

**Referência dos cards:** 21/10/2026
**Projeto:** [MyFetus](https://github.com/felipemrvieira/MyFetus) · [Board](https://github.com/users/felipemrvieira/projects/3)

## Como responder

Cada bloco abaixo corresponde a uma decisão que o desenvolvedor precisa receber pronta. Responda pelo código da pergunta, escolhendo uma opção ou preenchendo os dados solicitados. Exemplo: **B04.1 = manual; B04.2 = responsável [nome], substituto [nome]**.

Preencha no início de cada bloco: **quem decide, papel, data e versão do documento avaliado**, quando houver. Decisões clínicas precisam da identificação do revisor clínico; textos e políticas institucionais precisam do responsável autorizado a aprová-los.

Uma resposta completa deve permitir ao desenvolvedor saber **quem pode fazer o quê, em qual situação, o que acontece nas exceções e qual resultado será aceito**. O campo “Com as respostas, o desenvolvedor pode” indica o trabalho liberado por cada bloco.

Se uma funcionalidade não entrar nesta etapa, registre **fora desta entrega**, com o comportamento que continua valendo e a aprovação dessa redução de escopo. Isso não pode substituir silenciosamente um requisito já aceito. Pergunta condicional pode receber “não se aplica”, com justificativa; “depois decidimos” mantém a decisão em aberto.

Os aceites anteriores permanecem válidos. Evoluções do consentimento, da nova gestação e dos pedidos/envios de exames devem ser vinculadas a novas tasks quando mudarem o escopo já aceito.

## Qual bloco responder para cada entrega

| Entrega | Blocos necessários | Observação de escopo |
| --- | --- | --- |
| #95 — Catálogo de risco | B01 | Aceitar o catálogo como documento não exige decidir antes todos os valores clínicos. |
| #97 — Regras de risco | B03, com fontes identificadas | Responder uma ficha por regra, não apenas uma resposta geral por categoria. |
| #125 — Aprovação de médicos | B04 | Pendentes/rejeitados continuam sem acesso clínico, conforme requisito do card. |
| #145 — Cópia/exportação de dados | B05 e a política B06 aplicável | Permissões devem ser explícitas para gestante, médico e administrador. |
| #146 — Privacidade; #69 — direitos e privacidade | B06 e decisões relacionadas de B04/B05/B07 | A política deve ser a mesma nos termos, no atendimento e na guarda dos dados. |
| #115 — Tela Sobre | B08 e os textos aprovados em B07 | Fornecer texto e links finais, não apenas autorização para criar um texto. |
| #60 — Protocolo do piloto | B09, coerente com B11 | É preciso escolher uma única amostra e meta, pois o protocolo e a #72 divergem. |
| #99 — Qualidade da leitura dos exames | B10 | Definir os campos esperados, a conta usada para medir acerto e os erros que reprovam. |
| #127/#147 — Fontes da IA | B02 | Aprovação por publicação e edição. Armazenamento já definido. |
| Evoluções de #143/#56 | B07, usando B06 | O escopo anterior já foi aceito; responder para as revisões e novas tasks. |
| Planejamento #53 e homologação #55 | B11 e B12 | Escolher o escopo, o prazo, o orçamento e os resultados esperados no uso. |
| Evoluções de #140/#141, frente #93 | B13 e B14, quando priorizadas | Não voltam a bloquear a parte já aceita ou o trabalho cujo escopo já está descrito. |
| Evoluções de #57/#58 | B15 e B16, quando priorizadas | Preservar o comportamento aceito até aprovar a mudança. |
| Diário da sprint 6 — #121/#163–#166 | B17, com B03/B06 aplicáveis | Ainda está na sprint 6 no board, apesar de ser citado no nome da sprint 5. |

As decisões de implantação, ferramentas, organização de código e testes ficam com a equipe. Os cards #138, #142, #144 e #148–#150 não precisam receber novas perguntas de implementação ao P.O. A eventual necessidade de orçamento adicional é respondida em B11 diante de uma proposta de custo.

## B01 — Aceite do catálogo de risco

**Cards:** [#95](https://github.com/felipemrvieira/MyFetus/issues/95) · [PR #200](https://github.com/felipemrvieira/MyFetus/pull/200).
**Quem responde:** P.O. e responsável pela revisão clínica.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B01.1 | O catálogo apresentado no PR #200 está aceito como entrega documental da #95? | Aceito / aceito com ajustes listados / não aceito. Identificar a versão e listar cada ajuste obrigatório. |
| B01.2 | Quando o catálogo foi apresentado e quem recebeu a apresentação? | Data e nomes. Se ainda não ocorreu, responsável e data marcada. |
| B01.3 | Quem decide os valores clínicos das regras? | Nome e papel do revisor principal; nome do segundo revisor, se houver. |
| B01.4 | Qual é o prazo para registrar as decisões das regras? | Data e responsável por consolidar as fichas B03. |

**Com as respostas, o desenvolvedor pode:** finalizar ou ajustar o catálogo conforme uma lista concreta. A aprovação de uso de cada regra vem de B03, não de um “sim” ao catálogo.

## B02 — Fontes que a IA está autorizada a usar

**Cards:** [#96](https://github.com/felipemrvieira/MyFetus/issues/96), [#127](https://github.com/felipemrvieira/MyFetus/issues/127) e [#147](https://github.com/felipemrvieira/MyFetus/issues/147).
**Quem responde:** P.O./revisor clínico; instituição para as permissões de uso.

**B02.1 — Para cada publicação abaixo, qual é a decisão?** Preencher todas as linhas usando: **usar nas respostas da IA / apenas referência da equipe, sem uso pela IA / não usar nesta entrega**. Se a edição for outra, identificar exatamente qual.

| Publicação identificada no manifesto | Decisão | Edição autorizada | Restrição ou autorização de uso aplicável |
| --- | --- | --- | --- |
| Caderneta Brasileira da Gestante — MS, 2026 | [preencher] | [preencher] | [preencher] |
| Manual de Gestação de Alto Risco — MS, 2022 | [preencher] | [preencher] | [preencher] |
| Caderno de Atenção Básica nº 32 — pré-natal de baixo risco, 2012 | [preencher] | [preencher] | [preencher] |
| FEBRASGO — Predição e prevenção da pré-eclâmpsia, 2023 | [preencher] | [preencher] | [preencher] |
| OPAS/MS/FEBRASGO/SBD — Rastreamento e diagnóstico de diabetes gestacional, publicação de 2019 | [preencher] | [preencher] | [preencher] |
| OPAS — Rastreamento e diagnóstico de diabetes gestacional, livro de 2016 | [preencher] | [preencher] | [preencher] |
| OPAS — Tratamento de diabetes gestacional, 2019 | [preencher] | [preencher] | [preencher] |
| MS/FEBRASGO — Cuidados obstétricos em diabetes gestacional, candidato de 2021 ainda não localizado | [preencher] | [preencher] | [identificar documento se for autorizado] |
| ACOG — Gestational Hypertension and Preeclampsia, 2020 | [preencher] | [preencher] | [preencher] |
| SOMANZ — Hypertension in Pregnancy, 2023 | [preencher] | [preencher] | [preencher] |

Referência para identificar os arquivos: [manifesto de fontes](rag/manifesto.md). As linhas marcadas como “proposta” no manifesto ainda não são aprovações.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B02.2 | Quais publicações da lista precisam estar disponíveis para aceitar esta etapa? | Lista obrigatória. Para cada ausência, indicar fonte substituta aprovada ou a limitação de escopo aceita. |
| B02.3 | Quando duas publicações divergirem no mesmo tema, qual prevalece? | Regra de prioridade por órgão/edição/tema ou indicação de que o tema deve ficar sem resposta até revisão clínica. |
| B02.4 | O que a IA deve mostrar quando o tema não tiver fonte aprovada? | Texto exato a exibir e ação oferecida à pessoa. Não autorizar resposta clínica sem a fonte exigida pelo projeto. |
| B02.5 | Anemia, infecção urinária, crescimento fetal, vacinação e nutrição entram nesta entrega? | Para cada tema: entra, com fonte identificada / fica fora, com mensagem de B02.4. |
| B02.6 | Quem aprova uma nova edição ou a retirada de uma fonte? | Nome/papel; informar se exige revisão clínica. |
| B02.7 | Quando a lista deve ser revisada? | Periodicidade e eventos que antecipam a revisão, como publicação de edição nova. |

**Com as respostas, o desenvolvedor pode:** usar o conjunto exato de publicações autorizado, excluir as demais e apresentar a mensagem aprovada nas lacunas. Uma fonte com autorização externa ainda pendente permanece fora do conjunto liberado.

## B03 — Comportamento exato das regras de risco

**Card:** [#97](https://github.com/felipemrvieira/MyFetus/issues/97).
**Quem responde:** responsável clínico, com registro do P.O.

Preencher a ficha abaixo **para cada regra do catálogo da #95**. As 12 categorias são: idade materna, pressão arterial, glicemia, IMC pré-gestacional, altura uterina, frequência cardíaca fetal, idade gestacional, antecedentes familiares, antecedentes clínicos, gestação anterior, gestação atual e vacinas. Uma categoria pode ter várias regras.

| Código | Pergunta por regra | Resposta necessária |
| --- | --- | --- |
| B03.1 | Qual regra está sendo decidida? | Identificação e versão da proposta no catálogo. |
| B03.2 | A proposta será usada, ajustada ou removida? | Aceitar como está / ajustar com os valores abaixo / remover / manter sem autorização de uso. |
| B03.3 | Quais dados e unidades entram nessa regra? | Nome de cada dado, unidade e contexto da medida; distinguir, por exemplo, os tipos de exame de glicemia. |
| B03.4 | Qual condição exata dispara o alerta? | Valor ou faixa; dizer se o valor do limite está incluído; para vários dados, dizer se todos ou qualquer um precisam atender à condição. |
| B03.5 | A regra depende da semana de gestação, tipo de gestação ou outra condição? | Não / sim, com todas as condições e faixas aplicáveis. |
| B03.6 | A medida precisa ser repetida ou confirmada? | Não / sim, com quantidade de medidas, intervalo e condição de confirmação. |
| B03.7 | O que fazer se faltar dado, a medida for inválida ou a idade gestacional for desconhecida? | Para cada caso: não avaliar / solicitar preenchimento / outra ação descrita, com texto ao usuário. Não inferir ausência de risco por falta de dado. |
| B03.8 | Qual é a gravidade do alerta? | Nível utilizado pelo produto, conforme definição clínica, e prioridade quando mais de uma regra se aplicar. |
| B03.9 | O que o médico verá? | Texto exato e ação disponível. |
| B03.10 | O que a gestante verá? | Texto exato, orientação segura e ação disponível. |
| B03.11 | Qual fonte sustenta essa regra? | Documento, edição/ano, página ou seção, justificativa e diferença em relação à proposta. |
| B03.12 | Quem aprova e a partir de quando a regra pode ser usada? | Revisor, data e versão/data de vigência. Se continuar pendente, registrar explicitamente que não será ativada. |

**Com as respostas, o desenvolvedor pode:** implementar a condição, seus limites, exceções, gravidade e mensagens sem escolher parâmetros clínicos. Respostas como “pressão alta gera atenção” não substituem os valores de B03.4.

## B04 — Aprovação e situação do médico

**Card:** [#125](https://github.com/felipemrvieira/MyFetus/issues/125).
**Quem responde:** P.O./instituição.

**Regra já definida no card:** médico pendente ou rejeitado não acessa dados clínicos.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B04.1 | Como o registro profissional será conferido nesta entrega? | Conferência manual / consulta externa identificada / consulta externa com conferência manual quando necessário. |
| B04.2 | Quem pode aprovar ou rejeitar um médico? | Papéis autorizados, responsável operacional e substituto. |
| B04.3 | Quais registros profissionais serão aceitos? | CRM e UFs aceitas; documentos ou dados usados na conferência. |
| B04.4 | Em quanto tempo a solicitação será respondida? | Prazo, dias úteis ou corridos e evento que inicia a contagem. |
| B04.5 | Como agir se a conferência não puder ser concluída? | Permanecer aguardando / encaminhar para conferência manual por [papel]. Informar prazo e mensagem. |
| B04.6 | O médico poderá corrigir um cadastro rejeitado e reenviá-lo? | Sim/não; se sim, quais campos pode corrigir e em qual situação. |
| B04.7 | Quem pode revogar uma aprovação? | Papéis e motivos permitidos; descrever efeito sobre o acesso e os vínculos existentes. |
| B04.8 | Como tratar os médicos já cadastrados? | Passam para conferência / permanecem aprovados mediante critério identificado / outra regra explícita. |

**B04.9 — O que acontece em cada situação?** Preencher todas as linhas com ações não clínicas quando o médico não estiver aprovado.

| Situação | O que pode fazer no app | Mensagem exibida | Como recebe a decisão | Próximo passo permitido |
| --- | --- | --- | --- | --- |
| Aguardando conferência | [preencher] | [texto exato] | [canal] | [ação] |
| Aprovado | [preencher] | [texto exato] | [canal] | [ação] |
| Rejeitado | [preencher] | [texto exato] | [canal] | [ação] |
| Corrigido e reenviado | [preencher] | [texto exato] | [canal] | [ação] |
| Aprovação revogada | [preencher] | [texto exato] | [canal] | [ação] |

**Com as respostas, o desenvolvedor pode:** implementar a jornada completa, as permissões e as mensagens de cada situação, inclusive reenvio, revogação e migração dos cadastros existentes.

## B05 — Pedido de cópia, correção ou exclusão dos dados

**Cards:** [#145](https://github.com/felipemrvieira/MyFetus/issues/145) e [#69](https://github.com/felipemrvieira/MyFetus/issues/69).
**Quem responde:** P.O./instituição, com revisão jurídica para guarda e exceções.

**B05.1 — Quais dados cada perfil pode solicitar?** Preencher uma linha para cada combinação aplicável de perfil e conjunto de dados.

| Quem solicita | Dados que pode solicitar | De quem são os dados | Precisa de vínculo ou outra autorização? | Dados excluídos e motivo | Formato da cópia |
| --- | --- | --- | --- | --- | --- |
| Gestante | [cadastro/gestações/diário/exames/anexos/consultas/outros] | [preencher] | [preencher] | [preencher] | PDF / JSON / ambos |
| Médico | [listar] | [próprios/pacientes autorizadas, indicando regra] | [preencher] | [preencher] | PDF / JSON / ambos |
| Administrador | [listar] | [próprios/representação autorizada/outra regra] | [preencher] | [preencher] | PDF / JSON / ambos |

PDF é a cópia para leitura; JSON é um formato reutilizável de dados. A autorização administrativa deve dizer expressamente se inclui dados de terceiros ou operações em massa.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B05.2 | Como a pessoa abre a solicitação? | Pelo app / canal externo identificado / ambos. Informar o contato atendido. |
| B05.3 | Como sua identidade será confirmada? | Ações ou informações exigidas; descrever o encaminhamento quando a confirmação falhar. |
| B05.4 | Quem atende e aprova cada tipo de solicitação? | Papel, responsável e substituto; separar cópia, correção e exclusão. |
| B05.5 | Qual é o prazo de atendimento? | Confirmar ou ajustar formalmente os até 7 dias citados no card-pai; informar dias úteis/corridos, início da contagem e efeito de identidade pendente. |
| B05.6 | Como a cópia será entregue? | Local/canal, quem pode recebê-la e prazo de disponibilidade depois de pronta. |
| B05.7 | O que acontece se o vínculo médico terminar antes da entrega? | Cancelar / revalidar autorização / outra regra explícita. Informar mensagem ao solicitante. |
| B05.8 | Quais correções a própria pessoa pode fazer e quais dependem de revisão? | Lista por dado e papel autorizado; efeito no histórico e aviso ao titular. |
| B05.9 | O que será excluído e o que precisa ser mantido? | Referência às linhas da política B06.3; tratar anexos, registros relacionados, cópias e dados derivados. |
| B05.10 | Como a pessoa acompanha a solicitação? | Para recebida, aguardando confirmação, em atendimento, concluída e recusada: texto exibido e ação disponível. |
| B05.11 | Como responder a uma recusa ou atendimento parcial? | Motivos permitidos, texto ao titular e canal para contestação ou esclarecimento. |

**Com as respostas, o desenvolvedor pode:** construir o pedido, a confirmação, as permissões, o acompanhamento e a entrega. A exclusão/anonimização da #69 precisa ter seu encaminhamento próprio; implementar só a cópia não atende essa outra parte.

## B06 — Política comum de dados e privacidade

**Cards:** [#146](https://github.com/felipemrvieira/MyFetus/issues/146), [#69](https://github.com/felipemrvieira/MyFetus/issues/69), [#50](https://github.com/felipemrvieira/MyFetus/issues/50) e [#114](https://github.com/felipemrvieira/MyFetus/issues/114).
**Documento para aprovar:** DPIA do [PR #201](https://github.com/felipemrvieira/MyFetus/pull/201), em versão identificada e atualizada. DPIA é o relatório de impacto à privacidade.
**Quem responde:** instituição/P.O., com revisão jurídica e clínica conforme o tema.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B06.1 | Qual uso está autorizado nesta etapa? | Acadêmico com dados sintéticos / outro uso descrito, com público, dados e aprovação institucional correspondente. |
| B06.2 | Quem responde pelo tratamento dos dados e pelos pedidos dos titulares? | Nome/papel, contato oficial e encarregado quando aplicável. |
| B06.4 | Menores de 18 anos podem participar? | Não nesta entrega / sim, com critério de idade, autorizações exigidas e quem as confere. |
| B06.5 | Quem inicia e quem aprova o vínculo médico-paciente? | Papéis, necessidade de confirmação da gestante e regra para desfazer o vínculo. |
| B06.6 | Qual acesso permanece depois de desfazer o vínculo? | Dados que continuam acessíveis, por qual perfil e por quanto tempo; ou nenhum acesso. |
| B06.7 | Quais informações podem ser enviadas ao serviço de IA? | Lista exata de campos; decidir separadamente identificação/data de nascimento, perguntas e texto livre dos eventos. Indicar finalidade e autorização exigida. |
| B06.8 | Quais serviços externos estão aprovados? | Provedor, finalidade, dados autorizados e referência das condições institucionais aceitas, incluindo localização/transferência e retenção. |
| B06.9 | Quais dados um administrador pode consultar ou alterar? | Permissões por conjunto de dados; indicar se operações em massa são permitidas, quem as autoriza e qual seu escopo. |
| B06.10 | Quem pode consultar logs e auditoria? | Papéis, finalidade do acesso e regra de guarda de B06.3. |

**B06.3 — Qual política vale para cada conjunto de dados?** Usar quantas linhas forem necessárias. Não usar um único prazo para tudo sem decisão expressa.

| Conjunto de dados | Finalidade e base legal aprovada | Quem pode acessar | Prazo de guarda | Evento que inicia o prazo | Ao final: excluir/anonimizar/manter por exceção | Exceção e quem autoriza |
| --- | --- | --- | --- | --- | --- | --- |
| Cadastro e perfil profissional | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |
| Gestação, diário e consultas | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |
| Exames, anexos e texto extraído | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |
| Aceites e registros de consentimento | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |
| Logs e auditoria, incluindo IP quando registrado | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |
| Cópias de segurança e dados derivados | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] | [preencher] |

**B06.11 — Qual decisão foi tomada para cada risco da DPIA?** Preencher uma linha para cada risco identificado no documento avaliado.

| Risco identificado e versão da DPIA | Decisão: resolver antes do uso / aceitar com condições / restringir o uso | Condição ou restrição concreta | Quem responde | Prazo | Quem aceita | Como comprovar o atendimento |
| --- | --- | --- | --- | --- | --- | --- |
| [identificação] | [preencher] | [preencher] | [nome/papel] | [data] | [nome/papel] | [evidência esperada] |

**Com as respostas, o desenvolvedor pode:** aplicar uma única política de permissões, vínculo, envio à IA, guarda e exclusão, e encaminhar cada risco conforme a decisão institucional. Uma condição “resolver antes do uso” libera a correção especificada, não o uso enquanto ela estiver descumprida.

## B07 — Textos e efeitos do consentimento

**Cards:** [#56](https://github.com/felipemrvieira/MyFetus/issues/56) e [#143](https://github.com/felipemrvieira/MyFetus/issues/143).
**Quem responde:** P.O./instituição, com revisão jurídica.
**Escopo:** revisão de conteúdo e novas tasks; o PR #198 e seu aceite anterior permanecem válidos.

Já foram adotados: termos por perfil, ciência da política separada do consentimento, autorização destacada para dados de saúde e autorizações opcionais de IA e pesquisa.

**B07.1 — Qual texto está aprovado?** Para cada documento, marcar aprovado na versão indicada ou fornecer o texto substituto completo.

| Documento | Decisão e versão aprovada | Texto substituto ou ajustes exatos, se houver | Vigência | Aprovador |
| --- | --- | --- | --- | --- |
| [Termos da gestante](../apps/api/legal/termos-de-uso-gestante.md) | [preencher] | [preencher] | [data] | [nome] |
| [Termos do profissional](../apps/api/legal/termos-de-uso-medico.md) | [preencher] | [preencher] | [data] | [nome] |
| [Política de privacidade](../apps/api/legal/politica-de-privacidade.md) | [preencher] | [preencher] | [data] | [nome] |

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B07.2 | O administrador precisa aceitar documentos? | Não / sim, com lista de documentos e momento do aceite. |
| B07.3 | Quando uma nova versão passa a ser exigida dos usuários existentes? | No próximo acesso / após prazo de [valor] / outra regra completa, com data de início. |
| B07.4 | O que a pessoa pode acessar enquanto falta um aceite obrigatório? | Lista de recursos permitidos e mensagem exibida; preservar o caminho para ler e regularizar o aceite. |
| B07.5 | Onde a pessoa pede informações ou exerce direitos sobre os dados? | Referenciar o canal de B05.2 e o prazo de B05.5. |

**B07.6 — Qual efeito tem recusar ou revogar cada autorização?** Preencher uma linha por finalidade e perfil aplicável, respeitando a distinção entre termos, ciência e consentimento.

| Finalidade/perfil | Se recusar: recursos indisponíveis | Se revogar, quando aplicável: efeito e momento em que começa | Recursos que continuam disponíveis | Mensagem exata | Como pode autorizar novamente |
| --- | --- | --- | --- | --- | --- |
| Termos de uso da gestante | [preencher] | [não se aplica ou regra aprovada] | [preencher] | [texto] | [ação] |
| Termos de uso do profissional | [preencher] | [não se aplica ou regra aprovada] | [preencher] | [texto] | [ação] |
| Ciência da política de privacidade | [preencher] | [não se aplica ou regra aprovada] | [preencher] | [texto] | [ação] |
| Tratamento de dados de saúde da gestante | [preencher] | [preencher] | [preencher] | [texto] | [ação] |
| Uso opcional de IA | [preencher] | [preencher] | [preencher] | [texto] | [ação] |
| Pesquisa/usabilidade opcional | [preencher] | [preencher] | [preencher] | [texto] | [ação] |

**Com as respostas, o desenvolvedor pode:** publicar o conteúdo autorizado e implementar as revisões de acesso, mensagens e regularização em novas tasks, sem interpretar uma recusa de IA como recusa de todos os recursos do app. A guarda dos aceites segue B06.3.

## B08 — Conteúdo final da tela Sobre

**Card:** [#115](https://github.com/felipemrvieira/MyFetus/issues/115) · [PR #196](https://github.com/felipemrvieira/MyFetus/pull/196).
**Quem responde:** P.O./instituição.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B08.1 | Qual nome oficial da equipe e da instituição será exibido? | Texto exato. |
| B08.2 | Quais integrantes podem ser identificados? | Lista autorizada ou “não exibir nomes”. |
| B08.3 | Qual contato será exibido e quem o atende? | E-mail/canal exato e responsável. |
| B08.4 | O texto de finalidade, limitações e avisos proposto no PR #196 está aprovado? | Aprovar a versão identificada / fornecer texto substituto completo. |
| B08.5 | Quais links de termos e privacidade serão exibidos? | Um endereço final por documento ou decisão expressa de outra forma de leitura do texto aprovado em B07.1. |
| B08.6 | A tela pode ser acessada antes do login? | Sim / não. |
| B08.7 | Além da versão do app, quais informações serão mostradas? | Mostrar ou não, separadamente: identificação de ambiente de teste e data. Informar rótulos e formato de data. |

**Com as respostas, o desenvolvedor pode:** preencher a tela e sua navegação com conteúdo final e contatos reais, sem criar texto institucional por conta própria.

## B09 — Piloto e protocolo de usabilidade

**Cards:** [#60](https://github.com/felipemrvieira/MyFetus/issues/60), [#72](https://github.com/felipemrvieira/MyFetus/issues/72) e [PR #195](https://github.com/felipemrvieira/MyFetus/pull/195).
**Quem responde:** P.O./UPE e responsáveis pela avaliação.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B09.1 | Qual amostra e meta SUS serão usadas? | Manter #72: pelo menos 5 profissionais, 5 gestantes e SUS de pelo menos 70 / adotar a proposta do PR: 3–5 médicos, 5–8 gestantes e SUS de pelo menos 68 / outra definição com números e alteração de escopo explicitamente aprovada. |
| B09.2 | Quem pode participar? | Gestantes atuais / mulheres com gestação anterior / ambas; critérios de inclusão e exclusão para participantes e profissionais. |
| B09.3 | Como tratar desistências? | Substituir até atingir a amostra / contabilizar com regra explícita; informar em quais situações uma sessão entra na análise. |
| B09.4 | Quem recruta, modera, observa e atende incidentes? | Um nome por função, com substituto quando necessário. |
| B09.5 | Como e quando serão as sessões? | Remotas/presenciais, datas e duração prevista. |
| B09.6 | Qual questionário será aplicado? | Aprovar a versão brasileira identificada no PR #195 / indicar a versão exata substituta. SUS é o questionário de percepção da usabilidade. |
| B09.7 | Haverá gravação? | Não / somente tela / tela e áudio; informar autorização exigida, quem acessa e prazo de guarda. |
| B09.8 | Qual orientação institucional permite iniciar o piloto? | Referência da orientação da UPE e decisão sobre necessidade de autorização ou avaliação ética, com responsável e data. Se pendente, indicar quem obterá e o prazo. |
| B09.9 | Qual atividade representa o diário nessa rodada? | Controle de Água / diário completo, aguardando sua disponibilidade / outra atividade descrita. |
| B09.10 | Qual resultado conta como devolutiva? | Comentário/relatório médico do exame visível à gestante / outro resultado descrito. |
| B09.11 | Quando interromper uma sessão e quem avisar? | Lista de incidentes, ação do moderador e responsável pelo encaminhamento; aprovar o procedimento de percepção de urgência do protocolo ou substituí-lo integralmente. |
| B09.12 | Como serão guardadas e descartadas as observações? | Identificação sem nome, pessoas com acesso e prazo/evento de descarte, coerentes com B06. |
| B09.13 | Roteiro e termo estão aprovados? | Decisão por documento e versão: aprovado / fornecer substituição ou ajustes exatos. |

**B09.14 — O que conta como sucesso em cada tarefa?** Aprovar expressamente os critérios do roteiro proposto ou preencher:

| Tarefa do roteiro e perfil | Entra nesta rodada? | Resultado esperado | Ajuda do moderador é permitida? | Tempo-limite | Falha impede concluir a sessão? |
| --- | --- | --- | --- | --- | --- |
| [tarefa] | Sim / não, com justificativa | [resultado observável] | Não / sim, com limite | [minutos] | Sim / não |

**Com as respostas, a equipe pode:** finalizar o protocolo, preparar as sessões e iniciar o recrutamento quando houver a autorização institucional correspondente. Para encerrar a #60, registrar também o início efetivo do recrutamento; a realização das sessões e o resultado pertencem à #72.

## B10 — Exames suportados e meta de qualidade

**Card:** [#99](https://github.com/felipemrvieira/MyFetus/issues/99).
**Quem responde:** P.O. e revisor dos exames fictícios; responsável clínico para erros com risco.

O conjunto já previsto tem pelo menos 30 PDFs sintéticos de três laboratórios fictícios e 10 fotos. Isso não precisa ser rediscutido como escolha de ferramenta.

**B10.1 — Quais tipos de exame e informações serão exigidos?** Preencher uma linha por tipo.

| Tipo de exame | Itens/medidas obrigatórios | Campos obrigatórios por item | Unidade esperada | Referência das respostas corretas |
| --- | --- | --- | --- | --- |
| [tipo] | [lista] | [nome/valor/unidade/data/outros] | [unidade por medida] | [exemplo ou tabela revisada] |

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B10.2 | O que conta como um acerto? | Cada campo individual correto / item completo com nome, valor e unidade corretos / outra conta definida sem ambiguidade. |
| B10.3 | Qual meta precisa ser atingida? | Percentual por tipo de exame e por PDF/foto, ou decisão explícita de usar somente o total. Confirmar se os 90% citados no refinamento são a meta escolhida. |
| B10.4 | Quando um valor pode ser considerado equivalente ao esperado? | Exigir igualdade / aceitar arredondamento ou conversão com tolerância e unidade definidas pelo revisor. |
| B10.5 | Quais erros reprovam mesmo que a média seja boa? | Lista, por exemplo valor errado em campo crítico ou valor apresentado sem existir no exame; definir o critério, não presumir aprovação. |
| B10.6 | O que mostrar ao encontrar campo ausente, ilegível ou duvidoso? | Para cada caso: situação exibida, mensagem e encaminhamento para revisão humana. |
| B10.7 | Quem fornece e aprova as respostas corretas dos exemplos? | Responsável, referência dos exemplos revisados e data de aprovação. |

**Com as respostas, o desenvolvedor pode:** montar os casos e medir o resultado com uma conta e um critério de reprovação definidos. Escolher uma meta não comprova que o resultado já a atingiu.

## B11 — Escopo, data e orçamento da entrega

**Card:** [#53](https://github.com/felipemrvieira/MyFetus/issues/53); orçamento adicional da [#149](https://github.com/felipemrvieira/MyFetus/issues/149), somente quando houver proposta concreta.
**Quem responde:** P.O./instituição.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B11.1 | Quais jornadas precisam funcionar nesta etapa? | Para cada uma: entra / fica para depois. Considerar cadastro, vínculo, pedido/envio de exame, revisão, devolutiva, diário, alertas e chat. |
| B11.2 | Qual é a data de disponibilidade de cada jornada incluída? | Data por jornada, coerente com a rodada do piloto. |
| B11.3 | Qual é a prioridade se não couber tudo no prazo? | Lista em ordem e quais itens podem ser adiados mediante aceite. |
| B11.4 | Qual orçamento está autorizado e até quando? | Valor máximo, período e responsável pela autorização. |
| B11.5 | Qual limitação temporária foi aceita? | Lista e impacto no roteiro/uso, ou “nenhuma”. |
| B11.6 | Se houver proposta de custo extra, ela está aprovada? | Aprovar/recusar a proposta identificada; informar limite e período. Sem proposta de custo, não se aplica e não bloqueia a equipe. |

**Com as respostas, o desenvolvedor pode:** trabalhar no escopo priorizado e planejar a entrega sem presumir prazos, despesas ou funcionalidades que o P.O. aceitaria adiar.

## B12 — Homologação e aceite do aplicativo

**Card:** [#55](https://github.com/felipemrvieira/MyFetus/issues/55).
**Quem responde:** P.O. e responsável pela homologação.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B12.1 | Quem homologa e até quando? | Nome, substituto e data. |
| B12.2 | Quais jornadas aprovadas em B11 serão avaliadas? | Lista; para cada uma, aprovar o comportamento esperado ou apontar o ajuste exato. |
| B12.3 | Quais problemas impedem o aceite? | Critérios de bloqueio no uso; listar o que pode ou não ficar como ressalva. |
| B12.4 | Quem pode aprovar com ressalvas? | Nome/papel, condições e prazo para as pendências aceitas. |

**Registro depois da execução:** versão avaliada, tarefa realizada, resultado observado e decisão aprovado/reprovado/aprovado com ressalvas.

**Com as respostas, a equipe pode:** preparar a homologação com critérios conhecidos. O aceite de uso exige a execução das tarefas e seu registro; essas perguntas não reabrem a entrega da #55 já aceita.

## B13 — Dados ao iniciar outra gestação

**Card:** evolução da [#140](https://github.com/felipemrvieira/MyFetus/issues/140).
**Quem responde:** P.O., com revisão clínica dos dados gestacionais.

A separação por conta e os demais pontos aceitos anteriormente continuam aceitos. Preencher apenas para uma nova task de comportamento entre gestações.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B13.1 | Ao iniciar outra gestação, como ficam água e checklist? | Para cada um: começar novo para a nova gestação / outro comportamento descrito. |
| B13.2 | A DUM anterior pode ser reaproveitada? | Exigir nova DUM / outra regra clínica explícita. DUM é a data da última menstruação. |
| B13.3 | Onde a pessoa consulta os registros da gestação anterior? | Tela/jornada de acesso e quais registros ficam disponíveis. |
| B13.4 | Quem pode alterar dados de uma gestação encerrada? | Perfis, dados permitidos e prazo; ou nenhuma alteração. |
| B13.5 | Quais pessoas e gestações recebem a mudança? | Somente novas gestações / também existentes, com regra de transição. |

**Com as respostas, o desenvolvedor pode:** implementar a troca de contexto e o histórico sem decidir se deve reaproveitar ou alterar dados de uma gestação anterior.

## B14 — Prioridade das melhorias de uso e acessibilidade

**Card:** [#141](https://github.com/felipemrvieira/MyFetus/issues/141), frente [#93](https://github.com/felipemrvieira/MyFetus/issues/93).
**Quem responde:** P.O.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B14.1 | Mantemos login, gestação e exames como primeiras telas? | Sim, indicando a ordem / não, fornecendo a lista ordenada substituta. |
| B14.2 | Qual dificuldade deve ser resolvida em cada tela priorizada? | Tarefa afetada e problema observado. Se apenas melhoria interna, registrar que não muda a jornada. |
| B14.3 | Qual resultado demonstra que a dificuldade foi resolvida? | Comportamento observável por tela, incluindo necessidades de acessibilidade relevantes. |
| B14.4 | Alguma mudança altera texto ou orientação clínica? | Não / sim, com texto aprovado ou referência à decisão clínica correspondente. |

**Com as respostas, o desenvolvedor pode:** trabalhar numa lista ordenada com resultado esperado. Sem mudança solicitada, o escopo já descrito no card pode avançar; essa priorização não vira um novo bloqueio à entrega existente.

## B15 — Evolução do pedido médico de exame

**Card:** nova task vinculada à [#57](https://github.com/felipemrvieira/MyFetus/issues/57).
**Quem responde:** P.O./responsável clínico, conforme a regra.

Já aceito: médico vinculado cria pedido; gestante vê a pendência; solicitante pode cancelar enquanto pendente.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B15.1 | Quais categorias de exame devem estar disponíveis? | Lista final com os nomes exibidos. |
| B15.2 | O pedido terá prazo? | Não / data escolhida pelo médico / prazo calculado por regra explícita. Informar referência de horário para vencimento. |
| B15.3 | O que acontece ao vencer o prazo? | Permitir ou impedir envio; mensagens para gestante/médico e eventual aviso aprovado. |
| B15.4 | Quem pode editar ou cancelar em cada etapa? | Matriz perfil × pendente/enviado/revisado/cancelado, com ações permitidas e efeito sobre envios já feitos. |
| B15.5 | Qual evento significa “revisado”? | Exame avaliado / devolutiva publicada / pedido encerrado / outro evento definido. |
| B15.6 | Como tratar pedidos criados antes da mudança? | Manter regra anterior / aplicar nova regra com transição explicitada. |

**Com as respostas, o desenvolvedor pode:** implementar categorias, prazo e transições sem interpretar o significado clínico/operacional dos estados.

## B16 — Evolução do envio de exames

**Card:** nova task vinculada à [#58](https://github.com/felipemrvieira/MyFetus/issues/58).
**Quem responde:** P.O., com a política de guarda definida em B06.

Já aceito: envio de um arquivo associado a um pedido pendente da gestante.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B16.1 | Será permitido envio sem pedido? | Não / sim, com situações permitidas e informação obrigatória para identificar o exame. |
| B16.2 | Quantos arquivos podem compor o mesmo pedido? | Um / número máximo. Se forem vários, como a gestante indica que terminou de enviar? |
| B16.3 | Quem pode substituir um arquivo incorreto e até quando? | Perfis e etapas permitidas; esclarecer o caso de exame já revisado. |
| B16.4 | O que acontece com o arquivo e a revisão anteriores numa substituição? | Manter no histórico com indicação de substituído / outro tratamento autorizado por B06; dizer se exige nova revisão. |
| B16.5 | Qual política de guarda vale para original e texto extraído? | Referenciar as linhas aprovadas em B06.3. |
| B16.6 | As novas regras valem para pedidos e arquivos já existentes? | Não / sim, com regra de transição. |

**Com as respostas, o desenvolvedor pode:** implementar envio avulso, agrupamento e substituição, quando autorizados, sem perder a regra de histórico e revisão.

## B17 — Diário da gestante

**Cards:** [#121](https://github.com/felipemrvieira/MyFetus/issues/121) e #163–#166; sprint 6 no board.
**Quem responde:** P.O. e responsável clínico.

| Código | Pergunta | Resposta necessária |
| --- | --- | --- |
| B17.1 | Quais sintomas aparecem como opções? | Lista exata; dizer se texto livre é permitido e quando é obrigatório. |
| B17.2 | Quais informações são obrigatórias? | Por campo: nome, obrigatório/opcional, unidade e comportamento se estiver ausente. |
| B17.3 | Como impedir valores inválidos sem confundi-los com alerta de risco? | Faixas plausíveis aprovadas e referência das regras clínicas B03; texto ao usuário em cada caso. |
| B17.4 | Quando deve aparecer o registro de movimentos fetais? | Confirmar 28 semanas, como propõe o card, ou informar semana aprovada; dizer o que ocorre se a idade gestacional for desconhecida. |
| B17.5 | Quantos registros podem ser feitos por dia e qual horário vale para o dia? | Um/vários, tratamento de registro retroativo e referência de horário. |
| B17.6 | A gestante pode corrigir uma entrada? | Sim/não; prazo, campos alteráveis e como consultar o registro anterior. |
| B17.7 | O médico pode apenas ler ou também alterar? | Regra por ação e vínculo; indicar quem vê a autoria da correção. |
| B17.8 | É obrigatório registrar sem internet nesta etapa? | Não, com mensagem / sim, descrevendo o que fica disponível, como a pessoa vê o envio pendente e o que acontece se editar o mesmo registro antes de enviá-lo. |
| B17.9 | Como funciona depois de encerrar a gestação? | Permissões para criar, corrigir e consultar entradas anteriores. |
| B17.10 | Quais dados do diário podem alimentar alertas ou curvas? | Lista e regras/fontes clínicas aprovadas; manter dados apenas no histórico quando a regra ainda não estiver autorizada. |

**Com as respostas, o desenvolvedor pode:** construir formulário, histórico, correções e permissões com regras explícitas. Alerta clínico depende da ficha B03 correspondente, não de uma decisão do implementador.

## B18 — Perguntas das etapas seguintes

Preencher ao priorizar cada entrega. As opções abaixo são decisões de produto; não retomam perguntas de ferramenta ou implementação.

| Código e cards | Pergunta objetiva | Resposta que libera a definição |
| --- | --- | --- |
| B18.1 — [#119](https://github.com/felipemrvieira/MyFetus/issues/119), curvas | Qual referência e qual resultado devem ser usados para cada curva? | Por curva: fonte/edição/população, faixa gestacional, unidade, comportamento fora da faixa e dez casos com resultado esperado e tolerância aprovados pelo revisor. |
| B18.2 — [#126](https://github.com/felipemrvieira/MyFetus/issues/126), validação cega | O que conta como concordância nos 20 casos? | Classificadores, casos/gabarito aprovados sem ver a saída do sistema, regra exata por gravidade, tratamento de divergências e procedimento se ficar abaixo dos 90% previstos. |
| B18.3 — [#122](https://github.com/felipemrvieira/MyFetus/issues/122), [#123](https://github.com/felipemrvieira/MyFetus/issues/123), [#124](https://github.com/felipemrvieira/MyFetus/issues/124), diário e risco | Quais regras do diário e por idade gestacional estão liberadas? | Uma ficha B03 por regra, incluindo sintomas, combinações, fonte de vacinas, altura uterina/ganho de peso, ausência de dados e gestação múltipla. |
| B18.4 — [#129](https://github.com/felipemrvieira/MyFetus/issues/129), limites da IA | O que a IA deve responder em cada situação? | Lista de temas permitidos/proibidos; textos finais para urgência, fora de escopo, falta de fonte e aviso fixo; exemplos de perguntas com resposta esperada aprovados. |
| B18.5 — [#130](https://github.com/felipemrvieira/MyFetus/issues/130), citações | Como a fonte aparece e quando ela é considerada suficiente? | Campos visíveis da citação, comportamento ao abri-la e regra quando faltar página/edição; preservar o bloqueio já exigido de resposta sem fonte recuperada. |
| B18.6 — [#131](https://github.com/felipemrvieira/MyFetus/issues/131), avaliação da IA | Qual resposta aprova, exige correção ou é perigosa? | 50 perguntas previstas com categoria, resposta esperada, fontes mínimas e exemplos de reprovação; avaliador, meta global/por categoria e regra para ausência de fonte. Preservar pelo menos 90% aprovadas e zero perigosas, conforme card. |
| B18.7 — [#132](https://github.com/felipemrvieira/MyFetus/issues/132), notificações | Para cada evento, quem recebe qual aviso e em qual horário? | Evento, destinatário, autorização opcional, título/corpo aprovados, destino ao abrir e horário/fuso; regra quando o usuário recusar a notificação. |
| B18.8 — [#132](https://github.com/felipemrvieira/MyFetus/issues/132), consultas | Quem pode criar, ler, corrigir, encerrar ou excluir a consulta? | Matriz por perfil/vínculo, campos obrigatórios, fonte da idade gestacional, histórico das correções e finalidade da prescrição textual; esclarecer validade/assinatura e acesso da enfermagem. |
| B18.9 — [#133](https://github.com/felipemrvieira/MyFetus/issues/133), relatório da gestação | Que conteúdo entra no relatório de cada gestante? | Identificação completa/iniciais, período e referência de data do diário, exames/alertas por situação, idioma, acesso posterior, compartilhamento permitido e validade/assinatura. |
| B18.10 — [#135](https://github.com/felipemrvieira/MyFetus/issues/135), relatório da consulta | O que significa “última consulta” e qual conteúdo será exportado? | Consulta criada/finalizada ou selecionada; paciente/gestação, exames/alertas elegíveis, inclusão de prescrição e identificação, validade/assinatura e manutenção do conteúdo da data de geração. |
| B18.11 — [#73](https://github.com/felipemrvieira/MyFetus/issues/73), [#134](https://github.com/felipemrvieira/MyFetus/issues/134), encerramento | Quais problemas impedem a entrega e quem pode aceitar os demais? | Critérios de gravidade, lista de ressalvas aceitas com responsáveis/prazos, conteúdo e aprovador dos materiais, limites declarados, backlog seguinte e aceite do P.O. para release previsto em #188. |

## Cobertura dos pendentes das sprints 3, 4 e 5

O levantamento encontrou 22 cards pendentes. Este controle serve para localizar a resposta necessária sem recolocar perguntas técnicas na pauta.

| Sprint | Cards que recebem definição de negócio por este questionário | Cards sem nova pergunta direta de negócio |
| --- | --- | --- |
| 3 | #95 → B01; #140 → B13 apenas para evolução; #141 → B14 para prioridade/experiência. | #138 já teve aceite; #142 segue com a equipe; #93 consolida as subtarefas. |
| 4 | #97 → B03; #125 → B04; #145 → B05/B06; #146 → B06; #115 → B07/B08; #60 → B09/B11; #143 → B07 em novas tasks. | #144 segue com a equipe; #56 e #69 consolidam entregas e as decisões correspondentes. |
| 5 | #99 → B10; #147 → B02. | #127 consolida B02 e suas subtarefas; #148–#150 seguem com a equipe, com B11 somente se houver proposta de custo extra. |

O armazenamento dos manuais já foi definido como bucket privado no GCP, com PDFs fora do Git. Essa escolha está resolvida e não precisa de nova resposta.

## Como transformar a resposta em tarefa executável

Depois de preencher um bloco, registrar no card:

- Bloco e respostas aprovadas, com responsável, data e versão.
- Perfis autorizados, situações previstas e comportamento nas exceções.
- Texto e conteúdo que o usuário verá, quando aplicável.
- Critérios observáveis de aceite, derivados das respostas.
- Referências das políticas ou regras compartilhadas, sem pedir a mesma decisão novamente.

Usar ao menos um cenário de aceite para cada comportamento e exceção relevantes:

> Dado [perfil e situação], quando [ação ou condição], então [resultado visível], e [ação permitida ou proibida].

Exemplo de preenchimento, sem representar decisão do projeto:

> Dado um médico aguardando aprovação, quando ele entra no app, então vê a mensagem aprovada e o status da solicitação, e não acessa dados clínicos.

O objetivo do questionário é **retirar do desenvolvedor as decisões de negócio**. As respostas completas liberam a definição e a execução do escopo correspondente; dependências de entrega, autorizações externas ainda não obtidas e validação de uso continuam sendo acompanhadas no card.

A estrutura do questionário está preparada, mas as respostas de negócio ainda devem ser preenchidas e aprovadas pelas pessoas indicadas. Esta edição modifica somente o documento, preservando os aceites anteriores e os status dos cards no GitHub.
