# ADR 0005 — Frontend servido por nginx com o build de produção no compose

| Campo | Valor |
|---|---|
| Status | aceito |
| Data | 2026-10-08 |
| Decisores | @travensolli (SM, responsável pela #80) |
| Rastreabilidade | issue #80 (decisão e implementação), história #46, tarefa #26 · substitui em parte o [ADR 0003](0003-docker-compose-unico-caminho.md) (execução do frontend) · requisitos RP04, RNF05 · critérios DW07, DW01, TP02 |

## Contexto e problema

O [ADR 0003](0003-docker-compose-unico-caminho.md) fixou o `compose.yaml` como único caminho de execução e descreveu o frontend rodando `npm run dev` dentro do container, com o código-fonte montado por bind mount, como perfil padrão. A tarefa #26 pede outra coisa para o mesmo container: "servir o frontend React com performance e segurança", com imagem leve e `.dockerignore`.

Ao implementar a #80 as duas descrições não cabiam juntas. O avaliador roda `docker compose up --build` e recebe o que o perfil padrão serve. Com o servidor de desenvolvimento do Vite ele receberia módulos sem minificação, o `node_modules` inteiro dentro do container e nenhuma checagem de tipos, porque `vite` (dev) não roda o `tsc`. Este ADR registra qual dos dois modos vale para o container do frontend.

## Fatores de decisão

- DW07 e RP04: o avaliador sobe tudo com um comando e vê a versão entregue.
- TP02: um erro de TypeScript precisa aparecer no caminho do avaliador, não só na máquina de quem desenvolve.
- #26: imagem leve, sem arquivos desnecessários, com atenção à segurança.
- O time trabalha em Windows com Docker Desktop e WSL 2, com o repositório no disco do Windows. Nesse cenário as mudanças em arquivos montados por bind mount não geram eventos de arquivo dentro do container, e a recarga do Vite precisaria de polling.
- Quem desenvolve o frontend precisa de recarga rápida.

## Opções consideradas

1. Servidor de desenvolvimento do Vite no container, com bind mount do código (o que o ADR 0003 descreve).
2. **Build de produção servido por nginx**, em Dockerfile multi-stage; a recarga automática fica com `npm run dev` fora do container.
3. As duas no mesmo Dockerfile, por target: nginx como padrão do compose e o servidor de desenvolvimento num profile (`docker compose --profile dev up`).

## Decisão

Escolhemos a **opção 2**, porque (a) o avaliador recebe o mesmo artefato que seria publicado, (b) o build da imagem roda `npm run build` (`tsc --noEmit && vite build`), então erro de tipo impede a subida, (c) a imagem final leva só os arquivos estáticos e roda sem root e (d) não depende de eventos de arquivo em bind mount no Windows.

A opção 3 ficou de fora por enquanto: dobra o que documentar e revisar sem que o time tenha pedido recarga dentro do container. Ela pode ser reavaliada se a recarga fora do container não bastar.

Do ADR 0003 continua valendo: um único `compose.yaml` na raiz, `.env.example` versionado e `.env` local, os serviços `postgres` (volume nomeado e healthcheck) e `backend`, e o frontend na porta 5173 do host. Muda apenas o modo de execução do frontend no container.

Como se materializa no repositório (#80):

- `frontend/Dockerfile`: estágio `build` com `node:24-alpine` (`npm ci` e `npm run build`) e estágio `runtime` com `nginxinc/nginx-unprivileged:1.30-alpine`, que copia só o `dist/` e escuta na porta 8080.
- `frontend/nginx.conf`: fallback da SPA (`try_files $uri $uri/ /index.html`), cache de um ano em `/assets/`, `index.html` sem cache, gzip e os cabeçalhos `X-Content-Type-Options`, `X-Frame-Options` e `Referrer-Policy`.
- `frontend/.dockerignore`: `node_modules/`, `dist/`, `.env*` e `mock/` ficam fora do contexto de build.
- `compose.yaml`: serviço `frontend` com `ports: "5173:8080"`, `VITE_API_URL` como argumento de build lido do `.env` e healthcheck com `wget`.
- `.env.example` e `frontend/README.md` § Execução em container: `VITE_API_URL` é a URL vista pelo navegador e é embutida no bundle no build.

## Consequências

**Positivas**
- `docker compose up --build` falha se o frontend tiver erro de TypeScript.
- Imagem final de 90 MB (`docker image ls`, 08/10/2026), sem `node_modules`; o processo roda como `nginx` (uid 101).
- Rotas do react-router (`/configuracao`) funcionam ao recarregar a página, pelo fallback do nginx.
- O container do frontend não recebe o `.env`: só `VITE_API_URL` entra, como argumento de build. `JWT_SECRET` e `DATABASE_URL` ficam fora dele.

**Negativas / custos**
- Sem recarga automática dentro do container: cada mudança exige `docker compose up --build frontend`. Com as dependências em cache, o rebuild da imagem levou 4 s. Mitigação: `npm run dev` fora do container, atalho opcional que o ADR 0003 já previa.
- `VITE_API_URL` fica fixada no bundle: mudar o valor exige rebuild, e ele precisa ser o endereço visto pelo navegador (`localhost`), não o nome do serviço na rede do compose. Documentado no `.env.example` e no `frontend/README.md`.
- O navegador chama a API em outra origem (`localhost:5173` → `localhost:3000`), então o backend precisa liberar CORS para `http://localhost:5173` quando entrar no compose (#8, #26, #27). Um proxy reverso `/api` no nginx evitaria o CORS, mas o nginx deixaria de iniciar enquanto o serviço `backend` não existir no compose.
- O time passa a manter uma configuração de nginx (`frontend/nginx.conf`, 30 linhas comentadas).

## Prós e contras das opções

### Opção 1 — servidor de desenvolvimento do Vite no container
- Bom: recarga automática sem sair do compose.
- Ruim: o avaliador recebe um servidor de desenvolvimento, sem `tsc` e com `node_modules` na imagem; no Windows, a recarga por bind mount exige polling.

### Opção 3 — nginx por padrão e servidor de desenvolvimento por profile
- Bom: atende os dois usos no mesmo Dockerfile e no mesmo `compose.yaml`.
- Ruim: dois modos para documentar, revisar e manter funcionando; o problema do bind mount no Windows continua no modo dev.

## Como verificar que está em vigor

Na raiz do repositório:

```bash
cp .env.example .env
docker compose up --build -d frontend
docker compose ps
```

Resultado esperado: o serviço `frontend` aparece como `healthy`.

```bash
curl -I http://localhost:5173/configuracao
docker compose exec frontend id
```

Resultado esperado: `HTTP/1.1 200 OK` (fallback da SPA) e `uid=101(nginx)`.

## Links

- Issue: #80 (este ADR e a implementação) · #46 (história) · #26 (Dockerfiles)
- ADRs: [0003](0003-docker-compose-unico-caminho.md) (substituído em parte) · [0004](0004-vite-tailwind-frontend.md) (Vite gera o `dist/` servido aqui)
- Requisito: [RP04](../requisitos.md) · Critério DW07 no [plano de entregas](../plano-de-entregas.md)
- Módulo: [`frontend/README.md`](../../frontend/README.md#execução-em-container)
- Referências externas: https://vite.dev/guide/static-deploy · https://vite.dev/guide/env-and-mode · https://hub.docker.com/r/nginxinc/nginx-unprivileged
