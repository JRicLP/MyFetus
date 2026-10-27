# Protocolo do piloto de usabilidade — MyFetus

| Campo | Valor |
| --- | --- |
| Issue | E8-01 — Protocolo do piloto de usabilidade e questionário SUS |
| Versão do protocolo | 0.2.0 (ajustado conforme decisões do P.O. em 23/10/2026) |
| Estado | **Pronto para revisão final e execução controlada.** O P.O. aprovou o desenho; o recrutamento deve usar somente participantes e dados fictícios |
| Elaborado em | 2026-10-18 |
| Duração da sessão | 30–45 minutos por participante |
| Formato | Teste moderado, presencial ou remoto, com aparelho preparado pela equipe |

> **Aviso.** O MyFetus é um projeto acadêmico em validação. O piloto avalia **facilidade
> de uso**, não eficácia clínica. Nenhuma participante usa dados de saúde próprios: todas
> as tarefas usam personas e dados **sintéticos**. O app não substitui consulta,
> diagnóstico ou atendimento de emergência.

---

## 1. Objetivo

Medir se gestantes e médicos conseguem concluir, sem ajuda, as jornadas principais
do MyFetus, e coletar a percepção de usabilidade pelo questionário SUS.

Perguntas que o piloto responde:

1. As participantes concluem as tarefas principais sem ajuda? (taxa de conclusão)
2. Onde elas travam, erram ou pedem ajuda? (problemas de usabilidade, com gravidade)
3. Qual a nota SUS por perfil (gestante e médico)?
4. Que melhorias as participantes sugerem? (perguntas abertas)

Fora do objetivo: validar regras de risco, conteúdo clínico, respostas da IA (chat)
ou desempenho/segurança da infraestrutura.

---

## 2. Público e critérios

### 2.1 Perfis

| Perfil | Quem | Quantidade proposta |
| --- | --- | --- |
| Gestante | Mulheres adultas, gestantes ou não, que representem o público do app (ver 2.2) | **5 participantes, por conveniência** |
| Médico | Perfil demonstrativo preparado pelo P.O.; não haverá recrutamento de médicos neste piloto | **1 perfil controlado pelo P.O.** |

A quantidade segue a prática de testes de usabilidade qualitativos. O desenho aprovado
é de cinco gestantes por conveniência; o perfil médico será demonstrado pelo P.O., sem
recrutamento de médicos.

### 2.2 Critérios de inclusão

- 18 anos ou mais.
- Usa smartphone no dia a dia.
- Lê português.
- Gestante: está gestante ou já teve gestação.
- Médico: o fluxo será demonstrado com o perfil controlado pelo P.O.; não haverá recrutamento de médicos.
- Assinou o termo de participação (seção 7).

### 2.3 Critérios de exclusão

- Participação na equipe de desenvolvimento do MyFetus.
- Ter usado o app em sessões anteriores do piloto.
- Gestação de alto risco em acompanhamento ativo, se o P.O. entender que a sessão pode
  causar ansiedade (a decidir).
- Recusa em usar apenas dados sintéticos.
- Necessidade de tecnologia assistiva não disponível no aparelho de teste (registrar
  como limitação do piloto, não descartar a pessoa sem avaliar com o P.O.).

---

## 3. Papéis

| Papel | Responsabilidade |
| --- | --- |
| Moderador(a) | Conduz a sessão, lê as instruções exatamente como escritas, não ajuda nas tarefas (salvo nas regras da seção 5.3), aplica o SUS e as perguntas abertas |
| Observador(a) | Preenche a ficha de observação (anexo C): tempo, sucesso, erros, pedidos de ajuda e falas relevantes. Não fala com a participante |
| Responsável técnico | Prepara aparelho, contas e dados sintéticos antes da sessão; registra ambiente, versão e build (seção 4.3) |
| P.O./UPE | Recruta as cinco participantes gestantes, aprova o protocolo e o termo e decide sobre incidentes graves |

O P.O. recruta as participantes gestantes. A equipe fornece moderador, observador e suporte técnico; o perfil médico fica sob responsabilidade do P.O.

---

## 4. Preparação

### 4.1 Ambiente

