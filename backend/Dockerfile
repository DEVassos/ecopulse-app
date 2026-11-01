# Backend do EcoPulse — imagem multi-stage (ADR 0003; Node 24 alinhado ao frontend do ADR 0005).
# 1) build: instala as dependências pelo package-lock e compila o TypeScript (npm run build = tsc)
# 2) runtime: apenas dist/ e dependências de produção, executado pelo usuário node (não-root)

FROM node:24-alpine AS build
WORKDIR /app

# Dependências primeiro: esta camada só é refeita quando package.json ou package-lock.json mudam
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# A imagem final não precisa das dependências de desenvolvimento (typescript, tsx, vitest)
RUN npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node

# PORT é lida de process.env por config/env.ts (padrão 3000)
EXPOSE 3000
CMD ["node", "dist/server.js"]
