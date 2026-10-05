# Categorias e listas

Uma **categoria** é um tema com uma lista ordenada de itens. O jogador tenta acertar um
item o mais perto possível da **última posição** (índice alto = mais pontos).

## Formato de uma categoria

Um arquivo JSON em `src/data/categories/`:

```json
{
  "id": "top100-alguma-coisa",
  "name": "Top 100 alguma coisa",
  "status": "experimental",
  "snapshot": { "date": "AAAA-MM-DD", "source": "De onde veio", "note": "..." },
  "ui": {
    "noun": "cidade",
    "prompt": "Qual cidade está perto do fundo do top 100?",
    "placeholder": "Nome da cidade",
    "empty": "Digite o nome de uma cidade.",
    "ambiguous": "Esse nome serve para mais de uma cidade da lista. Escreva o nome completo.",
    "burned": "{item} já saiu nesta partida. Escolha outra."
  },
  "match": { "minFuzzyLength": 4, "minTokenFuzzyLength": 5 },
  "items": [
    { "pos": 1, "title": "Título original", "pt": "Título no Brasil", "year": 1994, "aliases": ["Apelido"], "detail": "SP" }
  ]
}
```

- `pos` 1 = primeiro colocado. `pt` e `aliases` alimentam o reconhecimento
  (`src/matcher.js`). O teste `test/matcher.test.js` confere se as posições estão contíguas.
- `status`: `"validada"` (conferida e jogada pelo Hubert, aparece em ⭐ Validadas) ou
  `"experimental"` (padrão; aparece em 🧪 Experimentais, ordenada pelos votos). Ver ADR-0012.
- `ui` (opcional): textos da categoria; o que faltar usa os padrões de `src/category-ui.js`.
- `match` (opcional): tolerância a erro de digitação. Listas de palavras curtas (nomes de
  pessoas) pedem valores maiores para "Ana" não virar "Ane". `spellingVariants: true`
  aceita grafias alternativas do mesmo nome (Raphael = Rafael); se duas grafias forem
  itens da lista, cada uma vale a sua posição e uma variante de fora conta como a mais
  parecida.
- `detail` (opcional, por item): texto curto no ingresso de resultado. Sem ele, filmes
  mostram título original e ano.
- Ver `docs/adr/0010`.

## Regra das listas: são SNAPSHOTS, não fontes vivas

Rankings (IMDb, Spotify, etc.) **mudam com o tempo**. Por isso as listas ficam fixas no
código, com `snapshot.date`, e **não** há scraping em tempo de execução. Ver
[`docs/adr/0003`](./adr/0003-categoria-como-snapshot.md).

Para atualizar: gere a nova lista, substitua `items` mantendo a ordem e **atualize
`snapshot.date`**. Registre a troca no `CHANGELOG.md`.

## Avaliação de categorias (👍/👎)

Existia na versão reconstruída e saiu na troca para a base do Zambelli (ADR-0007).
Volta num PR próprio, junto com o multi-categoria.

## Como adicionar uma categoria

1. Crie `src/data/categories/minha-categoria.json` no formato acima.
2. Registre o arquivo em `src/categories.js` (`FILES`).
3. Preencha `pt` e `aliases`: é o que faz o jogo entender o que as pessoas digitam.
4. **Faça a conferência de grafias antes do PR** (obrigatório, pedido do Hubert):
   - Rode uma lista de grafias que um jogador digitaria contra o `Matcher`: ph/f
     (Raphael), th/t (Thyago), k/c (Kamila), y/i, letras dobradas (Isabella), h final
     (Sarah), w/v, acentos e apelidos comuns.
   - Rode também itens **de fora** parecidos com itens da lista (Mário × Maria, Luiza ×
     Luiz, Inglaterra × Reino Unido, Imperatriz = nº 102): eles **não** podem pontuar.
   - Liste os itens da lista que soam igual entre si (Thiago e Tiago): cada um continua
     valendo a sua posição.
   - Vire os casos em testes em `test/categories.test.js` e mostre o resultado no PR.
   - Para nomes de pessoas, ligue `"spellingVariants": true` no bloco `match`.
5. Atualize `CHANGELOG.md` e, se for decisão relevante, um ADR.
