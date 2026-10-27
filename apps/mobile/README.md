# 🤰 MyFetus - Sistema de Acompanhamento Gestacional

Sistema para acompanhamento de pré-natal, conectando médicos obstetras e gestantes.

---

## 🚀 Visão Geral Técnica

O projeto é um monorepo dividido em dois módulos principais:
* **App (Frontend):** Em React Native.
* **API (Backend):** Servidor Node.js com PostgreSQL rodando em Docker.

> 🔗 **Para detalhes da API e Banco de Dados, veja a [Documentação do Backend](./backend/README.md).**

## 📱 Documentação Front-end

O sistema está sendo desenvolvido para proporcionar uma interface intuitiva e eficiente tanto para médicos quanto para pacientes.

### 🛠 Tecnologias Utilizadas

* **Framework:** React Native (via Expo SDK 56)
* **Roteamento:** Expo Router (navegação baseada em arquivos)
* **Linguagem:** TypeScript / JavaScript
* **Estilização:** StyleSheet (Nativo)
* **Requisições HTTP:** Fetch API (Nativo)
* **Armazenamento Local:** Async Storage (para sessão do médico)
* **Ícones:** Expo Vector Icons (Ionicons)

### 📂 Estrutura de Pastas

A navegação do projeto segue a estrutura de diretórios do **Expo Router**:

```
app/

├── _layout.tsx            # Layout raiz e configuração global
├── index.tsx              # Redirecionamento inicial
├── login.tsx              # Tela de Login (Médico/Paciente)
├── Cadastro.tsx           # Tela de Cadastro de Usuários
│
├── doctor/                # Área restrita do Médico
│   ├── _layout.tsx        # Configuração do Stack Navigator do médico
│   ├── dashboard.tsx      # (Tela 1) Lista de pacientes e busca
│   │
│   └── [patientId]/       # Rota dinâmica (ID da paciente)
│       ├── identificacao.tsx          # (Tela 2) Dados básicos
│       ├── informacoes_iniciais.tsx   # (Tela 3) Altura/Peso/Temp
│       ├── grafico.tsx                # (Tela 4) Gráfico de Peso
│       ├── informacoes_paciente.tsx   # (Tela 5) Glicemia/BCF
│       ├── antecedentes_familiares.tsx# (Tela 6) Histórico familiar
│       ├── gestacao_anterior.tsx      # (Tela 7) Histórico obstétrico
│       ├── antecedentes_clinicos.tsx  # (Tela 8) Histórico clínico
│       ├── gestacao_atual.tsx         # (Tela 9) Riscos atuais
│       ├── vacina.tsx                 # (Tela 10) Controle vacinal
│       ├── historico_ultrassons.tsx   # (Tela 11) Gráfico fetal
│       ├── historico_exames.tsx       # (Tela 12) Lista de exames
│       ├── informacoes_gerais.tsx     # (Tela 13) Obs. finais
│       └── resumo.tsx                 # Dashboard da Paciente (Visão Geral)
```
---

## 📱 Fluxo de Telas e Funcionalidades

### 1. Autenticação
* **Login (`login.tsx`):**
    * Diferencia usuários pela `role` (admin vs user) vinda do Backend.
    * Médicos são redirecionados para `/doctor/dashboard`.
    * Pacientes são redirecionados para `/outra-gestacao`.
    * Salva o nome do médico no `AsyncStorage` para personalização.

### 2. Dashboard do Médico (`doctor/dashboard.tsx`)
* Lista todas as pacientes cadastradas no banco.
* **Cálculo de Risco:** Identifica automaticamente gravidez de risco se a idade for `>= 35` ou `<= 15` anos, exibindo um ícone de alerta vermelho.
* Mostra a semana gestacional atual buscada do banco de dados.

### 3. Prontuário da Paciente (Fluxo Sequencial)
Ao selecionar uma paciente, o médico entra num fluxo de formulários sequenciais. Todos os formulários seguem o padrão **Ler (GET) -> Editar -> Salvar (PUT)**.

* **Identificação (Tela 2):** Edição de nome e visualização da idade calculada automaticamente.
* **Dados Vitais (Tela 3 & 5):**
    * Cálculo automático de **IMC** e **Ganho de Peso**.
    * Classificação automática de risco para Pressão Arterial, Glicemia, Temperatura e Frequência Cardíaca (Cores: Verde/Amarelo/Vermelho).
* **Anamnese (Telas 6, 7, 8, 9):**
    * Questionários com *toggles* (SIM/NÃO) para antecedentes e riscos.
    * Campos condicionais que abrem caixas de texto ou inputs numéricos quando "SIM" é selecionado.
* **Vacinação (Tela 10):** Controle de doses com máscara de data automática (`DD/MM/AAAA`).
* **Exames (Tela 12):** Lista dinâmica de exames com funcionalidade de adicionar novos exames diretamente na tela.

