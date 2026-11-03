# Sprint Review — Sprint N

<!-- Template do agilekit (repo/docs/templates/review.md). Destino: docs/sprints/sprint-N/review.md. O roteiro (seção 2) é preparado pelo SM e pelo PO antes da review (`/sprint N review`); o feedback (seções 3 a 5) é registrado em até 24h depois. O SM é o escriba. Substitua os campos `<...>`. -->

| Campo | Valor |
|---|---|
| Data e horário | `<dd/mm/aaaa>` 19h30 (`<confirmada pelo cliente em dd/mm>`) |
| Local | `<sala / chamada online>` |
| Participantes do time | @henriqueptbd-cell (PO), @travensolli (SM, escriba), @DeaTuribio, @LUCASAMR23, @viniciusaugusto1997 |
| Cliente / avaliadores | `<nome — UniLaunch>`, `<professor(a)>` |
| Versão demonstrada | branch `release/sprint-N`, commit `<sha curto>` → tag [`sprint-N`](https://github.com/DEVassos/greener-app/releases/tag/sprint-N) após o fechamento |
| Ambiente | `docker compose up --build` em `<máquina / clone limpo>` |

## 1. Objetivo da sprint e resultado

`<objetivo da sprint>` — resultado: `<atingido / parcialmente atingido / não atingido>`. A situação de cada critério fica **só** no [plano de entregas](../../plano-de-entregas.md#sprint-n); esta ata aponta para ele em vez de repetir números ou status.

## 2. Roteiro da demonstração (por requisito)

| Ordem | Requisito | O que será mostrado | Como (URL, comando, consulta) | Quem demonstra | Tempo |
|---|---|---|---|---|---|
| 1 | RF01 | Serviços descobertos no agregador | `GET http://localhost:3000/services` | @LUCASAMR23 | 5 min |
| 2 | RF10 | Histórico de coletas persistido | `SELECT ... FROM collections` após reinício dos containers | @viniciusaugusto1997 | 5 min |
| 3 | RF09, RF12 | Tela de serviços com estado e localização atualizando sozinha | `http://localhost:5173` | @DeaTuribio | 5 min |
| 4 | — | Backlog, plano de entregas e próximos passos | Issues, `docs/plano-de-entregas.md` | @henriqueptbd-cell | 5 min |
| 5 | — | Processo: quadro, atas, DoD aplicada | Project, `docs/sprints/` | @travensolli | 3 min |

Regra: cada integrante demonstra ≥1 item.

## 3. Feedback do cliente (item a item)

| Item demonstrado | Comentário do cliente (literal quando possível) | Classificação | Ação |
|---|---|---|---|
| RF01 | `<comentário>` | aceito / ajustar / nova necessidade | `<nenhuma / issue #n>` |

## 4. Decisões e alterações no backlog

| Decisão | Issue criada ou alterada | Label | Milestone |
|---|---|---|---|
| `<ex.: mostrar unidade de energia em kWh no card>` | #`<n>` | `feedback-cliente`, `RF09` | Sprint N+1 |
| `<ex.: RF13 permanece could>` | #`<n>` | — | — |

Registrado no "Histórico de alterações do plano" em `<dd/mm/aaaa>` (PR #`<pr>`).

## 5. Pendências e perguntas em aberto

| Pendência | Quem | Prazo |
|---|---|---|
| `<ex.: confirmar data da próxima review>` | @henriqueptbd-cell | `<dd/mm>` |
| `<ex.: limites de requisição das APIs auxiliares>` | @LUCASAMR23 | `<dd/mm>` |

## 6. Encaminhamentos pós-review (≤24h)

- [ ] Seção Review de `docs/sprints/sprint-N.md` preenchida (@travensolli)
- [ ] Issues `feedback-cliente` criadas na milestone Sprint N+1 (@henriqueptbd-cell)
- [ ] Plano de entregas: Situação verificada e histórico atualizado (@henriqueptbd-cell)
- [ ] Merge de `release/sprint-N` em `main`, tag `sprint-N` e GitHub Release (@travensolli)
