# ADR 0009 — Aplicação inteira com login

| Campo | Valor |
|---|---|
| Status | proposto |
| Data | 2026-11-04 |
| Decisores | @DeaTuribio (frontend), @viniciusaugusto1997 (backend), @travensolli (SM, autor da #257), @henriqueptbd-cell (PO) |
| Rastreabilidade | issue #257 · contrato da #176 · requisitos RP06, RNF05 · critério DW06 |

## Contexto e problema

Até a #25 (PR #243), só a Configuração exigia login. O dashboard, Emissões e Comparação eram públicos, e `GET /api/services` e `GET /api/collections` respondiam a qualquer pessoa. A #257 pede que a aplicação inteira fique atrás do login e que o backend recuse as rotas de dados sem token.

Ficaram três perguntas:

1. **Quais rotas continuam públicas?** A #176 já tinha aprovado `GET /api/monitoring-settings` como público, e o #253 o implementou assim.
2. **O que a tela faz sem sessão?** Antes, o dashboard buscava os dados e fazia polling para qualquer visitante.
3. **E o modo demonstração** (frontend sem `VITE_API_URL`), que não tem backend para conferir a senha?

## Fatores de decisão

- **DW06 / RP06:** autenticação JWT no backend, com o middleware que já protege `GET /api/auth/me`.
- **Segurança de verdade no backend:** o guarda de rota do frontend só melhora a navegação; quem protege os dados é o 401 da API.
- **Não quebrar o que já foi aprovado:** o contrato da #176 e o #253.
- **Sem trabalho à toa:** sem sessão, a tela não deve fazer buscas que voltariam 401.
- **Reprodutibilidade (ES08):** o avaliador segue o README com as credenciais do `.env.example`, e o modo demonstração continua servindo para ver a interface sem Docker.

## Opções consideradas

1. **A:** dados de serviços e coletas só com JWT; `GET /api/monitoring-settings` continua público e o `PUT` protegido.
2. **B:** tudo com JWT, inclusive `GET /api/monitoring-settings`.
3. **C:** manter o dashboard público e proteger só a Configuração (situação da #25).

## Decisão

Escolhemos a **opção A**, porque cumpre a #257 sem desfazer o contrato aprovado na #176. O intervalo da tela não é dado de serviço: é o mesmo para todos e não revela nada do monitoramento.

Como se materializa no repositório:

- **Backend:** `authMiddleware` em `/api/services` e `/api/collections` (`backend/src/app.ts`); `/health`, `POST /api/auth/login` e `GET /api/monitoring-settings` ficam públicos. Contrato e erros em [`docs/api.md`](../api.md).
- **Frontend:** em `App.tsx`, o `ProtectedRoute` é a rota-pai de todas as páginas, e `/login` é a única aberta. Sem sessão nenhuma página monta, então não há busca nem polling. O login devolve a pessoa à tela pedida, com a query (`utils/login-redirect.ts`, só caminho interno). Um 401 com sessão aberta encerra a sessão, e o login avisa que ela expirou.
- **Modo demonstração:** dashboard, Emissões e Comparação abrem direto, com dados ilustrativos e a faixa de aviso. Não há backend para conferir uma senha, e os dados não são reais. A Configuração continua exigindo sessão, e o login explica que precisa da API.
- **Backend falso** (`frontend/mock/server.mjs`): as mesmas rotas de dados respondem 401 sem token, para o desenvolvimento seguir o comportamento real.

## Consequências

**Positivas**
- Os dados coletados só saem da API com um token válido, verificável por `curl` (401 sem token).
- Sem sessão, o navegador não faz chamadas nem polling.
- O link de uma tela (ex.: `/emissoes?servico=…&de=…`) continua funcionando: passa pelo login e volta ao mesmo filtro.

**Negativas / custos**
- Os comandos `curl` das rotas de dados na documentação passam a levar `Authorization: Bearer $TOKEN`. Atualizados no `backend/README.md`, no `docs/api.md` e no plano de entregas (DW02, DW03). O [ADR 0006](0006-modelo-potencia-fatores-emissao.md), já aceito, não é editado: o `curl` de `GET /api/services` citado nele precisa do token obtido em `POST /api/auth/login`.
- Os passos de verificação do frontend com o mock ou o backend real começam pelo login.
- A Sprint 3 (ranking, #50) já nasce com JWT no contrato.

## Prós e contras das opções

### A — dados com JWT, `GET /api/monitoring-settings` público
- Bom: segue o contrato da #176 e o #253 sem retrabalho.
- Ruim: uma rota pública a mais para lembrar na documentação.

### B — tudo com JWT
- Bom: regra única, sem exceção.
- Ruim: muda um contrato já aprovado e implementado (#176, #253) às vésperas do congelamento da Sprint 2.

### C — só a Configuração protegida
- Bom: nenhuma mudança.
- Ruim: não atende à #257, e os dados continuam abertos na API.

## Links

- Issue: #257 (votos na alternativa A nos comentários da issue)
- Contrato: #176 · backend #253 (#250)
- Requisitos: [RP06 e RNF05](../requisitos.md)
- Critério no plano: [plano de entregas](../plano-de-entregas.md) (DW06)
