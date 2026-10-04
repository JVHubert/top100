# CLAUDE.md — contexto do projeto para o Claude Code

> Arquivo de memória compartilhada. Fica **dentro do repositório** para que qualquer
> sessão do Claude Code (na máquina de qualquer um dos dois) entenda o projeto do mesmo
> jeito. Mantenha **curto** (< 200 linhas). Detalhes vão para `docs/`.

## O que é

**Top 100** — jogo multiplayer em tempo real (estilo Gartic/Jackbox): dado um tema,
cada jogador tenta adivinhar um item o mais perto possível da **posição 100** da lista.
`pontos = ceil(posição² / 100)` (rank 90 = 81, rank 20 = 4; ver `src/scoring.js` e ADR-0011). **Fora da lista = 0.**
Rodadas até alguém cravar 95+ (aí oferece "concede").

## Stack

- **Backend:** Node.js 20+ (ESM), Express + **Socket.IO** (tempo real de verdade).
- **Frontend:** HTML/CSS/JS puro em `public/` — **sem build step**, servido pelo Express.
- **Estado:** em memória (salas). Avaliações de categoria persistidas em `runtime/` (gitignored).
- Sem banco de dados no MVP.

## Comandos

```bash
npm install      # dependências
npm start        # sobe em http://localhost:3000
npm run dev      # com --watch (reinicia ao salvar)
npm test         # testes (node --test)
```

## Mapa do código

- `src/server.js` — HTTP + Socket.IO: sessão, rate limit, CSP (o "maestro").
- `src/game.js` — regras do modo online (`Room`, `RoomManager`): lobby, rodada, revelação,
  filme queimado, reconexão, estado por jogador (`viewFor`). **Sem rede.**
- `src/matcher.js` — reconhecimento de títulos (PT/EN, erro de digitação, ambíguos). Roda
  no servidor e no navegador.
- `src/offline-rules.js` + `src/matching.js` — regras do modo offline (servidas em `/shared/`).
- `src/categories.js` — registro; `src/data/categories/*.json` são os snapshots.
- `public/offline.html` + `offline.js` — jogo num celular só; é o que abre em `/` (modo → jogadores → categoria).
- `public/online.html` + `app.js` — modo online em `/online` ("em breve" na tela inicial; convites `/?sala=` redirecionam).
- `public/reveal-view.js` — régua, barras e ingressos da revelação (os dois modos). `public/style.css` — todo o visual.

## Convenções

- **Commits:** Conventional Commits (`feat(escopo): ...`). Ver `CONTRIBUTING.md`.
- **Branches curtas** (< 24h), PR sempre, **squash merge**.
- **Idioma:** código/identificadores em inglês; textos de UI e docs em pt-BR.
- **Estilo JS:** ESM (`import`/`export`), 2 espaços, sem ponto e vírgula obrigatório — siga o arquivo.
- Regras de jogo ficam **isoladas de I/O** em `src/game.js` e `src/offline-rules.js` para poderem ser testadas.

## Armadilhas conhecidas

- As listas em `src/data/categories/` são **snapshots estáticos** (rankings mudam com o
  tempo). NÃO trate como fonte viva. Ver `docs/adr/0003`.
- O modo offline **não** usa o servidor: é 100% cliente (ver `docs/adr/0004`).
- Durante a rodada, o servidor **esconde** as respostas dos outros jogadores (sanitização
  do estado por jogador em `Room.viewFor`, `src/game.js`). Não vaze resposta no broadcast.

## Ao terminar uma sessão, atualize

1. `CHANGELOG.md` (`[Unreleased]`)
2. `docs/adr/NNNN-...md` (se tomou decisão de arquitetura)
3. `devlog/AAAA-MM-DD.md` (o que fez/pendências)
4. `STATUS.md` (foto do momento)
