# Categorias candidatas (banco de ideias validadas)

> Documento de trabalho. **Não é código** (nenhum JSON ainda): é o resultado da
> validação de fontes para novas categorias do Top 100, para decidirmos o que entra.
> Formato final em [`categorias.md`](./categorias.md); decisão em
> [`adr/0010`](./adr/0010-varias-categorias.md).

## Regra de ouro: a lista precisa ser **ordenada**

Neste jogo os pontos saem da **posição** (`pontos = posição`: o 100º vale 100, o 90º
vale 90, o 20º vale 20; ver ADR-0014). Logo a fonte precisa entregar um **ranking 1→100
com ordem defensável** — não basta "ter 100 itens".

Consequência prática: listas sem ordem (ou com ordem arbitrária) **não servem**,
mesmo tendo exatamente 100 itens. Exemplos que caem fora:

- **TIME 100** (100 personalidades mais influentes do ano) — existe e tem 100 por ano,
  mas **não é ranqueado** (é alfabético, por categoria). Sem posição, não há pontuação.
- **Catálogo Messier** — tem 110 objetos, mas a ordem (M1, M2, ...) é de catalogação,
  não de mérito; o "100º" não significa nada.
- **"Lista de Nobel laureados por país"** — existe, mas é uma lista de pessoas agrupadas
  por país, sem um ranking único limpo.

## As duas validações

Para cada ideia, checamos:

1. **Faz sentido?** — critério claro, fonte crível e itens que um grupo consegue chutar.
2. **Tem 100?** — a fonte tem pelo menos 100 itens **ou** é um "Top 100" fechado.
3. **Dá para chutar perto do fim?** (acrescentado na revisão) — como o fundo da
   lista vale mais, a graça está nos itens entre ~#70 e #100. Se ninguém do grupo consegue
   nomear itens nessa faixa (ex.: montanhas mais altas, estrelas mais brilhantes), a
   categoria vira sorteio. Se só o topo é conhecido e o fundo é obscuro, também não serve.
4. **Dá para reconhecer o que as pessoas digitam?** — nomes com muitas grafias (pessoas,
   países, títulos estrangeiros) exigem a conferência de grafias de `categorias.md`.

Legenda de status: ✅ validado · ⚠️ existe mas exige conferência/extração manual · ❌ reprovado.

## Já no jogo (confirmado nesta rodada)

| Categoria | Fonte | Nº de itens |
|---|---|---|
| Top 100 filmes segundo o IMDb | IMDb (espelho Letterboxd, 22/09/2026) | ✅ 100 |
| Top 100 nomes mais comuns do Brasil | IBGE, Censo 2022 (geral, sem separar sexo) | ✅ 100 |
| Top 100 países mais populosos | ONU, WPP 2024 | ✅ 100 |
| Top 100 maiores cidades do Brasil | IBGE, Censo 2022 (SIDRA 4709) | ✅ 100 |
| Top 100 O Maior Brasileiro (SBT, 2012) | Wikipédia pt (100 posições; top 12 pela fase final), conferida com a en | ✅ 100 |
| Top 100 maiores músicas brasileiras | Rolling Stone Brasil, 2009 (página oficial) | ✅ 100 |
| Top 100 marcas mais valiosas | Interbrand Best Global Brands 2025 (dados da página oficial) | ✅ 100 |
| Top 100 clubes no ranking da CBF | CBF, RNC 2026 (lista da Band; top 20 conferido com a ESPN) | ✅ 100 |
| Top 100 séries segundo o IMDb | IMDb Top 250 TV, copiado do site pelo Hubert (04/10/2026) | ✅ 100 |
| Top 100 sobrenomes mais comuns do Brasil | IBGE, Censo 2022, copiado do site pelo Hubert | ✅ 100 |
| Top 100 nomes de bebês (2020–2022) | IBGE, Censo 2022, filtro de nascimento 2020–2022, copiado pelo Hubert | ✅ 100 |

Os testes `test/categories.test.js` garantem **100 posições contíguas** em todas as
categorias registradas em `src/categories.js` (hoje: 62 testes no total).

## Ideias que você já citou (validadas)

| Categoria sugerida | id proposto | Fonte | 100? | Faz sentido? |
|---|---|---|---|---|
| Top 100 séries segundo o IMDb | `top100-series-imdb` | IMDb Top 250 TV (derivar 100) | ✅ (250 → 100) | ✅ pop, reaproveita o formato dos filmes |
| Nomes mais comuns — masculino | `top100-nomes-masculino` | IBGE, Censo 2022, por sexo | ⚠️ 100 existe na fonte, extração manual | ✅ família, divertido |
| Nomes mais comuns — feminino | `top100-nomes-feminino` | IBGE, Censo 2022, por sexo | ⚠️ idem | ✅ família, divertido |
| Top 100 "O Maior Brasileiro de Todos os Tempos" (SBT, 2012) | `top100-brasileiros-sbt-2012` | SBT / pt.wikipedia (60 + 40) | ✅ **exatamente 100** | ✅ engraçada (ressalva de nome, abaixo) |

