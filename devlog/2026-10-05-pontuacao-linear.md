# 2026-10-05 — Pontuação linear

**Quem trabalhou:** Zambelli
**Ferramenta de IA usada:** Claude Code

## Objetivo da sessão

Voltar a pontuação para o simples: o item vale a sua posição.

## O que foi feito

- `src/scoring.js`: `pointsFor(pos) = pos` (online e offline usam a mesma função).
- Textos de regra: "Atenção ao truque" (offline), "Como pontua" e explicação do online.
- Testes com valores da quadrática atualizados (79/79).
- ADR-0014; ADR-0011 marcado como `superseded`.
- CLAUDE.md, README e `docs/categorias-candidatas.md` com a regra nova.

## Decisões tomadas

- Pontuação linear (ADR-0014). Resolve a confusão da issue #4 ("#37" e "+14" lado a lado).

## Arquivos principais alterados

- `src/scoring.js`, `public/offline.js`, `public/app.js`, `test/*.test.js`.

## Pendências / próximo passo

- [ ] Ver em partida real se o "jogar seguro no meio da lista" voltou a dominar (ver
      "Reavaliar se" no ADR-0014).
- [ ] Issues #5 e #6 (feedback-jogo).
