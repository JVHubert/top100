# 0010 — Várias categorias, com textos e regras de reconhecimento próprios

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** Hubert

## Contexto

O jogo nasceu com uma categoria (filmes do IMDb) e textos fixos em "filme" espalhados pelo
servidor e pelos dois clientes. O Hubert escolheu as próximas: nomes mais comuns do Brasil,
países mais populosos e maiores cidades do Brasil. Cada uma fala de um jeito ("Escolha
outro"/"Escolha outra") e reconhece palavras de um jeito (nomes curtos não toleram erro de
digitação como títulos longos).

## Decisão

- Cada categoria é um JSON em `src/data/categories/` com, além dos itens:
  - `ui`: textos (`noun`, `prompt`, `placeholder`, `empty`, `ambiguous`, `burned` com
    `{item}`, `example` = posição baixa usada na tela "Atenção ao truque"). O que faltar cai
    nos padrões de `src/category-ui.js`.
  - `match` (opcional): opções do `Matcher` (`minFuzzyLength`, `minTokenFuzzyLength`).
  - `detail` (opcional, por item): texto curto mostrado no ingresso ("SP").
- **Online:** a sala nasce com a categoria padrão; o host troca no lobby
  (`room:settings { categoryId }`). O servidor mantém um `Matcher` por categoria.
- **Offline:** escolha na tela de cadastro. O arquivo único embute todas as categorias.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Textos e opções no JSON (**escolhida**) | Categoria nova = só dados | JSON um pouco maior |
| `if (categoria === ...)` no código | Rápido para a 2ª categoria | Vira emaranhado na 4ª |
| Um servidor por categoria | Isolamento | Sem sentido para um jogo de festa |

## Consequências

- **Positivas:** adicionar categoria não exige mexer em código; textos certos para cada tema.
- **Negativas / trade-offs:** o arquivo único cresce com cada categoria (~20 KB cada).
- **Confiança:** alta.
- **Reavaliar se:** passarmos de ~20 categorias (aí carregar sob demanda no offline).
