# Análise do mobile: boas práticas, convenções e manutenção

**Data da análise:** 02/10/2026  
**Escopo:** `apps/mobile`, sua configuração e as etapas de CI que validam o aplicativo.

## 1. Parecer executivo

A stack do mobile é adequada: Expo, React Native, Expo Router e TypeScript permitem manter Android, iOS e web sem reescrita. O projeto também já possui `strict: true`, roteamento baseado em arquivos, uma camada inicial para acesso à API e algumas regras puras com testes.

O principal problema está nas fronteiras do código. As telas acumulam renderização, chamadas HTTP, transformação de dados, validação, regras clínicas e navegação. Isso cria repetição e torna uma alteração pequena propensa a comportamentos diferentes em telas distintas. Há ainda problemas concretos de sessão, download autenticado, isolamento de dados locais e cálculo de datas.

Antes de ampliar funcionalidades, recomenda-se estabilizar quatro áreas:

1. alinhar Expo, React Native e dependências à matriz oficial;
2. centralizar sessão, autorização no cliente e tratamento HTTP;
3. retirar regras clínicas e formulários complexos de dentro das rotas;
4. tornar typecheck e testes verificações obrigatórias da CI.

Não é necessária uma reescrita. A evolução pode ser incremental, começando pelos fluxos de autenticação, gestação e prontuário.

## 2. Como a análise foi feita

Foram examinados os arquivos TypeScript/TSX, configuração do Expo, dependências, rotas, armazenamento local, chamadas HTTP, formulários, componentes, testes e workflow de CI.

Antes das correções, foram executados:

| Verificação | Resultado |
|---|---|
| `npm run lint` | Passou sem erros |
| `npx tsc --noEmit` | Falhou: os dois testes importam `node:test` e `node:assert`, mas o projeto não possui a configuração/tipos de Node necessários |
| `npx expo-doctor` | 17 de 22 verificações passaram; 5 falharam |
| `npm audit --omit=dev --audit-level=high` | Encontrou 28 ocorrências em dependências transitivas: 1 crítica, 13 altas e 14 moderadas |