### 4. Resumo da Paciente (`resumo.tsx`)
* Tela final que agrega **todos** os dados coletados nas etapas anteriores.
* Exibe alertas de risco consolidados.
* Mostra o histórico completo de exames e vacinas.

### 5. Sobre o MyFetus (`sobre.tsx`, E7-09)
* Disponível **com e sem login** (aprovado pela gestão): a rota fica fora dos `Stack.Protected` em `app/_layout.tsx`. Acesso pelo link "Sobre o MyFetus" no login, pelo botão "Sobre" na home da gestante e pelo ícone de informação no dashboard do médico.
* **Textos aprovados** (19/10/2026), em `constants/aboutContent.ts`: limitações e avisos, orientação de segurança (192 — SAMU) e "Equipe MyFetus — ciclo 2026.2". Uma lista de sinais de alarme só pode ser publicada após revisão clínica.
* **Versão:** a versão instalada, lida de `Constants.expoConfig` (`utils/appVersion.ts`); com `appVersionSource: "local"` no `eas.json`, coincide com o artefato. O ciclo "2026.2" aparece separado da versão.
* **Ambiente e data do build** (variáveis opcionais do build EAS):
  * `EXPO_PUBLIC_APP_ENVIRONMENT`: qualquer valor diferente de `production` (ou ausente) exibe "Ambiente de testes — uso acadêmico".
  * `EXPO_PUBLIC_BUILD_DATE`: data ISO da compilação (ex.: `2026-10-19`), exibida como "Data da compilação". Sem ela, a data não aparece.
* **Pendências para fechar a issue:** contato oficial do projeto (canal em definição) e os documentos de termos de uso e política de privacidade aprovados na E7-01, com versão e data. Até lá, a tela mostra o aviso "Em definição" (`ABOUT_IS_DRAFT`).
* A tela não exibe nomes de integrantes, instituição, URL da API, IDs de build ou segredos. Os testes em `tests/about.test.ts` verificam isso.

---

## ⚙️ Como Rodar

### Build Android via EAS

Para gerar um APK instalável em aparelhos de teste, use o perfil `preview`:

```bash
npm run build:android:preview
```

O perfil está definido em [`eas.json`](eas.json) e usa distribuição interna
com `buildType: apk`. O perfil `preview` já aponta para a API de homologação
HTTPS do Cloud Run. Para gerar um APK com outra API, substitua
`EXPO_PUBLIC_API_URL` no perfil ou configure a variável no ambiente EAS antes
do build. Um APK instalado sem Expo Go não consegue acessar a API por
`localhost`. Consulte o [guia completo](../../docs/eas-android-build.md) para
configuração, acompanhamento e critérios de aceite.

### Pré-requisitos
* Docker Desktop instalado e rodando.
* Node.js (para rodar o frontend localmente).

### Passo 1: Iniciar o Backend (Docker)
No terminal, na raiz do projeto (`myfetus-app/myFetus`):

```bash
docker-compose up --build
```
Aguarde a mensagem: "✅ Conectado ao PostgreSQL com sucesso!"


Passo 2: Criar Dados de Teste
Para criar uma paciente inicial ("Maria") automaticamente. Em outro terminal (WSL recomendado se estiver no Windows):

```bash
./test_api.sh
```

Passo 3: Iniciar o App (Frontend)
Em um terceiro terminal:

```bash

npm install  # (Apenas na primeira vez)
npm start -- --clear
```
Acesse o projeto através do localhost (web) ou escaneie o QR Code com o Expo Go(para gestantes).
## ⚠️ Observações Importantes

### Ambiente de Execução
Todas as chamadas passam por `utils/api.ts`, que lê `EXPO_PUBLIC_API_URL` e
remove a necessidade de editar telas individualmente:

* **APK EAS `preview`:** usa a API de homologação configurada em `eas.json`.
* **Expo Go/desenvolvimento local:** sem variável, usa o host do Metro na rede
  local e a porta `3000`; no emulador Android usa `10.0.2.2` como fallback.
* **Web:** sem variável, usa `http://localhost:3000`.
* **Outro provedor:** defina `EXPO_PUBLIC_API_URL` com a URL HTTPS do provedor
  e gere um novo build. O código das telas não precisa ser alterado.

Para fixar a API local durante um teste, copie [`.env.example`](.env.example)
para `.env` e preencha `EXPO_PUBLIC_API_URL` com o endereço que o aparelho
consegue alcançar. O backend deve estar disponível na porta `3000`:

```bash
cp .env.example .env
# exemplo para um celular na mesma rede Wi-Fi:
# EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
npm start -- --clear
```

O arquivo `.env` é ignorado pelo Git. Depois de alterar a variável, reinicie o
Metro para que o Expo recompile o bundle.

Nunca coloque tokens ou outras credenciais nessa variável; ela é incorporada ao
bundle do aplicativo e contém somente a URL pública da API.
