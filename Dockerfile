FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y ffmpeg tzdata python3 make g++ && rm -rf /var/lib/apt/lists/*
ENV TZ="America/Sao_Paulo"
EXPOSE 7860
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Compila o TypeScript (se necessário)
RUN npx tsc --noEmit || true

# Comando para iniciar o agente
CMD ["npm", "run", "start"]
