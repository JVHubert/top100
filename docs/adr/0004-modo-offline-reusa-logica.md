# 0004 — Modo offline reaproveita a lógica do servidor

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** fundadores do projeto

## Contexto

Foi pedido um **modo offline** para jogar com amigos presentes, todos no **mesmo aparelho**
(passa-o-celular). Se as regras do offline fossem reescritas no cliente, teríamos duas
implementações de pontuação que podem divergir — e bugs de regra são os piores de achar.

## Decisão

- O modo offline roda no navegador, mas **importa as mesmas regras** usadas pelo servidor.
- Os módulos puros (`src/matching.js`, `src/game.js`) são servidos em `/shared/*.js` e
  importados por `public/offline.js`.
- O offline simula uma "sala" local com jogadores `p1..pN` e um fluxo por turnos.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Reescrever a lógica no cliente | simples de começar | regra duplicada = risco de divergir |
| Empacotar tudo num bundle | organização | adiciona passo de build (contraria o ADR-0001) |
| Servir os módulos puros | uma só fonte de verdade | expõe arquivos do servidor (só os puros) |

## Consequências

- **Positivas:** uma única fonte de verdade para as regras; testar `game.js` cobre os dois
  modos; offline funcionou de graça.
- **Negativas:** um pouco menos "óbvio" para quem lê o código pela primeira vez (o
  `offline.js` importa de `/shared/`). Documentado aqui e no `CLAUDE.md`.
- **Confiança:** média-alta.
- **Reavaliar se:** a superfície de `/shared/` crescer e passarmos a expor coisas que não
  deveriam ser públicas.
