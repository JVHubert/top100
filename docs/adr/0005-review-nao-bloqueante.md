# 0005 — Review de Pull Request é opcional e não bloqueante

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** JVHubert

## Contexto

O projeto é tocado por duas pessoas, cada uma na sua casa, em horários e ritmos bem
diferentes — na prática, uma delas trabalha sozinha boa parte do tempo. O GitHub Flow
clássico pede revisão obrigatória antes do merge. Se a `main` exigir aprovação, quem está
com tempo livre fica **travado esperando o outro aparecer**, e o processo vira gargalo.

## Decisão

Mantemos Pull Request para **toda** mudança, mas a revisão do parceiro é **opcional e não
bloqueante**:

- A `main` é protegida exigindo Pull Request, **sem** "Required approvals" e **sem**
  "Require review from Code Owners".
- Qualquer um pode aprovar e dar merge no **próprio** PR
  (`gh pr merge --squash --delete-branch`).
- O PR segue sendo o **registro** do que mudou e por quê; o briefing do parceiro vem do
  `CHANGELOG.md` + `devlog/` + `STATUS.md`.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Revisão obrigatória (2 olhos sempre) | pega erro cedo | trava quem tem tempo livre; só duas pessoas |
| Sem PR nenhum, commit direto na `main` | velocidade máxima | perde o histórico das decisões |
| **PR sempre, review opcional** | histórico preservado + zero bloqueio | depende de disciplina para escrever o PR |

## Consequências

- **Positivas:** ninguém fica bloqueado; a `main` mantém histórico limpo (squash); a
  revisão acontece quando dá, não quando é permitido.
- **Negativas / trade-offs:** um erro pode entrar na `main` sem um segundo par de olhos.
  Mitigado rodando `npm test` antes do merge e pela regra "a `main` sempre funciona".
- **Confiança:** alta.
- **Reavaliar se:** o projeto passar de 2–3 pessoas, ou quando houver CI obrigatório (aí
  "Require status checks" passa a ser a proteção real, no lugar da revisão humana).
