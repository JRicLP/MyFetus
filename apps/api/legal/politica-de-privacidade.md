# Política de Privacidade do MyFetus

**Versão 0.1-rascunho — 19/10/2026.** RASCUNHO para revisão da gestão do projeto e orientação jurídica. Não é a versão definitiva.

## 1. Sobre o MyFetus

O MyFetus é um projeto acadêmico de apoio ao acompanhamento materno-fetal, em desenvolvimento e avaliação pela Equipe MyFetus — ciclo 2026.2. Nesta etapa, destina-se a testes com dados fictícios: não insira dados reais de pacientes. O aplicativo não substitui consultas, o acompanhamento pré-natal ou a avaliação de profissionais de saúde.

## 2. Quais dados tratamos

- **Dados de cadastro:** nome, e-mail, data de nascimento e senha (guardada apenas como hash). Para médicos, também CRM, UF do CRM, especialidade e telefone, quando informados.
- **Dados de saúde da gestante:** informações de acompanhamento pré-natal registradas pela gestante ou pelo médico vinculado, como dados da gestação, sinais clínicos, medidas, eventos e documentos de exames enviados.
- **Registros técnicos:** registros de acesso e de operações (trilha de auditoria) e, nos aceites e consentimentos, a versão do documento, a data, o endereço IP e o navegador/aplicativo utilizado.

## 3. Para que usamos os dados

- Permitir o cadastro, o login e o uso do aplicativo.
- Permitir que a gestante acompanhe a própria gestação e que o médico vinculado a ela acompanhe o prontuário.
- Gerar cálculos, curvas e alertas de apoio, que sempre dependem de avaliação profissional.
- Responder perguntas com inteligência artificial, apenas para quem autorizar esse uso.
- Registrar aceites, consentimentos e operações, para segurança e para comprovar o cumprimento da LGPD.
- Avaliar a usabilidade do aplicativo e participar de pesquisa, apenas para quem autorizar.

## 4. Quem pode acessar

- A gestante acessa os próprios dados.
- O médico acessa apenas os dados das gestantes com vínculo ativo com ele.
- Administradores do projeto acessam o necessário para operar e auditar o sistema.

## 5. Serviços externos envolvidos

- **Google Cloud:** hospedagem da API e do banco de dados no ambiente de homologação.
- **Google Gemini:** geração de respostas de inteligência artificial. Recebe a pergunta e, quando aplicável, informações clínicas da gestante, apenas para quem autorizar o uso de IA.
- **Pinecone:** busca nas diretrizes clínicas oficiais (Ministério da Saúde e FEBRASGO). Armazena trechos dessas diretrizes, não dados de pacientes.
- **Expo (EAS):** compilação e distribuição do aplicativo.

O cálculo de similaridade de textos (embeddings) é feito no próprio servidor do projeto, sem envio a terceiros.

## 6. Como protegemos os dados

Dados sensíveis são criptografados em repouso, o acesso é restrito por perfil e por vínculo médico-gestante, as comunicações usam HTTPS em homologação e as operações ficam registradas em trilha de auditoria. Perguntas enviadas ao chat de IA passam por remoção de dados pessoais identificáveis antes do envio.

## 7. Por quanto tempo guardamos

- Dados de cadastro e de saúde: enquanto a conta existir ou até a solicitação de exclusão. **Prazo a definir.**
- Registros de aceite e consentimento (inclusive o IP): protegidos contra alteração durante o período de retenção e eliminados ou anonimizados ao final, ressalvadas as hipóteses legais de conservação. **Prazo a definir com revisão institucional.**

## 8. Seus direitos

Você pode confirmar se tratamos seus dados, acessar, corrigir, solicitar a portabilidade ou a exclusão dos seus dados, revogar consentimentos e saber com quem eles são compartilhados. Revogar um consentimento interrompe o tratamento baseado nele e restringe apenas as funcionalidades que dependem dele.

**Canal para exercer seus direitos: em definição.**

## 9. Alterações desta política

Quando esta política mudar, a nova versão será exibida no aplicativo antes do acesso às funcionalidades que dependem dela.