### Notas das que você citou

- **Séries (IMDb):** o IMDb mantém o *Top 250 TV Shows*. Pegamos os 100 primeiros, mesmo
  racional dos filmes. Ressalva: `imdb.com` bloqueia leitura automática (robô); precisamos
  de um espelho/snapshot como o usado para os filmes.
- **Nomes por sexo:** o IBGE publica o ranking **por sexo** no site "Nomes no Brasil"
  (Censo 2022, divulgado em 04/11/2025). A tabela do Censo 2022 na Wikipédia que lemos ao
  montar a categoria geral tinha 30 nomes por sexo (o "~61" anterior não bate com ela), e o site
  do IBGE fica atrás de verificação anti-robô — dá para ter os 100, mas **extração manual**.
  Como no "nomes geral", o matcher deve ser **sem tolerância a erro de digitação**.
- **"O Maior Brasileiro" (SBT 2012):** a fonte é **exatamente 100 nomes** (o programa
  anunciou 60 em 11/07/2012 e 40 em 18/07/2012). A ordem é **por votação popular e fases
  eliminatórias** — **não é uma lista de mérito** (daí o espanto com Dedé na frente de
  Carlos Chagas). Como isso é a graça, o **nome da categoria precisa deixar isso explícito,
  em tom de humor**. Sugestão:

  - **Nome:** `Top 100 O Maior Brasileiro de Todos os Tempos (SBT, 2012)`
  - **Detalhe/texto (ui):** "Ranking por voto popular do programa do SBT — não é uma lista
    de relevância histórica. Sim, tem Dedé na frente de Carlos Chagas."
  - `snapshot.note`: "Pleito popular por eliminatórias (SBT, 2012). Ordem ≠ importância
    histórica."

## Mais ideias — Geografia e economia (educativas)

Todas com ranking 1→N e cobertura bem acima de 100 (basta cortar na 100ª).

| Categoria | id proposto | Fonte | 100? |
|---|---|---|---|
| Top 100 países por **área** | `top100-paises-area` | ONU / CIA World Factbook | ✅ (193 ONU + observadores + dependências) |
| Top 100 países por **PIB nominal** | `top100-paises-pib` | FMI, World Economic Outlook | ✅ (> 180 economias) |
| Top 100 países por **IDH** | `top100-paises-idh` | PNUD, Relatório de Desenvolvimento Humano | ✅ (~193 entidades) |
| Top 100 **maiores cidades do mundo** | `top100-cidades-mundo` | ONU, World Urbanization Prospects | ✅ (⚠️ definir "cidade própria" vs. "área urbana") |
| Top 100 **destinos mais visitados** | `top100-destinos-turismo` | ONU Turismo (UNWTO) | ⚠️ confirmar 100 no *Barometer*: a Wikipédia traz top 10 por continente |

**Ressalvas:** PIB muda muito ano a ano (câmbio) — funciona, mas exige snapshot datado.
"Cidades do mundo" é ambíguo (Chongqing "cidade própria" x área metropolitana): escolher
**uma** definição e registrar na `ui`.


## Mais ideias — Artes e cinema (a família ABRACCINE é ouro)

A ABRACCINE publicou **várias** listas de exatamente **100** — cada uma é uma categoria
pronta, já ranqueada:

| Categoria | id proposto | Fonte | 100? |
|---|---|---|---|
| Top 100 melhores filmes brasileiros | `top100-filmes-brasileiros-abraccine` | ABRACCINE, 2015/2016 | ✅ exatamente 100 (`Limite` nº 1) |
| Top 100 filmes brasileiros mais importantes | `top100-filmes-brasileiros-essenciais` | ABRACCINE, 2026 | ✅ exatamente 100 |
| Top 100 melhores documentários brasileiros | `top100-documentarios-brasileiros` | ABRACCINE | ✅ exatamente 100 |
| Top 100 melhores filmes de animação brasileiros | `top100-animacoes-brasileiras` | ABRACCINE | ✅ exatamente 100 |
| Top 100 melhores filmes de cinema fantástico | `top100-fantastico-brasileiro` | ABRACCINE | ✅ exatamente 100 |
| Top 100 melhores curtas-metragens brasileiros | `top100-curtas-brasileiros` | ABRACCINE | ✅ exatamente 100 |

- **Artes (mundial):** *Top 100** museus de arte mais visitados — *The Art Newspaper*.
  ✅ exatamente 100. (A lista geral de "museus mais visitados" fica em ~50 → **não** dá 100.)