- Usar o ambiente de **homologação/staging** (ver `docs/ci-cd-gcp-staging.md`), nunca produção.
- Aparelho Android com o APK do perfil `preview` do EAS (ver `docs/eas-android-build.md`),
  ou outro aparelho definido pela equipe. Registrar marca/modelo e versão do sistema.
- Base de dados populada com `npm run seed` (contas e gestações sintéticas). A senha
  das contas vem de `SEED_PASSWORD`; **não** escrever senhas neste documento nem na ficha.
- Antes de cada sessão: reinstalar ou limpar os dados do app, para que uma participante
  não veja dados da anterior.

### 4.2 Personas e dados sintéticos

Nenhum dado real é usado. A participante recebe um cartão com a persona.

| Persona | Uso | Dados |
| --- | --- | --- |
| **Ana (gestante nova)** | Tarefas G1 a G4 | Nome: "Ana Sintética"; e-mail: `ana.piloto+NN@myfetus.com` (NN = número da sessão); data de nascimento: 15/03/1995; senha: criada na hora pela participante, descartada no fim |
| DUM da Ana | Tarefa G2 | Data calculada para ~20 semanas antes do dia da sessão (o moderador escreve no cartão) |
| Exame da Ana | Tarefa G3 | PDF sintético "hemograma-sintetico.pdf", sem nome real, preparado pela equipe e já salvo no aparelho |
| **Dr. Médico de Teste** | Tarefas M1 a M4 | Conta `medico_teste@myfetus.com` criada pelo seed |
| Gestante para vínculo | Tarefa M1 | Gestante do seed vinculada só à outra médica (Dra. Luiza), ex.: `gestante_02@myfetus.com`. O seed alterna as gestantes entre os dois médicos: e-mails com número par (`gestante_02`, `_04`, `_06`, `_08`, `_10`) ficam com a Dra. Luiza; `teste_gestante` e os números ímpares ficam com o Dr. Médico de Teste |
| Gestante com exame e alerta | Tarefas M2 a M4 | `teste_gestante@myfetus.com` ("Paciente de Teste"), já vinculada ao Dr. Médico de Teste. Pelo seed, ela tem alertas "Atenção" (idade ≥ 35 e menos de 37 semanas). **O seed não cria exames:** enviar antes da sessão um PDF sintético por essa conta, para ficar "Pendente" |

**Preparação antes de cada sessão de médico (responsável técnico):**

1. Rodar o seed na homologação (idempotente).
2. Entrar como `teste_gestante@myfetus.com` e enviar um PDF sintético (fica "Pendente" para o médico).
3. Conferir na tela Alertas do médico que a Paciente de Teste mostra pelo menos um alerta.
4. Se a sessão anterior já vinculou `gestante_02` ao Dr. Médico de Teste, usar outra gestante da Dra. Luiza (`gestante_04`, `gestante_06`…) em M1.

As regras de alerta do seed vêm do código atual (`alertController.js`) e ainda não têm
validação clínica (E3-01). No piloto elas servem só para testar se o médico **encontra** o alerta.

### 4.3 Registro de reprodutibilidade (preencher em cada sessão)

| Campo | Valor |
| --- | --- |
| Data e hora | |
| Sessão nº / participante (código, ex.: G-03) | |
| Ambiente (URL da API de homologação) | |
| Versão do app (`app.json`, hoje `1.0.0`) | |
| Build EAS (ID ou número) | |
| Commit (hash curto da `main` usada no build) | |
| Aparelho e sistema | |
| Versão do protocolo | |
| Moderador / observador | |

---

## 5. Roteiro da sessão (30–45 min)

### 5.1 Linha do tempo

| Etapa | Tempo | O que acontece |
| --- | --- | --- |
| 1. Boas-vindas e termo | 5 min | Apresentação, leitura do termo, dúvidas, assinatura |
| 2. Aquecimento | 2 min | Perguntas de perfil (anexo B, parte 1) |
| 3. Explicação | 2 min | Texto padrão (5.2) e entrega do cartão da persona |
| 4. Tarefas | 15–25 min | Tarefas da seção 6, na ordem |
| 5. Questionário SUS | 3–5 min | Anexo A |
| 6. Perguntas abertas | 5 min | Anexo B, parte 2 |
| 7. Encerramento | 2 min | Agradecimento, descarte da conta da persona |

