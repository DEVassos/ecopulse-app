# ADR 0010 — Mapa com MapLibre GL JS e imagens de satélite da EOX

| Campo | Valor |
|---|---|
| Status | aceito |
| Data | 2026-11-11 |
| Decisores | @DeaTuribio (frontend, autora do protótipo), @travensolli (SM, autor da #318) |
| Rastreabilidade | issue #318 · história #51 (US10), tarefas #321, #322 e #323 · história #53 (US12), tarefa #326 · requisito RF13 · critérios DW04 (apoio) e ES08 |

## Contexto e problema

A US10 (#51) pede um mapa com uma bolha por região, de tamanho proporcional ao CO₂e, para o gestor ver onde se concentram as emissões. O protótipo [`docs/produto/prototipo-mapa-regioes.html`](../produto/prototipo-mapa-regioes.html) (commit `9172dc8`) testou a ideia com o MapLibre carregado de uma CDN, uma camada de satélite e os dados do modo demonstração. O caminho foi aprovado na planning da Sprint 3 ([`docs/sprints/sprint-3/planning.md`](../sprints/sprint-3/planning.md), § Mapa e simulação, PR #314) e detalhado no corpo da #318, que dividiu o trabalho em: componente (#322), alternativa mais limpa (#326), modo apresentação (#323) e funções de região (#321).

Antes de instalar qualquer biblioteca no frontend, três perguntas precisavam de resposta registrada:

1. **Qual biblioteca desenha o mapa?** Ela entra no bundle, que hoje tem cerca de 117 kB de JS com gzip (um único arquivo, de 375,60 a 377,48 kB sem compressão, conforme a máquina) e 9,67 kB de CSS com gzip (46,47 kB sem compressão), medidos com `cd frontend && npx vite build` (vite 8.3.3 do lock) na develop em `802a9de`, no Linux e no Windows.
2. **De onde vêm as imagens de satélite, e com qual licença?** O protótipo usava a Esri World Imagery, cujos termos o time ainda não tinha conferido.
3. **O que acontece sem internet?** As imagens vêm de um serviço externo, e a apresentação pode acontecer numa rede ruim.

## Fatores de decisão

- **Critério de aceite da #51:** bolhas proporcionais ao CO₂e e serviços sem coordenada visíveis na lista, sem quebrar a tela.
- **Visual do protótipo:** globo na visão geral, voo até a região e câmera inclinada ao chegar. A interface é o ponto forte da Sprint 3.
- **Licença verificável:** o avaliador abre o link e encontra a mesma licença registrada aqui (Como verificar da #318).
- **Peso do bundle:** quem não abre o mapa não deve baixar a biblioteca.
- **Acessibilidade:** bolhas como botões com rótulo e respeito a "reduzir movimento", como no protótipo.

## Opções consideradas

### Biblioteca

1. **MapLibre GL JS** (`maplibre-gl`, licença BSD-3-Clause): mapa vetorial em WebGL, com projeção de globo, câmera com inclinação e marcadores HTML.
2. **Leaflet** (`leaflet` 1.9.4, licença BSD-2-Clause): mapa raster em 2D, leve e muito conhecido.
3. **SVG próprio, sem tiles**: contorno dos países desenhado pelo próprio React, com as bolhas por cima.

### Fonte das imagens

1. **EOX Sentinel-2 cloudless** (camada `s2cloudless-2025_3857` do WMTS `tiles.maps.eox.at`, o mosaico mais recente, já usada no protótipo).
2. **Esri World Imagery** (`server.arcgisonline.com`), a camada da primeira versão do protótipo (`9172dc8`).
3. **Nenhuma imagem**, só o contorno dos países.

## Decisão

**Biblioteca: MapLibre GL JS**, instalado pelo npm na #322 e carregado sob demanda com `React.lazy`. É a única das três opções que entrega o globo, o voo e a inclinação do protótipo sem escrever um motor de mapa. O Leaflet não tem globo nem inclinação. O SVG próprio é leve, mas obrigaria a reimplementar zoom, arraste e projeção, e fica como o fundo sem internet (abaixo). A versão exata é fixada no `package.json` da #322. O protótipo usou a 5.0.0 da CDN, e a linha 6 é a atual no npm.

**Imagens: EOX Sentinel-2 cloudless como camada padrão**, com a atribuição visível no canto do mapa:

> EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2025)

- **Licença conferida em 11/11/2026** na [página oficial de licença não comercial](https://cloudless.eox.at/license-non-commercial): as camadas de 2018 a 2025 estão sob [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). A página permite usar os serviços WMTS e WMS diretamente na aplicação, desde que se cumpram a licença e a atribuição, colocada perto do uso e com os links.
- **Uso comercial não está coberto.** Pela [página de licença comercial](https://cloudless.eox.at/license-legal/), ele exige a licença paga *EOX Commercial Attribution-RestrictedUse 1.2*. O EcoPulse é um projeto acadêmico, sem fins comerciais. O aviso ficará registrado no README e na legenda do mapa, no PR do mapa (#322): quem usar o app com fim comercial precisa contratar a licença da EOX ou trocar a fonte das imagens.

**Esri World Imagery fora do código por enquanto.** Os termos não são uma licença aberta. O uso é regido pelo contrato de licença da Esri e pelos termos do ArcGIS Online, as aplicações precisam exibir a atribuição "Powered by Esri", e a própria Esri [se reserva o direito](https://www.esri.com/en-us/legal/terms/web-site-service) de decidir se um uso sem cobrança é não comercial ou comercial (com licença paga). O time não conferiu esses termos para o nosso caso, então a camada sai do código. Para voltar, basta um novo ADR que registre os termos conferidos.

**Sem internet: fundo escuro e contorno dos países** em GeoJSON embutido no pacote do mapa, a partir da [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) 1:110m, que está em domínio público ("All versions of Natural Earth raster + vector map data … are in the public domain"), sem exigir atribuição e com uso comercial permitido. Quando as imagens falham, por erro de tile ou com o navegador offline, o mapa troca para esse fundo e mostra um aviso curto. As bolhas, a lista e o detalhe continuam funcionando, porque dependem só dos dados da API.

## Consequências

**Positivas**
- O visual aprovado no protótipo (globo, voo, inclinação e bolhas acessíveis) passa para o React sem motor de mapa próprio.
- A licença das imagens fica registrada, com link, e a atribuição aparece na tela.
- A apresentação não depende da internet para mostrar as bolhas: sem imagens, o mapa continua legível.
- Quem não abre o mapa não baixa a biblioteca, porque ela fica num pedaço separado do bundle (`React.lazy`).

**Negativas / custos**
- **Peso:** o pacote `maplibre-gl` 6.16.0 soma 1.699.017 B (452.428 B com gzip, ou 441,8 KiB), entre o módulo principal, o worker e o CSS do tarball do npm. É mais de três vezes o JS do app inteiro de hoje (cerca de 117 kB com gzip, medido como no Contexto). Por isso a carga sob demanda é obrigatória, e o mapa precisa de um estado de "carregando".
- **WebGL:** navegadores ou máquinas sem WebGL não desenham o mapa. Nesse caso a tela mostra a lista de regiões e um aviso, como no critério da #51 para dados sem coordenada.
- **Dependência de serviço externo:** as imagens vêm do WMTS da EOX, que não publica um limite de uso nem garantia de disponibilidade. O fundo offline cobre a falha, mas sem a imagem de satélite.
- **Uso comercial bloqueado** pela licença das imagens (CC BY-NC-SA 4.0), como descrito em Decisão.
- **Nível de detalhe:** o mapa limita o zoom em 11, no nível de cidade, porque as coordenadas são da região e não do prédio. Em z11 a resolução Web Mercator é de cerca de 76 m/px no equador, então os 10 m das imagens Sentinel-2 sobram, e a alta resolução da Esri não faria diferença.

**O que muda no repositório**
- `frontend/package.json`: dependência `maplibre-gl` com a versão fixada (#322).
- Componente do mapa carregado com `React.lazy` no Dashboard (#322), com a atribuição da EOX e o fundo offline.
- GeoJSON dos países (Natural Earth 1:110m, simplificado) junto ao componente do mapa (#322).
- `frontend/README.md` e README raiz: atribuição das imagens e aviso de uso comercial, no PR do mapa.
- O protótipo continua em `docs/produto/` como referência visual, já com a EOX de 2025 e a atribuição acima. A camada Esri saiu dele neste PR (#338).

## Prós e contras das opções

### Biblioteca — MapLibre GL JS
- Bom: globo, voo e inclinação prontos; marcadores HTML acessíveis; licença BSD-3-Clause; já validado no protótipo.
- Ruim: o pacote mais pesado das três opções; exige WebGL.

### Biblioteca — Leaflet
- Bom: leve, estável e com muita documentação; não exige WebGL.
- Ruim: só 2D, sem globo nem inclinação; perderia o principal efeito visual do protótipo.

### Biblioteca — SVG próprio
- Bom: nenhuma dependência, peso mínimo, funciona sem internet.
- Ruim: zoom, arraste, projeção e animação da câmera precisariam ser escritos do zero, sem tempo na sprint. Fica como fundo offline, não como mapa principal.

### Imagens — EOX Sentinel-2 cloudless
- Bom: licença pública e conferida, atribuição clara, uso direto do WMTS permitido, imagem sem nuvens.
- Ruim: só para uso não comercial.

### Imagens — Esri World Imagery
- Bom: visual muito conhecido. A alta resolução não pesa aqui, porque o mapa para no zoom 11.
- Ruim: termos proprietários ainda não conferidos para o nosso uso, atribuição "Powered by Esri" obrigatória e decisão da Esri sobre o que é uso comercial.

### Imagens — nenhuma
- Bom: zero dependência externa e zero questão de licença.
- Ruim: perde o efeito visual da imagem de satélite, que o time quer na apresentação. Fica como queda sem internet.

## Como verificar que está em vigor

Esta seção vale depois do merge do PR do mapa (#322). Antes disso, os comandos abaixo voltam vazios, porque o componente ainda não existe.

```bash
grep -n '"maplibre-gl"' frontend/package.json            # dependência fixada
grep -rn "React.lazy\|lazy(" frontend/src | grep -i map  # mapa carregado sob demanda
grep -rn "cloudless.eox.at" frontend/src                 # atribuição da EOX no componente
grep -rn "arcgisonline" frontend/src                     # deve voltar vazio: Esri fora do código
```

Na tela, com o compose no ar: o canto do mapa mostra a atribuição da EOX. Com a rede desligada nas ferramentas do navegador, o mapa troca para o contorno dos países e as bolhas continuam clicáveis.
