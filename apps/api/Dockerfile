# Usa Debian Slim que possui glibc nativo, exigido pelo ONNX Runtime.
FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# As dependencias de compilacao sao necessarias por alguns modulos nativos do backend.
RUN apt-get update && apt-get install -y python3 make g++ bash git && rm -rf /var/lib/apt/lists/*

# O processo nao deve executar como root no ambiente de homologacao/producao.
RUN groupadd --system --gid 10001 app && \
    useradd --system --uid 10001 --gid 10001 --create-home --home-dir /home/app app

# Copiar apenas os arquivos de dependência
COPY package.json package-lock.json ./

# Instalar apenas dependencias de runtime
RUN npm ci --omit=dev

# Copiar o resto do código da aplicação
COPY . .

# O diretorio continua disponivel para o modo local, mas nao recebe permissao global.
RUN mkdir -p /app/uploads/encrypted && \
    chown -R app:app /app

USER app

EXPOSE 3000

# Comando de producao. O Cloud Run injeta PORT e faz o health check HTTP.
CMD ["npm", "start"]
