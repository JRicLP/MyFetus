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

* **Framework:** React Native (via Expo SDK 53)
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

---

## ⚙️ Como Rodar

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
O aplicativo está configurado para se comunicar com o Backend via `localhost:3000`.
* **Recomendado:** Rodar em **Emulador Android/iOS** ou **Navegador Web** no mesmo computador onde o Docker está rodando.
* **Dispositivos Físicos:** Para rodar no smartphone (via Wi-Fi), é necessário alterar manualmente as chamadas de API no código (`fetch`) para o IP da sua máquina local.

