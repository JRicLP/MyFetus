# Inicialização e Configuração do PostgreSQL

Este documento descreve os passos para instalar, configurar e conectar o banco
de dados PostgreSQL ao projeto **MyFetus** utilizando o **pgAdmin 4**.

## 1. Instalador do PostgreSQL

- **Windows**: [Download do PostgreSQL](https://www.postgresql.org/download/windows/)  
  Siga o instalador e adicione o **pgAdmin 4**.
- **Linux**: Utilize o package manager da sua distribuição, por exemplo:
  ```bash
  sudo apt install postgresql postgresql-contrib
  ```

````

## 2. Configuração de um novo servidor no pgAdmin 4

1. Abra o **pgAdmin 4**.
2. Clique em **Add New Server**.
3. Na aba **General**:
   * **Name**: Nome do servidor (ex: `myServer`).
4. Na aba **Connection**:
   * **Host name/address**: `localhost`
   * **Password**: `<sua senha>`
   * Marque **Save Password** se desejar.

> ⚠️ Certifique-se de que o PostgreSQL esteja em execução antes de prosseguir.

## 3. Arquivo `.env` no projeto

No diretório raiz do projeto (`myFetus`), crie um arquivo chamado `.env` com
as seguintes variáveis de ambiente, substituindo pelos seus dados:

```env
PG_USER=myuser
PG_HOST=localhost
PG_DATABASE=mydatabase
PG_PASSWORD=mypassword
PG_PORT=5432
```

**Descrição das variáveis:**

* `PG_USER`     : Usuário do banco de dados.
* `PG_HOST`     : Endereço do servidor PostgreSQL (localhost ou container).
* `PG_DATABASE` : Nome do banco de dados.
* `PG_PASSWORD` : Senha do usuário.
* `PG_PORT`     : Porta de conexão (padrão: 5432).

## Observações

* O projeto utiliza essas variáveis para conectar ao banco via módulo `backend.js`.
* Certifique-se de manter o arquivo `.env` seguro e **não** compartilhá-lo em repositórios públicos.
* Após criar o banco e configurar o `.env`, a conexão pode ser testada executando o projeto.
````
