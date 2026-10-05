# 0016 — Tipo de jogo "Alvo" e desempate no fim da partida

- **Status:** accepted
- **Data:** 2026-10-05
- **Decisores:** Zambelli

## Contexto

O jogo tem uma só lógica: cada acerto soma a posição e vence quem tiver mais pontos (o
"Clássico", ADR-0014). O Zambelli propôs uma variação com as mesmas listas: sortear um
número de 1 a 100 e ver quem chega mais perto dele. Também faltava o que fazer quando a
última rodada termina empatada.

## Decisão

- Novo tipo de jogo **Alvo** (modo num celular só), escolhido na etapa 4, que passa a se
  chamar **Partida** (tipo de jogo + número de rodadas). Padrão: Clássico.
- No Alvo, cada rodada sorteia um alvo de 1 a 100, mostrado a todos antes dos chutes. O
  item mais perto do alvo (distância `|posição − alvo|`) vence a rodada e vale **1 ponto**.
  Empate entre os mais perto: **ninguém pontua**. Fora da lista não conta.
- No Alvo não existem "concede"/morte súbita (95+) nem "melhor chute" (mais perto do 100).
- **Desempate (os dois tipos):** se a última rodada combinada termina com empate no
  primeiro lugar, a revelação oferece **Rodada de desempate**, quantas vezes quiserem,
  além de "Ver resultado final".
- Regras em `src/offline-rules.js` (`gameMode`, `round.target`, `tiedForFirst`), com o
  sorteio injetável (`startRound(room, { rng })`) para os testes.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Alvo com 1 ponto por rodada (**escolhida**) | Regra de uma frase; placar curto | Rodada empatada não muda nada |
| Alvo com pontos por distância (100 − distância) | Todo mundo pontua | Volta a ter conta para explicar (o problema da #4) |
| Alvo escondido até a revelação | Mais sorte | Vira sorteio puro: ninguém tem como mirar |
| Desempate automático | Sempre há vencedor | O grupo pode preferir terminar empatado |

## Consequências

- **Positivas:** um segundo jeito de jogar com as mesmas 11 listas; o meio da lista
  passa a importar.
- **Negativas / trade-offs:** só no modo num celular só; com 2 jogadores, empates são
  frequentes (cada um tem metade das chances de igualar a distância).
- **Confiança:** média.
- **Reavaliar se:** as partidas no Alvo terminarem empatadas demais (aí pensar em pontos
  por distância ou em meio ponto no empate).
