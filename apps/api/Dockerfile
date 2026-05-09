FROM node:20-alpine

WORKDIR /app

# Instalar dependências do sistema (se necessário para pacotes nativos)
RUN apk add --no-cache python3 make g++ bash git

# Copiar apenas os arquivos de dependência
COPY package.json yarn.lock* ./

# Instalar dependências
RUN yarn install --network-timeout 100000 || yarn install --no-lockfile

# Copiar o resto do código da aplicação
COPY . .

# Permitir execução
RUN chmod -R 777 /app

EXPOSE 3000

# Comando padrão de inicialização
CMD ["yarn", "dev"]