### 5.2 Texto padrão do moderador

> "Obrigado por participar. Hoje vamos testar o aplicativo, **não você**. Não existe
> resposta certa ou errada; se algo for difícil, a culpa é do aplicativo, e é isso que
> queremos descobrir. Vou pedir algumas tarefas. Tente fazer sozinha, falando em voz
> alta o que está pensando. Eu não vou poder ajudar durante as tarefas, mas você pode
> desistir de qualquer uma a qualquer momento. Use **somente** os dados do cartão que
> eu vou te entregar, nunca seus dados reais. Podemos começar?"

### 5.3 Regras de ajuda

- O moderador **não** dá dicas durante a tarefa. Respostas permitidas: "O que você
  faria agora?" e "Fique à vontade para tentar".
- Se a participante pedir ajuda duas vezes ou passar do tempo-limite, o moderador
  oferece encerrar a tarefa. Registra-se "não concluída" ou "concluída com ajuda".
- Se uma tarefa bloquear as seguintes (ex.: cadastro falha), o moderador conclui o
  passo por ela, registra "não concluída" e segue a partir do estado correto.
- Erros técnicos do app (tela branca, mensagem de erro de rede) são registrados como
  **incidente técnico** (seção 8), não como falha da participante.

---

## 6. Tarefas

Cada tarefa tem: instrução lida em voz alta, critério de sucesso, tempo-limite e o que
o observador registra. O caminho esperado serve **só** para o observador.

### 6.1 Gestante

| ID | Instrução (ler em voz alta) | Caminho esperado (só observador) | Sucesso quando | Limite |
| --- | --- | --- | --- | --- |
| G1 — Cadastro | "Você acabou de baixar o app. Crie sua conta usando os dados do cartão." | Tela inicial → Cadastro → nome, e-mail, data de nascimento, senha e confirmação → criar conta → login | Conta criada e login feito | 5 min |
| G2 — DUM | "Informe ao app a data da sua última menstruação, que está no cartão, e descubra em que semana da gestação você está." | Após o login: "Já teve outras gestações?" (responder conforme o cartão: não) → Continuar → "Qual foi a data da sua última menstruação?" → digitar DD/MM/AAAA → Confirmar → "Você está na Xª semana de gestação" | Diz em voz alta a semana mostrada | 3 min |
| G3 — Diário | "Hoje você bebeu dois copos de água. Registre isso no app e diga quanto falta para a meta do dia." | Aba Água → "1 Copo" duas vezes → ler o total e a meta de 2 L | Registro de 400 ml feito e meta lida | 3 min |
| G4 — Exame | "Seu médico pediu para você enviar o hemograma pelo app. O arquivo já está no celular. Envie e confirme que foi enviado." | Aba Exames → "Enviar exame" → escolher "hemograma-sintetico.pdf" → mensagem "Exame enviado. Aguarde o relatório do médico." → item com status "Aguardando" | Exame aparece na lista como "Aguardando" | 4 min |
| G5 — Devolutiva (opcional) | "Uma semana depois, o médico respondeu outro exame seu. Encontre o que ele escreveu." | Aba Exames → item "Respondido" → ler o comentário | Lê o comentário do médico | 3 min |

Observações:
- **"Diário" (G3):** o app não tem uma tela chamada "diário". O roteiro usa o
  **Controle de Água** como registro diário; o **Checklist** semanal pode ser uma
  tarefa extra.
- G5 exige um exame já respondido. Como a conta da Ana é criada na hora (G1), a
  proposta é fazer G5 numa conta do seed (ex.: `gestante_03@myfetus.com`) em que a
  equipe enviou um exame e respondeu como médico antes da sessão. Alternativa: pular G5.

### 6.2 Médico

