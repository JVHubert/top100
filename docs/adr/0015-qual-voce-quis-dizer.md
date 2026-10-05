# 0015 — "Qual você quis dizer?": opções parecidas no envio (modo num celular só)

- **Status:** accepted
- **Data:** 2026-10-05
- **Decisores:** Zambelli
- **Substitui:** o ADR-0009 **no modo num celular só** (o online, "em breve", segue o 0009)

## Contexto

O reconhecimento só aceita um chute quando todas as palavras digitadas estão no nome do
item. "villa nova de goias" e até "Vila Nova-GO" (como a fonte escreve) valiam fora, com o
Vila Nova em #29 na lista. Erros parecidos vão aparecer em todas as categorias. O ADR-0009
recusava listar opções para não revelar quais itens estão no top 100.

## Decisão

- Nome certo (o reconhecimento tem certeza): passa direto, como antes.
- Se não, procuramos itens parecidos por **trigramas** (pedaços de 3 letras; overlap
  ≥ 0,75, em `src/matching.js`). Havendo de 1 a 3, a tela pergunta **"Qual você quis
  dizer?"** com as opções e **"Nenhum desses: enviar como escrevi"**. Isso vale também
  para o nome ambíguo ("atletico" → Atlético-MG, Atlético-GO, Athletico-PR).
- Nada parecido: vale como digitado (fora).
- Limites contra sondar a lista:
  - aberta a pergunta, **não dá para cancelar e redigitar** (a regra recusa outro texto,
    `reason: 'must-choose'`; a tela some com o campo);
  - nada é sugerido com menos de 4 letras;
  - mais de 3 parecidos: volta o "escreva o nome completo" do ADR-0009;
  - opções empatadas em ordem alfabética (a ordem por posição entregaria a ordem da lista);
    itens queimados não aparecem; o botão mostra só o nome (filmes: título original e ano).

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Trigramas + pergunta (**escolhida**) | Pega erro de letra e palavra a mais; sem biblioteca | Revela que existem itens parecidos na lista |
| Só Levenshtein (atual) | Já existe | Não pega palavras a mais ("de goias") |
| Aceitar o mais parecido sem perguntar | Sem tela nova | Pontua item que o jogador não quis dizer (Mário → Maria) |
| Fuse.js | Pronto | Biblioteca externa sem build step; arquivo do celular maior |

## Consequências

- **Positivas:** acaba o "fora" injusto por grafia ou por detalhe a mais.
- **Negativas / trade-offs:** cada pergunta mostra até 3 itens da lista, e o jogador pode
  escolher um deles mesmo que tenha pensado em outro. Aceito: uma pergunta por vez, sem
  poder redigitar.
- **Confiança:** média (limiar calibrado com clubes, nomes e filmes).
- **Reavaliar se:** os jogadores passarem a digitar pedaços de propósito para ver opções,
  ou se aparecerem sugestões sem sentido em alguma categoria.
