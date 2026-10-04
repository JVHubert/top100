# 0007 — Trocar a base do jogo num PR só (ajuste do ADR-0006)

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** Hubert

## Contexto

O ADR-0006 previa portar a versão do Zambelli em PRs separados: servidor (2), regras (3)
e frontend (4). Na prática o frontend antigo (`public/app.js`) fala um protocolo
Socket.IO diferente do servidor da `main` (`room:resume`, `round:submit`, estado por
jogador via `viewFor`...). Portar só o servidor quebraria o frontend da `main`, e portar
só o visual exigiria o servidor antigo. O Hubert também pediu o visual antigo de volta.

## Decisão

1. **PRs 2, 3 e 4 viram um só**: servidor, regras, reconhecimento, dados e frontend da
   versão do Zambelli entram juntos, convertidos para ESM em `src/`. A maior parte do diff
   é arquivo movido; o código novo de verdade é pequeno (`categories.js`, `matching.js`,
   o trecho do offline em `server.js`).
2. **O modo offline continua**, com as regras da `main` renomeadas para
   `src/offline-rules.js`, mas agora usando o mesmo `matcher.js` do online.
3. **A lista fica acessível em `GET /api/categories/:id`**, porque o modo offline roda no
   navegador e precisa dela. Risco aceito: a lista é pública no IMDb de qualquer forma, e
   no modo online o estado enviado aos jogadores continua sem a lista.
4. **Saem por enquanto**: avaliação 👍/👎 de categoria e o banner de "concede" da `main`.
   Voltam em PRs próprios (issues #11 e multi-categoria).

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Um PR só (**escolhida**) | `main` nunca fica com servidor e front incompatíveis | PR grande (~2.500 linhas, quase tudo movido) |
| Manter 3 PRs | PRs pequenos | Dois deles deixariam o jogo quebrado na `main` |
| Esconder a lista também no offline | Sem consulta direta | Impossível: as regras rodam no navegador |

## Consequências

- **Positivas:** jogo online com reconexão, filme queimado, tempo da rodada, link de
  convite, títulos em PT e o visual antigo; offline com o mesmo reconhecimento.
- **Negativas / trade-offs:** o modo offline ainda tem o visual da versão reconstruída;
  migra num PR seguinte.
- **Confiança:** alta.
- **Reavaliar se:** o jogo virar público com prêmios (aí a lista exposta passa a importar).
