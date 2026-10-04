# 0011 — Pontuação quadrática

- **Status:** accepted
- **Data:** 2026-10-04
- **Decisores:** Hubert

## Contexto

Com `pontos = posição`, jogar seguro compensa: cinco palpites no #20 somam 100 pontos,
o mesmo que cravar o #100 uma vez. O espírito do jogo é arriscar perto do fundo da lista;
um #95 deveria valer "ao extremo" (palavras do Hubert), e quem erra quatro vezes e acerta
um #99 deveria ganhar de quem acerta cinco #20.

## Decisão

`pontos = ceil(posição² / 100)` (em `src/scoring.js`, usado pelo online e pelo offline).
Fora da lista continua valendo 0. O aviso de 95+ e o "melhor chute" olham a **posição**.

| Posição | 1 | 10 | 20 | 50 | 80 | 90 | 95 | 99 | 100 |
|---|---|---|---|---|---|---|---|---|---|
| Pontos | 1 | 1 | 4 | 25 | 64 | 81 | 91 | 99 | 100 |

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| `ceil(pos²/100)` (**escolhida**) | Mantém a escala até 100; fácil de mostrar | Abaixo do #10 tudo vale 1 |
| `pos²` | Mesma curva | Placar com milhares, difícil de ler |
| Linear + bônus por faixa (90+, 95+) | Simples de explicar | Degraus bruscos; #89 vs #90 muda demais |

## Consequências

- **Positivas:** arriscar perto do 100 compensa; um #99 (99) vale mais que cinco #20 (20).
- **Negativas / trade-offs:** posições baixas quase não pontuam, o que pode desanimar
  quem está aprendendo; a tela "Atenção ao truque" mostra a curva para compensar.
- **Confiança:** média (ajustar depois de algumas partidas reais).
- **Reavaliar se:** as partidas virarem "tudo ou nada" demais.
