# Frontend do EcoPulse — imagem multi-stage (ADR 0003).
# 1) build: instala as dependências pelo package-lock e gera dist/ (npm run build = tsc --noEmit + vite build)
# 2) runtime: só os arquivos estáticos, servidos por nginx sem root na porta 8080

FROM node:24-alpine AS build
WORKDIR /app

# Dependências primeiro: esta camada só é refeita quando package.json ou package-lock.json mudam
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# VITE_API_URL é embutida no bundle durante o build: o navegador não lê variáveis do container.
# Vazia = modo demonstração. O compose.yaml repassa o valor do .env da raiz.
ARG VITE_API_URL=""
# Intervalo do polling do dashboard (#23), também embutido no build. Vazio = padrão de 30 s.
ARG VITE_REFRESH_INTERVAL_MS=""
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