- **Bilheteria:** Top 100 maiores bilheterias do cinema (mundial) — Box Office Mojo,
  ordenado por receita. ⚠️ a Wikipédia só tabula ~50 por modo nominal; a fonte crua
  (Box Office Mojo) tem os 100.
- **Ressalva de dificuldade:** curtas-metragens e "cinema fantástico" são **difíceis** para
  um grupo casual (pouca gente conhece). "Melhores filmes brasileiros" e "animação" são
  bem mais jogáveis.

## Mais ideias — História e personalidades

| Categoria | id proposto | Fonte | 100? |
|---|---|---|---|
| Top 100 "O Maior Brasileiro de Todos os Tempos" (SBT, 2012) | `top100-brasileiros-sbt-2012` | SBT (pleito popular) | ✅ exatamente 100 |
| Top 100 maiores britânicos (*100 Greatest Britons*) | `top100-britanicos-bbc` | BBC, 2002 | ✅ exatamente 100 |

- O formato da BBC gerou versões em vários países (Alemanha, Itália, França, EUA...),
  todas com uma lista fechada em torno de 100 — dá um **"pacote"** de categorias com a
  mesma mecânica, mas é preciso validar cada lista nacional na fonte oficial.

## Mais ideias — Futebol

| Categoria | id proposto | Fonte | 100? |
|---|---|---|---|
| Top 100 seleções no ranking da FIFA | `top100-ranking-fifa` | FIFA (ranking mensal) | ✅ (211 seleções → corta na 100ª) |
| Top 100 transferências mais caras do futebol | `top100-transferencias-caros` | Transfermarkt / Wikipedia | ⚠️ a tabela da Wikipédia é curta; a fonte crua tem mais |

- **Ranking FIFA** é a categoria de futebol mais sólida: **ordenada**, oficial, atualizada
  todo mês e joga fácil (é geografia + futebol). Exige snapshot datado (a ordem muda).
- **Ressalva:** "melhores jogadores de todos os tempos" é **subjetivo** → sem fonte única,
  não serve.

## Mais ideias — Escolares e ciências

| Categoria | id proposto | Fonte | 100? | Faz sentido? |
|---|---|---|---|---|
| Top 100 maiores empresas do mundo (por receita) | `top100-empresas-receita` | Fortune Global 500 → 100 | ✅ | ✅ (mudam de ano em ano) |
| Top 100 elementos químicos mais abundantes na crosta | `top100-elementos-crosta` | Química (dados USGS) | ⚠️ só 118 elementos; corte na 100ª é "quase tudo" |