Após o primeiro incremento da issue [#93](https://github.com/felipemrvieira/MyFetus/issues/93), o estado das verificações passou a ser:

| Verificação | Resultado após o incremento |
|---|---|
| `npm run lint` | Passou sem erros |
| `npm run typecheck` | Passou sem erros |
| `npm run test:ci` | 16 testes passaram |
| `npx expo-doctor` | 21 de 21 verificações passaram |
| `npx expo export --platform all` | Bundles de Android, iOS e web gerados com sucesso |
| `npm audit --omit=dev --audit-level=high` | Restam 24 ocorrências transitivas: 1 crítica, 9 altas e 14 moderadas; as correções automáticas sugeridas rebaixam Expo/Router para versões incompatíveis |

A revisão funcional ainda precisa ser feita em aparelho/emulador e contra uma instância integrada da API. O export valida resolução de módulos, rotas e geração dos bundles, mas não substitui os testes das jornadas reais.

## 3. Visão geral do estado encontrado na análise inicial

| Indicador | Estado observado |
|---|---:|
| Arquivos `.ts`/`.tsx` | 48 |
| Arquivos de rota `.tsx` | 33 |
| Linhas TypeScript/TSX | 9.537 |
| Telas com 250 linhas ou mais | 18 |
| Maior tela | `resumo.tsx`, com 592 linhas |
| Usos explícitos de `any` | 13 |
| Chamadas de `console.log/error/warn` | 42 |
| Cores hexadecimais distintas em telas/componentes | 55 |
| Telas usando `SafeAreaView` do React Native | 18 |
| Propriedades explícitas de acessibilidade encontradas | 0 |

### Pontos positivos

- A aplicação já usa TypeScript em todo o mobile e habilita modo estrito.
- O Expo Router organiza de forma compreensível as áreas da gestante e do médico.
- `utils/api.ts` concentra a descoberta da URL da API e a inclusão do token.
- Há componentes separados para os gráficos e funções puras em `growthChartData.ts`.
- O uso de `useWindowDimensions` em parte da jornada da gestante é melhor do que capturar dimensões uma única vez.
- O lockfile do mobile é usado na CI por meio de `npm ci`.
- As operações assíncronas mais importantes possuem estados de carregamento e bloqueio de duplo envio.

## 4. Achados priorizados

| ID | Prioridade | Tema | Consequência principal |
|---|---|---|---|
| MOB-01 | Crítica | Matriz Expo e dependências incompatíveis | Instabilidade de runtime, regressão de memória e upgrades inseguros |
| MOB-02 | Crítica | Sessão incompleta e token em armazenamento comum | Rotas sem proteção no cliente, ausência de logout e maior exposição do token |
| MOB-03 | Crítica | Download autenticado aberto no navegador externo | Exames podem falhar com `401`, pois o header Bearer não acompanha a abertura |
| MOB-04 | Crítica | Dados locais sem escopo de usuário e bug na hidratação | Um usuário pode receber estado local de outro; registro de água do dia pode ser sobrescrito |
| MOB-05 | Alta | Regras clínicas duplicadas dentro da UI | Divergência silenciosa de classificações e baixa auditabilidade |
| MOB-06 | Alta | Datas gestacionais frágeis | Data futura/ inválida pode gerar semana incorreta ou exceção |
| MOB-07 | Alta | Cliente HTTP e contratos sem tipagem/validação | Erros repetidos, respostas inválidas aceitas e tratamento inconsistente de `401` |
| MOB-08 | Alta | Typecheck e testes fora da CI | `strict` existe, mas o projeto não possui uma barreira de compilação confiável |
| MOB-09 | Alta | Rotas grandes e organização horizontal | Alto acoplamento e dificuldade de localizar uma mudança de domínio |
| MOB-10 | Média | Formulários e componentes repetidos | Mais código para manter e validações diferentes para o mesmo conceito |
| MOB-11 | Média | Acessibilidade e safe area | Controles sem semântica para leitores de tela e API depreciada |
| MOB-12 | Média | Design e responsividade sem tokens | Inconsistência visual e layout frágil em tablets/telas grandes |
| MOB-13 | Média | Navegação, nomes e fluxos incompletos | Rotas duplicadas, casts que anulam typed routes e telas sem efeito real |
| MOB-14 | Média | Logs, falhas assíncronas e observabilidade | Possível exposição de dados e baixa capacidade de diagnóstico em produção |
| MOB-15 | Baixa | Assets e listas sem estratégia de crescimento | Bundle maior e degradação progressiva de renderização |

## 5. Detalhamento e recomendações

### MOB-01 — Alinhar Expo, React Native e dependências

**Evidências**

- O manifesto usa `expo: ^56.0.6`; a instalação local resolveu `expo@56.0.8`.
- O Expo Doctor espera patches mais recentes do SDK 56 e encontrou `react-native-screens@4.25.2` onde espera `~4.26.0`.
- `expo-modules-core` está instalado diretamente, embora deva ser consumido por `expo`.
- `@react-navigation/bottom-tabs`, `@react-navigation/elements` e `@react-navigation/native` são dependências diretas, mas não existem imports diretos no código.
- O schema rejeitou `newArchEnabled` e `android.edgeToEdgeEnabled` em `app.json`.
- A versão instalada do Hermes possui regressão de memória conhecida pelo diagnóstico do Expo.
- O audit encontrou vulnerabilidades transitivas; algumas sugestões com `--force` tentariam instalar versões antigas e incompatíveis de Expo/Router.

**Ajuste recomendado**

1. Criar uma atualização isolada para Expo SDK 57, em versão `57.0.9` ou superior, seguindo o guia de migração e usando `npx expo install --fix` para alinhar os pacotes.
2. Remover as dependências diretas de `@react-navigation/*` e `expo-modules-core` depois de confirmar que não há consumo indireto intencional.
3. Remover ou atualizar os campos rejeitados de `app.json` conforme o schema do SDK escolhido.
4. Preferir a faixa recomendada pelo Expo (`~`) para o pacote `expo`, evitando que um `npm install` avance além da matriz testada.
5. Reexecutar `expo-doctor`, builds Android/iOS/web e o audit. Não aplicar `npm audit fix --force` sem revisar as mudanças de versão.

**Critério de aceite:** Expo Doctor sem falhas, dependências alinhadas e smoke test nos três alvos suportados.

### MOB-02 — Criar uma camada real de sessão

**Evidências**

- `app/_layout.tsx` declara todas as pilhas sem guardas de autenticação ou papel.
- `app/index.tsx` sempre redireciona para `/login`, mesmo quando existe sessão válida.
- O login grava o token duas vezes (`login.tsx:47-55`), usa `router.push` após autenticar e registra a resposta completa no console (`login.tsx:51`).
- Não foi encontrado fluxo de logout nem remoção de `authToken`/`userData`.
- Token e perfil ficam no `AsyncStorage` (`login.tsx:48-56`), que é armazenamento funcional, mas não é o cofre do sistema operacional.

**Ajuste recomendado**

- Criar `SessionProvider` com estados `loading`, `authenticated`, `anonymous` e `role`.
- Guardar o token em `expo-secure-store` no Android/iOS. Manter dados não sensíveis e cacheáveis separados do token.
- Proteger os grupos de rotas da gestante, do médico e do admin com `Stack.Protected`; a proteção do cliente melhora navegação e privacidade local, enquanto a API continua sendo a autoridade de segurança.
- Tratar expiração/`401` em um único ponto: apagar a sessão e levar o usuário ao login.
- Implementar logout e usar `router.replace` ao entrar/sair para evitar retornar à tela anterior pelo botão de voltar.
- Persistir somente o subconjunto necessário do perfil e validar sua estrutura ao restaurar a sessão.

Referências oficiais: [autenticação com Expo Router](https://docs.expo.dev/router/advanced/authentication/), [rotas protegidas](https://docs.expo.dev/router/advanced/protected/) e [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).

### MOB-03 — Corrigir o download autenticado de exames

**Evidências**

- A gestante e o médico abrem `/api/documents/:id/download` com `WebBrowser.openBrowserAsync` em `(tabs)/exames.tsx:199-203` e `doctor/[patientId]/historico_exames.tsx:136-140`.
- A API protege esse endpoint com `authenticateToken` (`apps/api/routes/documents.js:59-60`).
- O token só é anexado por `fetchWithAuth`; abrir uma URL no navegador externo não envia esse header Bearer.

**Ajuste recomendado**

Baixar o documento dentro do cliente autenticado e abrir o arquivo temporário por uma API nativa apropriada, ou criar no backend uma URL assinada, de curta duração e vinculada ao usuário/documento. Evitar token em query string. Cobrir o fluxo com teste integrado de gestante e médico.

### MOB-04 — Isolar e hidratar corretamente os dados locais

**Evidências**

- DUM, checklist e água usam chaves globais: `@myFetus:lastPeriod`, `@myFetus:checklistState` e `@myFetus:waterHistory`.
- Trocar de conta no mesmo aparelho reaproveita esses valores.
- A tela de água carrega `waterHistory`, mas não inicializa `waterAmount` com o registro de hoje (`(tabs)/water-tracking.tsx:38-46`). Ao adicionar água, usa o estado iniciado em zero e pode substituir o total já salvo (`:56-73`).
- A data do dia é obtida com UTC (`toISOString().split('T')[0]`), podendo mudar o dia local perto da meia-noite.

**Ajuste recomendado**

- Introduzir um repositório de storage com chaves versionadas e escopo, por exemplo `myfetus:v1:user:{userId}:water`.
- Hidratar o total atual a partir da entrada do dia antes de habilitar os botões.
- Calcular a chave diária no calendário/localidade do usuário, sem conversão acidental para UTC.
- Definir política explícita de limpeza no logout e de migração das chaves antigas.
- Considerar sincronização com a API se esses dados precisarem acompanhar a usuária em mais de um aparelho.

### MOB-05 — Ter uma única fonte para regras clínicas

**Evidências**

- Faixas de pressão, glicemia, BCF, temperatura, IMC, ganho de peso e risco por idade estão declaradas diretamente em telas.
- `classificarPA` aparece em `informacoes_paciente.tsx` e `resumo.tsx`.
- O risco etário é recalculado no dashboard e no resumo.
- A altura uterina possui uma classificação simples na tela e outra baseada em semana em `growthChartData.ts`.

**Risco**

Uma correção pode ser feita em uma tela e esquecida em outra. Para regras clínicas, isso também prejudica rastreabilidade, versionamento e revisão por especialista.

**Ajuste recomendado**

- Tornar a API a fonte canônica quando a classificação afeta alertas ou decisão clínica.
- Extrair cálculos que precisam existir no cliente para módulos puros, versionados e testados, como `features/clinical-rules/domain`.
- Fazer a UI consumir um resultado semântico (`normal`, `warning`, `critical`) e mapear esse resultado para texto/cor.
- Registrar fonte, versão e casos de fronteira de cada regra; validar o conteúdo com profissional responsável.

### MOB-06 — Unificar datas e cálculo gestacional

**Evidências**

- Existem duas implementações de `calculateGestationWeek`: `utils/gestationUtils.ts` e `app/utils/gestationWeekCalculator.ts`.
- Ambas usam `Math.abs`, fazendo uma DUM futura parecer uma gestação passada válida.
- `calculateGestationWeek` chama `toISOString()` em uma data possivelmente inválida antes de validar (`gestationUtils.ts:38-46`).
- A tela `welcome.tsx` valida apenas o tamanho do texto; datas como `31/02/2026` passam pela máscara.
- Há mistura de parsing local, UTC e strings `YYYY-MM-DD` em idade, DUM, DPP e histórico.

**Ajuste recomendado**

- Criar um único módulo `domain/date` com parse estrito de data civil, formatação e cálculo gestacional.
- Rejeitar datas inválidas, futuras e intervalos fora das regras definidas pelo produto.
- Evitar usar `Date`/UTC para representar uma data civil sem horário; serializar de forma canônica e testar fusos e virada de dia.
- Testar anos bissextos, limites de trimestre, DUM futura, semana 0, semanas 40–42 e horário próximo da meia-noite.

### MOB-07 — Tipar contratos e fortalecer o cliente HTTP

**Evidências**

- Cerca de vinte telas chamam endpoints diretamente e fazem `response.json()` sem validar o formato.
- Tipos como `StoredUser` e `PregnantDocument` são redefinidos em telas diferentes.
- `fetchWithAuth` somente acrescenta o token; não trata timeout, `401`, resposta não JSON ou erro padronizado.
- Os 14 usos de `useLocalSearchParams` do prontuário não informam o tipo esperado de `patientId`.
- Há 13 usos de `any`, inclusive em upload, mapas de ícones e casts de rotas.

**Ajuste recomendado**

- Criar módulos de serviço por domínio (`authApi`, `pregnancyApi`, `documentsApi`, `doctorApi`).
- Definir schemas de runtime para entrada/saída e derivar os tipos TypeScript deles. Zod ou Valibot são opções; a escolha deve ser única no projeto.
- Padronizar `ApiError`, parsing seguro, timeout com `AbortController` e reação a `401/403`.
- Usar parâmetros tipados, por exemplo `useLocalSearchParams<{ patientId: string }>()`, e corrigir as rotas que hoje precisam de `as any` apesar de `typedRoutes` estar ativo.
- Avaliar TanStack Query para cache, invalidação e estados remotos quando a camada HTTP já estiver organizada. Não é necessário introduzi-lo antes de definir os contratos.

### MOB-08 — Fazer typecheck e testes realmente bloquearem regressões

**Evidências**

- `strict: true` está ativo, mas não existe script `typecheck`.
- O typecheck atual falha nos imports de Node dos dois testes.
- `package.json` não possui script `test` nem executor/configuração de testes.
- A CI mobile executa apenas `npm run lint` (`.github/workflows/ci.yml:13-27`).
- Os dois testes atuais cobrem somente funções de gráfico; não há testes de sessão, formulários, datas, storage ou cliente HTTP.

**Ajuste recomendado**

- Padronizar os testes do app com `jest-expo` e React Native Testing Library, ou configurar explicitamente um runner separado para utilitários Node. Evitar manter arquivos que parecem testes mas não são executados.
- Adicionar scripts `typecheck`, `test` e `test:ci`.
- Executar na CI: lint, typecheck, testes unitários e um bundle/export de smoke test.
- Priorizar testes com valor: restauração/logout de sessão, cálculo gestacional, isolamento do storage, upload/download, erros `401`, validação dos formulários e regras clínicas.
- Adicionar poucos testes E2E para login por papel e jornadas críticas; a documentação do Expo recomenda E2E para fluxos de UI em vez de depender de snapshots.

Referências oficiais: [TypeScript no Expo](https://docs.expo.dev/guides/typescript/) e [testes com Jest no Expo](https://docs.expo.dev/develop/unit-testing/).

### MOB-09 — Organizar por domínio e manter rotas finas

**Evidências**

- 18 telas têm ao menos 250 linhas; `resumo.tsx` tem 592.
- Cada tela do prontuário repete o ciclo buscar → preencher muitos `useState` → salvar → navegar.
- Componentes pequenos, tipos, regras e estilos ficam dentro do arquivo de rota.
- Existem `utils` na raiz e em `app/utils`, sem uma fronteira clara.

**Estrutura sugerida**

```text
apps/mobile/
  app/                         # somente rotas e layouts finos
    (public)/
    (patient)/
    (doctor)/
  src/
    core/
      api/
      auth/
      storage/
      navigation/
      errors/
    design-system/
      components/
      tokens/
    features/
      pregnancy/
        api/
        domain/
        hooks/
        screens/
      clinical-record/
      documents/
      hydration/
      checklist/
      assistant/
    shared/
      date/
      validation/
      types/
```

Cada arquivo em `app/` deve declarar a rota e renderizar uma tela de `src/features`. A migração deve ocorrer quando um fluxo for alterado, sem mover todo o projeto de uma vez.

### MOB-10 — Padronizar formulários e componentes

**Evidências**

- Há pelo menos cinco implementações locais de toggle.
- Máscara/conversão de data aparece em cadastro, cadastro médico, identificação e vacinas.
- Telas de anamnese mantêm dezenas de `useState` individuais.
- `parseInputFloat` e `parseInputInt` transformam vazio em zero e podem retornar `NaN` para conteúdo inválido.
- Algumas telas salvam dois recursos em sequência. Se a segunda requisição falhar, o formulário fica parcialmente persistido (`informacoes_iniciais.tsx:114-149`).

**Ajuste recomendado**

- Criar componentes comuns: `FormField`, `DateField`, `BooleanField`, `NumberField`, `SubmitButton`, `ScreenState`.
- Adotar um único mecanismo de formulário e schema para valores, mensagens e payloads. React Hook Form com o mesmo schema usado na validação é uma opção adequada.
- Representar campo vazio como ausência, sem convertê-lo silenciosamente em `0`.
- Mover atualizações que precisam ser atômicas para um caso de uso único na API, ou mostrar claramente o estado parcial e permitir repetição segura.

### MOB-11 — Tratar acessibilidade e safe area como requisitos

**Evidências**

- Não foram encontradas propriedades `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` ou `accessibilityState`.
- Existem muitos botões apenas com ícone, como alertas e ações do dashboard.
- Cores comunicam estados clínicos sem garantia de texto/ícone equivalente em todos os pontos.
- 18 telas importam `SafeAreaView` de `react-native`, componente depreciado na documentação atual.

**Ajuste recomendado**

- Usar `SafeAreaProvider`/`SafeAreaView` de `react-native-safe-area-context`, já instalado.
- Criar primitivas acessíveis de botão, ícone, campo e toggle com papel, rótulo, estado desabilitado/selecionado e área mínima de toque.
- Associar rótulos e mensagens de erro aos campos e anunciar alterações assíncronas importantes.
- Não depender apenas de verde/amarelo/vermelho; incluir texto e ícone.
- Verificar contraste, fonte ampliada, leitor de tela, teclado e foco no web.

Referência oficial: o [React Native marca seu `SafeAreaView` como depreciado](https://reactnative.dev/docs/safeareaview) e indica `react-native-safe-area-context`.

### MOB-12 — Criar tokens de design e regras responsivas

**Evidências**

- Foram encontradas 55 grafias/valores hexadecimais distintos, com variações como `#fff`, `#FFF` e `#FFFFFF`.
- Cores centrais (`#886aea`, `#20B2AA`) e gradientes aparecem em muitas telas.
- Algumas telas calculam fonte e espaçamento multiplicando diretamente a largura/altura.
- O web é limitado a 430 px, mas `ios.supportsTablet` está ativo e o mobile nativo não aplica o mesmo limite.
- Os gráficos usam `Dimensions.get('window')`, que não reage como `useWindowDimensions` a mudanças de área disponível.

**Ajuste recomendado**

- Definir tokens para cor, tipografia, espaço, raio, sombra e estados semânticos.
- Criar um `ScreenContainer` que trate largura máxima, insets e breakpoints.
- Usar escalas tipográficas discretas e respeitar tamanho de fonte do sistema, em vez de derivar fonte continuamente da largura.
- Migrar gráficos para dimensões do contêiner ou `useWindowDimensions`.
- Validar explicitamente telefone pequeno, telefone grande, tablet e web.

### MOB-13 — Limpar navegação, nomenclatura e fluxos incompletos

**Evidências**

- Há duas rotas de água: `app/water-tracking.tsx` e `app/(tabs)/water-tracking.tsx`, com implementações e unidades diferentes.
- `outra-gestacao.tsx` coleta a resposta, mas `handleSubmit` apenas navega e descarta o valor.
- O filtro do dashboard é renderizado sem `onPress`.
- Há mistura de PascalCase (`Cadastro.tsx`), kebab-case e snake_case nos nomes de rota.
- O código mistura nomes de domínio em português e infraestrutura em inglês sem convenção documentada.
- `gestation-info.tsx` inicia loops de animação sem guardar/parar as animações no cleanup; o parâmetro `delay` é recebido e não usado.

**Ajuste recomendado**

- Remover a rota de água obsoleta depois de confirmar os links e manter uma única unidade interna, preferencialmente mililitros.
- Persistir/processar a resposta de gestação anterior ou remover a pergunta até ela ter efeito.
- Implementar ou retirar controles visuais sem ação.
- Adotar kebab-case para arquivos de rota e um vocabulário consistente por camada.
- Parar animações e tarefas assíncronas ao desmontar; retirar parâmetros e comentários obsoletos.
- Habilitar um formatador único (Prettier ou Biome) integrado ao lint e aplicar a formatação em PR separado para preservar o histórico de revisão.

### MOB-14 — Padronizar logs e tratamento de falhas

**Evidências**

- O login registra toda a resposta, que pode incluir token e dados do usuário.
- DUM e detalhes de cálculo gestacional são registrados em várias telas/utilitário.
- Há 42 chamadas de console e muitos `catch` que mostram apenas um alerta genérico.
- Os efeitos de busca normalmente não cancelam a requisição ao desmontar ou trocar o paciente.
- Não há error boundary ou serviço de observabilidade no mobile.

**Ajuste recomendado**

- Remover logs de autenticação e dados pessoais. Criar logger que seja silencioso ou sanitizado em produção.
- Separar mensagens para o usuário de detalhes técnicos capturados para diagnóstico.
- Cancelar requests com `AbortController` e impedir atualização de estado após unmount.
- Adicionar error boundary raiz e por fluxos sensíveis, com uma tela de recuperação.
- Se o produto for operado fora de ambiente acadêmico, integrar crash reporting com política de privacidade e remoção de PII.

### MOB-15 — Preparar assets e listas para crescer

**Evidências**

- As imagens semanais ocupam aproximadamente 7 MB e o mesmo mapa está duplicado em duas telas.
- O chat e o histórico de água usam `ScrollView` com `.map`, crescendo sem virtualização.
- O chat mantém todo o histórico somente no estado da tela e gera IDs com `Date.now()`.

**Ajuste recomendado**

- Centralizar o catálogo de imagens e avaliar compressão/formato sem perda visual relevante.
- Usar `FlatList` para coleções potencialmente longas, com chaves estáveis e paginação quando houver backend.
- Definir ciclo de vida do histórico do chat: sessão atual, persistência local ou histórico no servidor.

## 6. Decisões de produto/segurança que precisam ficar explícitas

- O cadastro de médico é oferecido na tela pública de login e a API confirma que, por enquanto, não há aprovação de admin. Essa decisão deve ser documentada e reavaliada antes de uso real.
- O aplicativo possui suporte web e tablet, mas a interface foi desenhada principalmente como uma coluna de telefone. Deve-se decidir quais plataformas são oficialmente suportadas e testadas.
- Dados de água e checklist hoje são locais. Deve-se definir se são apenas conveniência do aparelho ou parte do histórico da paciente.
- Regras e alertas clínicos precisam de responsável, fonte e processo formal de atualização.

## 7. Plano de execução recomendado

### Fase 1 — Estabilidade e segurança

1. Atualizar e alinhar o SDK e zerar as falhas do Expo Doctor.
2. Criar `SessionProvider`, SecureStore, logout e rotas protegidas por papel.
3. Corrigir download autenticado.
4. Isolar storage por usuário e corrigir a hidratação da água.
5. Remover logs de token/DUM.
6. Adicionar `typecheck` e testes à CI.

### Fase 2 — Contratos e domínio

1. Criar cliente HTTP comum e schemas de resposta.
2. Unificar datas e cálculo gestacional.
3. Consolidar regras clínicas em módulos testáveis ou respostas da API.
4. Padronizar formulários, campos e erros.
5. Resolver salvamentos parciais do prontuário.

### Fase 3 — Estrutura e experiência

1. Migrar uma feature por vez para `src/features` e deixar as rotas finas.
2. Criar design tokens e componentes base acessíveis.
3. Substituir `SafeAreaView` depreciado.
4. Limpar rotas duplicadas, telas sem efeito e convenções de nomes.
5. Validar telefone, tablet, web, fonte ampliada e leitor de tela.

### Fase 4 — Qualidade contínua

1. Adicionar testes de integração e E2E dos fluxos críticos.
2. Adicionar bundle de smoke test na CI.
3. Medir tamanho do bundle, tempo de abertura e falhas em produção.
4. Automatizar Expo Doctor e auditoria de dependências com revisão de falso positivo/alcance.

## 8. Definition of Done sugerida para mudanças mobile

Uma mudança de mobile deve ser considerada pronta quando:

- lint, typecheck e testes passam localmente e na CI;
- não introduz `any` ou cast de rota sem justificativa;
- estados de carregamento, vazio, erro, sucesso e repetição foram tratados;
- campos têm validação, mensagem e semântica de acessibilidade;
- chamadas autenticadas usam a camada HTTP comum;
- dados locais possuem versão e escopo de usuário quando necessário;
- regras clínicas alteradas possuem teste de fronteira e referência aprovada;
- a tela foi verificada em Android e, conforme o suporte oficial, iOS/web/tablet;
- não há logs com token, dados pessoais ou clínicos;
- documentação e contratos foram atualizados quando o comportamento público mudou.

## 9. Ordem prática para iniciar a refatoração

O primeiro recorte recomendado é o fluxo de autenticação. Ele cria as abstrações de sessão, storage seguro, cliente HTTP, tratamento de `401` e grupos protegidos que todas as demais features usarão.

O segundo recorte é hidratação/checklist, por ser pequeno e revelar como estruturar uma feature completa com domínio, storage, hooks, componentes e testes.

O terceiro recorte é o prontuário médico, começando por `informacoes_iniciais`. Essa tela expõe os problemas centrais de formulário, contratos, regras clínicas e salvamento em múltiplos recursos, servindo como modelo para migrar as demais telas.

## 10. Registro do primeiro incremento

O primeiro incremento trata a fundação técnica e os defeitos críticos que poderiam ser corrigidos sem reestruturar todas as features.

| Achado | Implementado neste incremento | Trabalho restante |
|---|---|---|
| MOB-01 | Migração para Expo SDK 57, alinhamento das dependências, remoção de pacotes diretos redundantes e correção do schema de `app.json` | Acompanhar e atualizar as dependências transitivas quando o ecossistema Expo publicar versões compatíveis |
| MOB-02 | `SessionProvider`, token em SecureStore no Android/iOS, migração do storage antigo, logout, restauração da sessão e rotas protegidas por papel | Testes integrados de navegação e expiração em aparelho |
| MOB-03 | Download autenticado no web e em Android/iOS, seguido da abertura/compartilhamento pelo sistema | Teste integrado com arquivos reais, nomes extensos e tipos MIME diferentes |
| MOB-04 | Chaves locais versionadas por usuário, migração preguiçosa das chaves antigas e restauração correta da água do dia usando calendário local | Definir se checklist e hidratação devem sincronizar entre aparelhos |
| MOB-06 | Parser único de data civil, rejeição de data inválida/futura, cálculo estável de DUM/DPP e remoção da implementação duplicada | Levar a mesma abstração às demais datas dos formulários |
| MOB-07 | Contrato mínimo da sessão, parâmetro tipado no histórico de exames e tratamento central de `401` | Modularizar os demais endpoints e validar todos os contratos em runtime |
| MOB-08 | Scripts de lint, typecheck e testes; suíte ampliada; CI com as três verificações e export de Android/iOS/web | Adicionar testes de componentes e E2E das jornadas críticas |
| MOB-14 | Remoção dos logs de autenticação e cálculo gestacional alterados neste recorte | Substituir os logs restantes por uma camada de observabilidade sanitizada |

### Testes adicionados

- datas gestacionais: parsing, data futura, data inexistente, DPP e virada do dia local;
- sessão: validação do perfil e classificação de papéis;
- hidratação: restauração do dia, preservação do histórico e storage inválido;
- as verificações existentes dos gráficos continuam na mesma suíte.

Os achados MOB-05 e MOB-09 a MOB-15 continuam registrados na issue para execução incremental. Misturar a reorganização completa de telas, design system, formulários e acessibilidade nesta entrega aumentaria o risco de regressão e tornaria a revisão menos auditável.
