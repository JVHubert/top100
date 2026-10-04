# 0003 — Categorias são snapshots estáticos

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** fundadores do projeto

## Contexto

O jogo depende de listas ranqueadas reais (ex.: "Top 100 filmes segundo o IMDb"). Rankings
de fontes vivas **mudam com o tempo**: um item que hoje é #87 amanhã pode ser #85. Se a
lista mudasse durante a partida, o placar ficaria incoerente entre jogadores.

## Decisão

- Cada lista é um **snapshot estático** versionado no código, com campo `snapshotDate`.
- **Nada de scraping em tempo de execução.**
- Atualizar a lista é uma mudança de código (e deve aparecer no `CHANGELOG.md`).
- A lista do IMDb no MVP é uma **aproximação** do IMDb Top 250 e deve ser substituída por
  um snapshot real quando possível.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Buscar ranking em tempo real | "sempre atual" | instável, risco de bloquear/travar, partida inconsistente, depende de terceiros |
| Snapshot + aviso de data | estabilidade, offline, reprodutível | a lista "envelhece" |
| Snapshot por temporada/ano | flexível | mais estrutura do que o MVP precisa |

## Consequências

- **Positivas:** partidas reproduzíveis e justas; funciona sem internet (modo offline);
  sem dependência de API externa.
- **Negativas:** a lista fica desatualizada com o tempo; exige atualização manual.
- **Confiança:** alta.
- **Reavaliar se:** houver muitos feedbacks de "esse filme não está nessa posição".
