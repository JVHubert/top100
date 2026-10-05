# 0014 — Pontuação linear: o item vale a sua posição

- **Status:** accepted
- **Data:** 2026-10-05
- **Decisores:** Zambelli

## Contexto

O ADR-0011 trocou `pontos = posição` por `ceil(posição² / 100)` para premiar o risco. Nos
testes do fim de semana (issue #4), a revelação mostrava "#37" e "+14" lado a lado e os
jogadores não entendiam qual número era o ponto. A regra precisa caber numa frase dita
em voz alta numa roda de amigos.

## Decisão

`pontos = posição` (em `src/scoring.js`, usado pelo online e pelo offline): acertou o #1
vale 1, acertou o #100 vale 100. Fora da lista continua 0. O aviso de 95+ e a morte
súbita não mudam.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Linear (**escolhida**) | Posição e pontos são o mesmo número; zero explicação | Jogar seguro volta a compensar (cinco #20 = um #100) |
| Manter a quadrática e destacar só os pontos na tela | Mantém o incentivo ao risco | A conta continua invisível e estranha ("por que 14?") |
| Linear + bônus acima de #90 | Incentiva o risco | Degrau brusco entre #89 e #90; regra a mais para explicar |

## Consequências

- **Positivas:** a regra se explica sozinha; a revelação deixa de ter dois números
  diferentes para o mesmo palpite.
- **Negativas / trade-offs:** o incentivo a arriscar perto do 100 fica menor. Quem quer
  emoção no fundo da lista ainda tem o fim de partida ao cravar 95+ e a morte súbita.
- **Confiança:** média-alta.
- **Reavaliar se:** as partidas virarem "todo mundo chuta o meio da lista".
