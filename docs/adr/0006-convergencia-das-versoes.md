# 0006 — Convergência: jogo da versão do Zambelli, processo da versão atual

- **Status:** accepted
- **Data:** 2026-10-03
- **Decisores:** Hubert

## Contexto

Existem duas versões do jogo. A do Zambelli (`old_version/`, fora do Git) foi feita
antes e ficou inacessível por um tempo; a atual (`main`) foi reconstruída do zero para
não travar o projeto. Uma comparação lado a lado, com os mesmos chutes nas duas, mostrou:

- **Reconhecimento de títulos:** a antiga aceita títulos em português, erro leve de
  digitação, não confunde sequências ("Toy Story 3" ≠ "Toy Story") e trata nomes
  genéricos ("Batman") como ambíguos (0 pontos). A atual só conhece títulos em inglês e
  casa substrings soltas ("love" → "Dr. Strangelove", 65 pontos).
- **Anti-trapaça:** na atual, `GET /api/categories/:id` entrega a lista com as posições
  para qualquer jogador. Na antiga a lista nunca sai do servidor.
- **Reconexão:** na atual o jogador é identificado pelo `socket.id`; um F5 no meio da
  partida o tira do jogo sem volta. A antiga tem sessão com token e retomada.
- **Robustez:** a antiga tem rate limit, `maxHttpBufferSize`, CSP, validação fechada e
  faxina de salas. A atual não.
- **A atual ganha em:** processo (ADRs, changelog, devlog, guias, instaladores),
  estrutura multi-categoria e modo offline.

## Decisão

O **código do jogo** passa a ser o da versão do Zambelli, portado aos poucos para a
estrutura da `main` (`src/`, ESM, Node 20+). O **processo** e as ferramentas da `main`
ficam. Da atual, preservamos: registro de categorias, modo offline e avaliação 👍/👎.

Ordem dos PRs (cada um ≤ ~400 linhas de mudança real):

1. `chore`: preparo (este ADR, `old_version/` no `.gitignore`, STATUS).
2. `refactor`: servidor e reconhecimento da antiga; a lista deixa de ser pública.
3. `feat`: reconexão por sessão, filme "queimado", tempo da rodada, link de convite.
4. `feat`: frontend da antiga (personagens, régua de revelação), mantendo o offline.
5. `feat`: multi-categoria + decidir qual snapshot do IMDb está certo.
6. `chore`: deploy (`Dockerfile`, `render.yaml`) e guia de deploy.

## Alternativas consideradas

| Alternativa | Prós | Contras |
|---|---|---|
| Base = antiga, trazer processo da atual (**escolhida**) | Regras e reconhecimento já testados | Port para ESM e para `src/` |
| Base = atual, corrigir os problemas | Nada a portar na estrutura | Reescrever reconhecimento, sessão e segurança que já existem |
| Manter as duas | Zero trabalho agora | Dois jogos divergindo; ninguém sabe qual é o "oficial" |

## Consequências

- **Positivas:** o jogo fica jogável em português e sem trapaça óbvia; o deploy deixa de
  ser dúvida aberta.
- **Negativas / trade-offs:** durante a transição a `main` mistura as duas bases.
- **Confiança:** alta.
- **Reavaliar se:** o port da sessão/reconexão se mostrar incompatível com o modo offline.