| ID | Instrução (ler em voz alta) | Caminho esperado (só observador) | Sucesso quando | Limite |
| --- | --- | --- | --- | --- |
| M0 — Login | "Entre no app com a conta de médico do cartão." | Login → painel do médico | Painel aberto | 2 min |
| M1 — Vínculo | "Uma nova paciente vai fazer o pré-natal com você. Vincule a paciente do cartão à sua lista." | Painel → "Vincular Paciente" → buscar pelo e-mail → confirmar | Paciente aparece na lista do painel | 4 min |
| M2 — Revisão de exame | "A paciente [nome do cartão] enviou um exame. Encontre e abra o exame." | Painel → paciente → Exames → item "Pendente" → abrir arquivo | Arquivo aberto | 4 min |
| M3 — Devolutiva | "Escreva para a paciente um comentário curto sobre esse exame e envie." | No mesmo exame → campo "Escreva o relatório/comentário para a paciente" → "Enviar relatório" → "Relatório enviado para a paciente." | Status muda para "Respondido" | 3 min |
| M4 — Alerta | "Verifique se essa paciente tem algum alerta e diga qual é o mais importante." | Paciente → Alertas → identificar item "Crítico" (ou "Atenção" se não houver crítico) | Nomeia o alerta de maior gravidade | 3 min |

