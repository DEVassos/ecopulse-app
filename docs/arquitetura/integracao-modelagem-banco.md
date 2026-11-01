# Integração da modelagem e do banco

> **Registro histórico** da integração da UML com o banco, feito em 08/10/2026 antes do merge do [PR #77](https://github.com/DEVassos/greener-app/pull/77). As menções a "nesta branch", "local" e "futuro" descrevem aquele momento. O estado atual está em [arquitetura](../arquitetura.md), no [README do banco](../../database/README.md) e no [README do backend](../../backend/README.md): repositories, worker, cálculo e compose já estão em `develop`.

Vinicius foi o responsável pela integração da modelagem com o banco; Lucas é o autor da base SQL. A correspondência entre UML e SQL e a aritmética dos exemplos foram verificadas pelo [roteiro reproduzível](verificacao-schema.md), e o PR #77 foi aprovado por @LUCASAMR23 e @henriqueptbd-cell.

## Histórico da branch

A integração foi feita na branch `sql/5-schema-postgres`, preservando os commits originais do DDL (`8cbd819`) e da documentação (`424b21b`), e entrou em `develop` pelo PR #77 em 08/10/2026, às 22h49. O arquivo do modelo é `database/schema.sql`.

## Fontes primárias efetivamente lidas

| Documento original em docs/contexto | Leitura e conclusão |
|---|---|
| `Desafio 2DSM - 2026-2.pdf` (30/06/2026), 5 páginas | Texto integral extraído. RF01–15 (pp. 2–3), RNF01–05 (pp. 3–4), RP01–07 (pp. 4–5). RP06 exige JWT na configuração; não exige dashboard autenticado. |
| `greener-documentacao-do-desafio.pdf`, 8 páginas | Texto integral extraído. Fórmulas em pp. 5–7; CPU 100 W, RAM 0,375 W/GB, disco 0,01 W/GB, rede 0,02 W/GB no exemplo. GB e segundos preservados. |
| `Apresentacao2SemestreAbp.pdf`, 8 páginas | Texto integral extraído. Apresentação de contexto, missão e exemplo; referências a água em pp. 1 e 7 não possuem RF nem fórmula no edital. Não ampliamos o schema para água; confirmar com parceiro se houver nova exigência. |
| `2DSM - Proposta de rubrica de avaliação das sprints - aluno-1.docx` | Parágrafos e células das tabelas extraídos do XML original, não de resumo. BD01 exige UML/DDL coerentes e execução limpa; TP01 exige classes usadas, não somente desenhadas; sprints são distribuídas pelo time e avaliação cumulativa. |

Os PDFs possuem texto extraível, sem necessidade de OCR. Não certificamos detalhes de imagens internas não inspecionadas; diagramas de arquitetura ilustrativos não substituem requisitos textuais. A fórmula da nota no DOCX inclui elementos gráficos: as regras textuais e tabelas foram lidas, sem reconstruir fórmulas não extraídas.

O exemplo oficial arredonda 60/3600 h para 0,0167 h. Usar divisão exata evita erro intermediário; ver [cálculos](../calculos.md). Não foram encontrados requisitos obrigatórios que exijam autenticação global, quatro perfis ou auditoria genérica.

Outras fontes: requisitos/rubrica locais, regras de banco, ADR 0002, issues #5/#28/#44/#18/#20/#48/#6/#24, plano de entregas e guia vigente no GitHub. Uma versão mais longa da UML (v2) foi consultada fora do repositório; a versão versionada é a de [`modelagem-uml.md`](modelagem-uml.md).

## Matriz requisito → modelo → sprint

| Requisito / critério | Consequência na UML e SQL | Sprint no plano vigente |
|---|---|---|
| RF01/RF03/RF04, BD01/BD02 | ID externo único, cadastro, nova linha de coleta, GB e intervalo; DML futura parametrizada nos repositories. | 1 |
| RF10, BD03 | FK RESTRICT, timestamps e índices; preservação entre reinícios exige volume/integração ainda ausentes. | 1 |
| RF02/RF05/RF06, RNF04 | Estados de métricas separados do cálculo, erro explícito, descoberta falha não remove todos. | 2; tratamento básico de integrações em 1 |
| RF07/RF08/RF09, TP01 | Intervalo, região histórica, intensidade e resultados; fórmulas e modelo OO conceitual. | 2; RF09 parcial em 1 |
| RF11, RNF02 | Data da coleta disponível; intervalo do dashboard é configuração futura, não presumido igual ao intervalo externo. | 2 |
| RF12/RF13 | Localização opcional e código regional; falta de coordenadas não invalida métricas. | RF12 em 1; RF13 opcional em 3 |
| RF14/RF15, BD04/RNF03 | Índices por serviço/período; snapshot regional e dados para agregação; consultas futuras com período explícito. | 3 |
| RP06/DW06 | users com email/bcrypt; dashboard público; JWT no backend da configuração e da futura consulta de entradas. | 2 |
| RP01/RP02/RP03/RP04/RNF05 | React/Node TS, pg sem ORM, Docker obrigatório; UML/schema/README sincronizados; nenhum aplicativo desenvolvido aqui. | Base em 1; docs cumulativos |
| RNF01/RP05/RP07, ES01–09 | Escopo simples; sem antecipar funcionalidades, conclusão ou evidências; requisitos e decisões rastreáveis. | Todas; responsividade final em 3 |
| Entrada simples (solicitação de Vinicius) | access_entries: id, IP, instante; consulta autenticada; sem usuário, rota, ação ou polling. | Pendente de formalização |

O planning e a visão antigos ainda antecipam JWT/cálculo/exportação; o plano e milestones atuais os distribuem em S2/S3. Esta integração usa o plano vigente, sem reescrever planejamento, histórico ou o snapshot do backlog. O PO deve sincronizar os documentos antigos.

## Contratos, decisões e pendências

OpenAPI consultados em 08/10/2026: [métricas](https://metrics.unilaunch.org/openapi.json) e [carbono](https://carbon.unilaunch.org/openapi.json). /metrics fornece CPU%, memory_gb, disk_gb, network_gb e collection_interval_seconds. O contrato não explicita GB decimal versus GiB: persistimos o valor rotulado GB sem conversão. /regions retorna objeto com regions e total; documentação local foi alinhada.

Há contradição no próprio OpenAPI entre descrição do endpoint e descrições de 404/500 para ausência de métricas. Confirmação do parceiro permanece pendente; não inferir remoção somente por código HTTP. Falha na API de carbono preserva métricas e usa NULL para intensidade/emissão. Potência/energia independem de carbono e podem ser preservadas juntas, se já calculadas.

Sem necessidade comprovada de percentual renovável para os requisitos deste escopo, não foi criada coluna; não há versionamento de coeficientes. Constantes e fonte estão documentadas. O JSON bruto preserva a resposta de métricas, não é cópia manual do cadastro, fator ou resultados.

Auditoria solicitada por Vinicius e aprovada para modelagem local: primeira abertura por sessão da aba; sem polling, worker ou tentativas de login. A issue, sprint, política de retenção e implantação ainda precisam ser formalizadas. Não foram criadas issues/ADRs de aprovação presumida. A consulta usa as credenciais administrativas existentes, sem RBAC detalhado.

Nome EcoPulse formalizado no [PR #62](https://github.com/DEVassos/greener-app/pull/62#issuecomment-6070817778) e aplicado à documentação e às configurações na [#68](https://github.com/DEVassos/greener-app/issues/68); o repositório continua `greener-app`.

## Inicialização, evolução e compatibilidade

Não há backend, repositories, seed ou compose nesta branch. Busca de dependências encontrou as colunas bytes apenas no DDL original (e na cópia preservada); não há código consumidor a renomear nesta base. Isso não comprova ausência de bancos externos com dados.

Schema atualizado é inicialização de banco vazio e reaplicação do mesmo modelo. Guard interrompe a versão anterior com bytes ou escalas antigas de energia/emissão, sem reinterpretação ou apagamento. Banco legado precisa de migração numerada conforme ADR 0002: confirmar a unidade real, preservar dados/backup, converter com fator comprovado e testar antes de aplicar. Nenhuma conversão presumida foi escrita ou executada. IF NOT EXISTS não migra nem valida integralmente um esquema arbitrário já existente.

SQL e UML sustentam constraints estruturais; não implementam cálculo, autorização, IP confiável, deduplicação ou histórico somente inserção na aplicação. A revisão futura deve considerar o limite de 400 linhas por PR: o diff de sincronização da UML pode exigir divisão por intenção antes da publicação, sem nova exceção presumida.

## Verificações realizadas nesta integração local

Executadas em 08/10/2026, no PostgreSQL 16.15 em container descartável sem rede ou portas publicadas. O container postgres-aula e seus dados não foram utilizados. Ferramentas PDF/Mermaid instaladas apenas no diretório temporário do sistema, sem dependências do projeto.

| Verificação | Resultado observado |
|---|---|
| Schema em PostgreSQL vazio | Quatro tabelas, quatro índices explícitos e cinco automáticos (quatro PKs e UNIQUE de services.external_id), total nove; constraints e comentários criados em transação. |
| Sete cenários válidos | Métricas sem cálculo, cálculo disponível, falha de carbono com/sem potência/energia, zeros conhecidos, erro e ausência de métricas aceitos. |
| 27 cenários inválidos | SQLSTATE esperado para métricas incompletas, intervalo nulo/zero/negativo, faixas/NaN, estados contraditórios, cálculo incompleto, JSON não objeto, FK, exclusão referenciada, ID duplicado, latitude/região inválidas e IP ausente/inválido, mais dois overflows de energia/emissão. |
| Precisão | Energia numeric(20,12) e emissão numeric(24,12) conferidas no catálogo; exemplos oficiais/OpenAPI, 0,00000015 kWh e emissão com fatores 85/0,1 preservados; resolução e máximos verificados. |
| Agregações | 1.000 coletas por fator 85 e 0,1: 0,00015 kWh; emissões 0,01275 g e 0,000015 g. Outras 1.000 coletas oficiais: energia 0,847833333 kWh dentro do limite de quantização documentado. |
| Região histórica | Alterar services.region_code não modificou collections.region_code. |
| IP e horário | IPv4/IPv6 aceitos; entered_at preenchido pelo default do servidor. |
| Reaplicação do mesmo modelo | Sem falha e uma linha de serviço preservada. |
| Banco legado simulado | Revisão anterior conferiu recusa do modelo em bytes preservando 1.000.000.000 bytes. Nesta revisão, banco com energia/emissão numeric(14,6) foi recusado e a definição antiga permaneceu intacta. Não é teste de conversão/migração. |
| Correspondência UML/PostgreSQL | Nomes de todos os campos conferidos: services 14, collections 19, users 5, access_entries 3. Tipos/nulabilidade também documentados para revisão. |
| Mermaid | Cinco blocos renderizados pelo Mermaid CLI/Edge: quatro visões da integração e casos de uso do produto. Dashboard público, JWT administrativo e entrada simples; sem quatro perfis ou auditoria ampla. |
| Links locais | Destinos dos links dos documentos atuais de integração conferidos. |
| Agilekit | check-forbidden.sh e check-docs.sh executados em Git Bash: sem erros ou avisos. Esses scripts usam arquivos rastreados; novos documentos/imagens também foram conferidos separadamente. |
| Whitespace | git diff --check sem erros após correção de linha vazia final. |

Não executados: aplicação completa por docker compose up --build (compose ausente nesta branch); testes frontend/backend (módulos ausentes nesta branch); seed (ausente); migração de dados reais; checks de commit novo/PR (não criados). Os testes não comprovam autenticação, coleta periódica, registro/deduplicação de entrada ou privacidade/retencão em execução.

Roteiro e asserções completos em [verificação reproduzível](verificacao-schema.md); o pacote de revisão inclui scripts extraídos, log PostgreSQL e diff final. A convenção local cita numeric(14,6), sem proibição explícita de outras escalas; os tipos solicitados são justificados em [cálculos](../calculos.md). A ampliação resolve os exemplos testados, sem promessa de precisão universal.

Pendências antes de publicação: avaliar requisitos adicionais para cargas abaixo da nova resolução somente se exigidos pelo cliente; formalizar issue/sprint da entrada simples; sincronizar planning antigo pelo PO; decidir divisão do diff conforme limite de 400 linhas. Commit/publicação continuam sujeitos à autorização de Vinicius.