- Cuidado com **matérias escolares de catálogo curto**: "top 100 elementos" existe (118),
  mas 100 de 118 é uma lista quase completa — pouco desafio. Preferir recortes ("os 100
  **mais abundantes**") ou trocar de tema.

## Ideias REPROVADAS (e o porquê)

| Ideia | Por que não |
|---|---|
| TIME 100 (pessoas mais influentes do ano) | Tem 100, mas **não é ranqueado** (alfabético) → sem posição, não pontua |
| Catálogo Messier | Tem 110, mas a ordem é de catalogação (arbitrária para o jogo) |
| Lista de Nobel por país | Não é um ranking único limpo (agrupa pessoas por país) |
| "Melhores jogadores de futebol" | Critério subjetivo, sem fonte única |
| Museus mais visitados (lista geral) | Só ~50 itens na prática (a de **arte** tem 100) |


## Como transformar uma candidata em categoria

1. Criar `src/data/categories/<id>.json` no formato de [`categorias.md`](./categorias.md)
   (`snapshot.date` + `snapshot.source`; `ui` com `noun`/`prompt`/`example`;
   `match` conforme o caso; e os **100 `items` com `pos` 1..100 contíguos**).
2. Traduzir/localizar o que for preciso: países e cidades em **português**, apelidos em
   `aliases`, e `detail` curto por item (ex.: população, UF, receita).
3. Registrar o arquivo em `src/categories.js` (`FILES`).
4. Rodar `npm test` — `test/categories.test.js` reprova se não forem 100 posições contíguas
   ou se algum item não for reconhecido pelo próprio nome.
5. Atualizar `CHANGELOG.md` e, se for decisão relevante, um ADR.

## Revisão (Claude, 04/10/2026)

Conferido contra o que aprendemos montando as 4 categorias que já estão no jogo.

**Correções feitas neste documento**
- Pontuação: o texto dizia "o item vale a posição"; desde o ADR-0011 é `ceil(posição²/100)`.
- Nomes por sexo: a tabela da Wikipédia que usamos tinha 30 por sexo, não ~61.
- Critérios 3 e 4 acrescentados (dá para chutar perto do fim? dá para reconhecer o que
  as pessoas digitam?).

**Pontos a conferir antes de virar categoria**
- **SBT 2012 (resolvido em 04/10/2026):** as 100 posições existem (Wikipédia pt; o top 12 vem dos lugares da fase final) e Dedé (63º, o zagueiro) ficou mesmo na frente de Carlos Chagas (66º). Texto original do ponto: Em programas com fases
  eliminatórias, é comum só o fim (top ~10) ter ordem; os 60 + 40 anunciados podem ter
  sido listas **sem posição**. Sem posição única de 1 a 100, cai na regra de ouro. A
  frase "Dedé na frente de Carlos Chagas" também precisa ser checada na fonte antes de ir
  para o jogo.
- **ABRACCINE "mais importantes", 2026:** confirmar que a lista existe e é ranqueada
  (as de 2015/2016 são conhecidas; a de 2026 não conferi).
- **Elementos químicos na crosta:** sugiro **reprovar**. A abundância só é medida para os
  elementos que existem na natureza (~90); depois disso não há um "nº 100" com sentido.
- **Países por área / PIB / IDH:** boas, mas o fundo da lista (países pequenos ou pouco
  conhecidos) é difícil; testar jogabilidade com o grupo (critério 3).
- **Cidades do mundo:** escolher a definição (município × aglomeração) e registrá-la no
  nome da categoria, como fizemos em "maiores cidades do Brasil" (por município).

### Mais sugestões (a conferir pelos critérios 1 a 4)

| Categoria | Fonte provável | Por que pode ser boa |
|---|---|---|
| 100 maiores músicas brasileiras | Rolling Stone Brasil (2009) | Lista fechada de 100, ranqueada; todo mundo conhece algumas |
| 100 maiores discos da música brasileira | Rolling Stone Brasil (2007) | Idem, para quem curte música |
| 100 maiores artistas da música brasileira | Rolling Stone Brasil (2008) | Nomes de pessoas: ligar `spellingVariants` |
| Ranking nacional de clubes | CBF (ranking anual, 200+ clubes) | Futebol brasileiro, oficial, ordenado |
| Seleções no ranking da FIFA | FIFA (mensal) | Já listada acima; reforço: é a mais sólida de futebol |
| Quadro de medalhas olímpicas de todos os tempos | COI / tabelas históricas | ~150 países, ordenado por ouros |
| Aeroportos mais movimentados do mundo | ACI World (anual) | Ordenado por passageiros; viajantes adoram |
| Universidades do Brasil | RUF, Folha (anual, ~200) | Ordenado; bom para grupos de universitários |
| Universidades do mundo | QS ou THE (anual) | Ordenado; centenas de itens |
| Marcas mais valiosas do mundo | Interbrand Best Global Brands | Exatamente 100, ranqueadas, todo mundo conhece |
| Municípios por PIB | IBGE, PIB dos Municípios | Mesma fonte oficial das cidades; ranking diferente surpreende |
| Sobrenomes mais comuns do Brasil | IBGE, Censo 2022 | Mesma divulgação dos nomes (site anti-robô: extração manual) |
| Rios mais longos do mundo | Listas geográficas | Ordenado; fundo da lista é difícil (testar critério 3) |
| Maiores estádios do mundo (capacidade) | Listas de capacidade | Ordenado; mistura futebol e geografia |
| Livros "100 do século" | Le Monde (1999, por votação) | Ranqueado por votos; bom para leitores |
| Animes mais bem avaliados | MyAnimeList (ranking por nota) | Ordenado, muda pouco no topo; público jovem |

## Próximos passos sugeridos

1. **Curto prazo (fáceis):** `top100-series-imdb`, `top100-paises-area`, `top100-paises-pib`,
   `top100-paises-idh` — todas com fonte pronta e 100 garantidos.
2. **SBT 2012:** já validada (100 nomes); só decidir o nome de humor e extrair a tabela.
3. **ABRACCINE:** começar por "melhores filmes brasileiros" e "animação" (mais jogáveis).
4. **FIFA:** categoria de futebol oficial, exige snapshot datado.
5. **IBGE por sexo:** separar masculino/feminino exige extração manual (site anti-robô).

## Fontes consultadas (checagem em 03/10/2026)

- IBGE — "Nomes no Brasil", Censo 2022 (prenomes e sobrenomes; por sexo).
- ONU — World Population Prospects 2024; World Urbanization Prospects.
- ONU Turismo (UNWTO) — World Tourism Barometer.
- FMI — World Economic Outlook (PIB nominal); PNUD — RDH (IDH).
- IMDb — Top 250 filmes / Top 250 TV (via espelho).
- ABRACCINE — listas de 100 (filmes, essenciais, documentários, animação, curtas, fantástico).
- SBT / pt.wikipedia — "O Maior Brasileiro de Todos os Tempos" (2012).
- FIFA — Ranking Mundial Masculino.
- *The Art Newspaper* — 100 museus de arte mais visitados.
- Fortune — Global 500.