Observações:
- Em M3, o moderador orienta escrever um texto genérico (ex.: "Exame recebido, vamos
  conversar na próxima consulta"). **Nenhuma conduta clínica real** deve ser escrita.
- Em M4, a pergunta é sobre **encontrar** o alerta, não sobre concordar com a regra.
  As regras de risco ainda não foram validadas clinicamente (E3-01/E3-02).
- **"Devolutiva":** a devolutiva é o relatório do médico sobre o exame (M3), visto pela
  gestante em G5.

### 6.3 Tarefas bloqueadoras

Se a maioria das participantes de um perfil não concluir uma destas tarefas, o problema
é tratado como **bloqueador** antes de uma próxima rodada: G1, G2, G4, M1, M2, M3.
**Lista aprovada pelo P.O.:** G1, G2, G4, M1, M2 e M3.

### 6.4 Fora do roteiro

- **Chat / Assistente Médico (IA):** não é testado neste piloto, porque as respostas
  clínicas da IA ainda dependem dos guardrails e evals de E4-04 a E4-06. Se a
  participante abrir o chat espontaneamente, registrar como observação e pedir que volte
  à tarefa.
- Telas de dados clínicos detalhados do médico (antecedentes, gráficos, vacinas): fora
  do roteiro mínimo; podem entrar como exploração livre se sobrar tempo.

---

## 7. Termo de participação (versão curta aprovada para ajuste final)

> **Uso controlado.** O termo foi ajustado conforme orientação do P.O. para um teste de
> usabilidade com dados fictícios. Não mencionar pesquisa, publicação ou usar dados reais.

**Termo de participação — teste de usabilidade do aplicativo MyFetus**

Você está sendo convidado(a) a participar de um teste de usabilidade do aplicativo MyFetus,
conduzido pela Equipe MyFetus — ciclo 2026.2.

1. **Objetivo.** Avaliar se o aplicativo é fácil de usar. Não estamos avaliando você
   nem seus conhecimentos.
2. **O que você vai fazer.** Realizar algumas tarefas no aplicativo, em cerca de 30 a
   45 minutos, e responder a um questionário curto.
3. **Dados sintéticos.** Você vai usar somente dados fictícios que entregaremos. **Não
   informe nenhum dado de saúde, documento, endereço ou informação pessoal real** no
   aplicativo ou durante a conversa.
4. **O que registramos.** Anotações sobre as tarefas (tempo, conclusão, dificuldades),
   suas respostas ao questionário e comentários. **Não haverá gravação de tela, áudio ou vídeo.**
5. **Anonimização.** Você será identificado(a) apenas por um código (ex.: G-03).
   Seu nome fica só neste termo, guardado separadamente dos resultados.
6. **Uso dos registros.** As anotações serão usadas somente para identificar melhorias
   de usabilidade do produto, sem associá-las ao seu nome.
7. **Voluntário.** A participação é voluntária e sem remuneração. Você pode parar a
   qualquer momento, sem precisar explicar o motivo e sem nenhum prejuízo.
8. **Não é atendimento médico.** O aplicativo e a sessão não substituem consulta,
   diagnóstico ou atendimento de emergência. Se você tiver qualquer preocupação com a
   sua saúde ou a do bebê, procure sua equipe de saúde ou, em emergência, o SAMU (192).
9. **Descarte.** A conta, os exames e os demais dados sintéticos usados na sessão serão
   excluídos ou resetados ao final do ciclo do piloto. As anotações ficam identificadas
   somente pelo código da sessão.
10. **Contato.** O contato operacional será informado pelo P.O. antes do recrutamento.

[ ] Li e concordo em participar.
Código do participante: ______  Data: ___/___/______

Nome: ______________________________  Assinatura: ______________________

---

## 8. Incidentes e percepção de urgência clínica

### 8.1 Tipos de incidente

| Tipo | Exemplo | O que fazer |
| --- | --- | --- |
| Técnico | App fecha, tela de erro, sem conexão | Registrar no anexo D; se impedir a tarefa, o moderador contorna (5.3) ou encerra a sessão |
| Dado real | Participante começa a digitar dado pessoal ou de saúde real | Interromper, apagar o campo, lembrar o uso do cartão; registrar sem copiar o dado |
| Desconforto | Participante fica ansiosa ou incomodada com o conteúdo (ex.: alertas, semanas) | Pausar, oferecer encerrar; registrar |
| **Percepção de urgência clínica** | Participante relata sintoma real (sangramento, dor forte, perda de líquido, falta de movimentos do bebê, dor de cabeça forte, visão turva, febre) | **Parar a sessão imediatamente.** Não avaliar o sintoma nem orientar conduta. Dizer: "Isso é importante e precisa ser avaliado agora por um profissional de saúde. Procure sua equipe ou a maternidade de referência; em emergência, ligue 192 (SAMU)." Registrar sem detalhes clínicos e avisar o P.O. no mesmo dia |

### 8.2 Regras

- O moderador e o observador **não** dão orientação clínica, mesmo que sejam da área da saúde.
- O registro do incidente usa só o código do participante e o tipo do incidente; **não**
  copiar o relato clínico.
- Procedimento final de incidentes: interromper a sessão quando necessário, registrar
  somente o código e o tipo e avisar o P.O. no mesmo dia.

---

## 9. Dados, anonimização e descarte

| Item | Regra proposta |
| --- | --- |
| Identificação | Cada pessoa recebe um código (G-01, G-02… para gestantes; M-01… para médicos). Nomes ficam só nos termos |
| Termos assinados | Guardados separados dos resultados, com acesso restrito ao P.O./UPE |
| Fichas de observação, SUS e respostas abertas | Só com o código. Planilha em pasta restrita da equipe (local a definir) |
| Gravações | Não haverá gravação de tela, áudio ou vídeo |
| Contas das personas | Excluir ou desativar ao fim de cada sessão (ou resetar a homologação ao fim do piloto) |
| Exames sintéticos enviados | Excluir da homologação ao fim do piloto |
| Prazo de descarte | Não há gravações. Contas, exames e dados sintéticos são excluídos ou resetados ao fim do ciclo do piloto; fichas permanecem sem identificação nominal |
| Proibido | Guardar dado de saúde real, foto/documento da participante ou qualquer dado de paciente real |

---

## 10. Análise e critérios de conclusão

### 10.1 Métricas

| Métrica | Como calcular |
| --- | --- |
| Taxa de conclusão por tarefa | (concluídas sem ajuda) ÷ (participantes que tentaram). Reportar também "concluída com ajuda" |
| Tempo por tarefa | Mediana, por perfil |
| Erros e pedidos de ajuda | Contagem por tarefa |
| Nota SUS | Por participante (0–100), média e mediana por perfil (anexo A) |
| Problemas de usabilidade | Lista consolidada com gravidade: **crítico** (impede a tarefa), **grave** (atrasa muito ou causa erro), **leve** (incômodo) |
| Incidentes | Contagem por tipo (seção 8) |

### 10.2 Metas aprovadas pelo P.O.

- Taxa de conclusão sem ajuda ≥ 80% em cada tarefa bloqueadora.
- SUS médio ≥ 70 por perfil.
- Nenhum incidente de dado real não tratado.

### 10.3 Quando o piloto está concluído

- Número de sessões aprovado pelo P.O. realizado em cada perfil.
- Fichas, SUS e perguntas abertas consolidados num relatório (`docs/piloto/relatorio-piloto.md`, a criar).
- Problemas classificados por gravidade e transformados em issues.
- Dados descartados conforme a seção 9.

### 10.4 Quando parar ou descartar

- Parar o piloto se houver incidente técnico que impeça a maioria das tarefas (corrigir e reagendar).
- Descartar a sessão da análise se a participante não pertencer ao perfil, usar dado
  real que comprometa o registro ou desistir antes das tarefas.

---

## 11. Decisões do P.O. (registradas em 23/10/2026)

| # | Decisão | Proposta da equipe |
| --- | --- | --- |
| 1 | Recrutamento e condução | P.O. recruta cinco gestantes; equipe fornece moderador, observador e suporte técnico; não recrutar médicos |
| 2 | Perfil e quantidade | Cinco gestantes por conveniência; o perfil médico é demonstrado pelo P.O. |
| 3 | SUS e meta | Versão brasileira validada; meta SUS ≥ 68 |
| 4 | Gravação | Não haverá gravação de tela, áudio ou vídeo |
| 5 | CEP | Não é necessário neste teste de usabilidade, sem pesquisa, publicação ou dados reais |
| 6 | Tarefas bloqueadoras | G1, G2, G4, M1, M2 e M3 |
| 7 | Incidentes e urgência | Interromper a sessão, não orientar clinicamente, registrar sem PII e avisar o P.O. no mesmo dia |
| 8 | Roteiro e termo | Ajustar este protocolo e o termo curto antes do recrutamento |
| 9 | “Diário” | Controle de Água (G3); Checklist como extra |
| 10 | “Devolutiva” | Relatório do médico sobre o exame (M3), visto pela gestante (G5) |
| 11 | Perfil de gestante | Gestantes atuais ou mulheres que já tiveram gestação |

---

## Anexo A — Questionário SUS (System Usability Scale)

### A.1 Versão usada

**Escala de Usabilidade de Sistema — versão brasileira**: tradução e adaptação
transcultural da System Usability Scale (Brooke, 1996) para o português do Brasil.

Referência: LOURENÇO, D. F.; CARMONA, E. V.; LOPES, M. H. B. M. Tradução e adaptação
transcultural da System Usability Scale para o português do Brasil. *Aquichan*, v. 22,
n. 2, e2228, 2022. DOI: [10.5294/aqui.2022.22.2.8](https://doi.org/10.5294/aqui.2022.22.2.8).

Os itens abaixo foram copiados da Tabela 1 do artigo (versão usada no teste de
validação, alfa de Cronbach = 0,76). Não alterar a redação nem a ordem: isso invalida
a comparação com a escala. A palavra "sistema" se refere ao aplicativo MyFetus, e o
moderador explica isso na instrução.

### A.2 Instruções para a participante

> "Para cada frase, marque o quanto você concorda, de 1 (discordo totalmente) a 5
> (concordo totalmente). Quando a frase falar em 'sistema', pense no aplicativo
> MyFetus que você acabou de usar. Marque a primeira impressão; não pense muito."

### A.3 Itens

| # | Afirmação | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Eu acho que gostaria de usar esse sistema frequentemente. | | | | | |
| 2 | Eu achei esse sistema desnecessariamente complexo. | | | | | |
| 3 | Eu achei esse sistema fácil de usar. | | | | | |
| 4 | Eu achei que precisaria de ajuda de uma pessoa técnica para ser capaz de usar esse sistema. | | | | | |
| 5 | Eu achei que as várias funções desse sistema foram bem integradas. | | | | | |
| 6 | Eu acho que o sistema apresenta muita inconsistência. | | | | | |
| 7 | Eu imagino que a maioria das pessoas pode aprender a usar esse sistema rapidamente. | | | | | |
| 8 | Eu achei esse sistema muito pesado para usar. | | | | | |
| 9 | Eu me senti muito seguro usando o sistema. | | | | | |
| 10 | Eu precisei aprender muitas coisas antes que pudesse utilizar esse sistema. | | | | | |

1 = discordo totalmente · 2 = discordo · 3 = não concordo nem discordo · 4 = concordo · 5 = concordo totalmente

### A.4 Cálculo da nota (0–100)

1. Itens ímpares (1, 3, 5, 7, 9): nota = resposta − 1.
2. Itens pares (2, 4, 6, 8, 10): nota = 5 − resposta.
3. Somar as 10 notas (resultado de 0 a 40) e multiplicar por **2,5**.

Exemplo: respostas 4, 2, 4, 1, 4, 2, 5, 1, 4, 2 → ímpares (3+3+3+4+3=16) + pares
(3+4+3+4+3=17) = 33 → 33 × 2,5 = **82,5**.

Regras: todos os 10 itens são obrigatórios; questionário incompleto é registrado mas
não entra na média. A nota SUS **não** é porcentagem.

### A.5 Interpretação de referência

| Nota SUS | Leitura usual |
| --- | --- |
| < 50 | Usabilidade ruim |
| 50–67 | Abaixo da média |
| 68 | Média de referência |
| 68–80 | Boa |
| > 80 | Excelente |

---

## Anexo B — Perguntas de perfil e perguntas abertas

### Parte 1 — Perfil (antes das tarefas)

1. Faixa etária: 18–24 / 25–34 / 35–44 / 45 ou mais.
2. Com que frequência usa aplicativos no celular? Todo dia / algumas vezes por semana / raramente.
3. Já usou algum aplicativo de gestação ou saúde? Sim / Não.
4. (Médico) Há quanto tempo atua com pré-natal? Menos de 2 anos / 2–10 anos / mais de 10 anos.

Não perguntar sobre gestação atual, condições de saúde ou dados clínicos da participante.

### Parte 2 — Perguntas abertas (depois do SUS)

1. O que foi mais fácil de fazer no aplicativo?
2. O que foi mais difícil ou confuso? Por quê?
3. Teve alguma palavra ou tela que você não entendeu?
4. O que você mudaria primeiro?
5. (Gestante) Você usaria este aplicativo durante uma gestação? Por quê?
6. (Médico) Você usaria este aplicativo para acompanhar suas pacientes? O que faltaria?
7. Tem mais algum comentário?

---

## Anexo C — Ficha de observação (uma por participante)

Código: ______ Perfil: Gestante / Médico Data: ___/___/______ Observador: ______

| Tarefa | Início | Fim | Resultado (S = sem ajuda / A = com ajuda / N = não concluída) | Erros (nº) | Pedidos de ajuda (nº) | Observações e falas relevantes |
| --- | --- | --- | --- | --- | --- | --- |
| G1 / M0 | | | | | | |
| G2 / M1 | | | | | | |
| G3 / M2 | | | | | | |
| G4 / M3 | | | | | | |
| G5 / M4 | | | | | | |

Problemas observados:

| # | Tela | Descrição do problema | Gravidade (crítico / grave / leve) |
| --- | --- | --- | --- |
| 1 | | | |

Nota SUS calculada: ______

---

## Anexo D — Registro de incidentes

| Data/hora | Código do participante | Tipo (técnico / dado real / desconforto / urgência clínica) | O que aconteceu (sem dados clínicos ou pessoais) | Ação tomada | P.O. avisado? |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

---

## Anexo E — Checklist do moderador

Antes da sessão:
- [ ] Protocolo e termo na versão aprovada pelo P.O.
- [ ] Aparelho carregado, app reinstalado/limpo, conectado à homologação.
- [ ] Contas e dados sintéticos prontos (seção 4.2), incluindo exame pendente e alerta.
- [ ] PDF sintético no aparelho.
- [ ] Cartão da persona preenchido (DUM calculada para o dia).
- [ ] Ficha de observação, SUS e termo impressos ou em formulário.
- [ ] Registro de reprodutibilidade (4.3) preenchido.

Depois da sessão:
- [ ] SUS completo e nota calculada.
- [ ] Ficha de observação revisada com o observador.
- [ ] Conta da persona e exame enviados excluídos/desativados.
- [ ] Incidentes registrados e P.O. avisado, se for o caso.
- [ ] Termo guardado separado dos resultados.
