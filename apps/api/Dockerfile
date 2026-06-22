# Usa Debian Slim que possui glibc nativo, exigido pelo ONNX Runtime
FROM node:20-slim

WORKDIR /app

# Instalar dependências do sistema usando apt-get (Debian) em vez de apk (Alpine)
RUN apt-get update && apt-get install -y python3 make g++ bash git && rm -rf /var/lib/apt/lists/*

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