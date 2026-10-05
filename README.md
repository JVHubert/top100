# Top 100 🎬

Jogo multiplayer em tempo real no estilo *Gartic / Jackbox / Kahoot*.

**A regra é simples:** sorteia-se um tema (ex.: *"Top 100 filmes segundo o IMDb"*). Cada
jogador tenta adivinhar um item que esteja o mais **perto possível da POSIÇÃO 100** da
lista — não da posição 1. Quanto mais fundo na lista, mais pontos
(`pontos = posição`: o 95º vale 95, o 20º vale 20; um item **fora da lista vale 0**). Jogamos em rodadas até
alguém cravar algo muito alto (95+), quando a partida pode ser encerrada ("concede").

> Projeto **real**, não protótipo: backend de tempo real de verdade (Socket.IO), sem
> multiplayer simulado e sem dados falsos.

---

## Como rodar localmente

Pré-requisito: **Node.js 20+** (baixe em <https://nodejs.org>).

```bash
# 1) instalar dependências (só na primeira vez)
npm install

# 2) subir o servidor
npm start
```

Abra <http://localhost:3000> no navegador. Para testar o multiplayer de verdade, abra a
mesma URL em **outras abas / outros dispositivos** na mesma rede (veja `docs/guias/rodar-local.md`).

Modo de desenvolvimento (reinicia sozinho ao salvar):

```bash
npm run dev
```

> Este repositório recomeçou em 04/10/2026, quando ficou público. O histórico anterior
> (PRs #1 a #31 citados no CHANGELOG e no devlog) está no repositório privado
> `top100-historico`. Ver ADR-0013.

### Jogar agora

**https://jvhubert.github.io/top100/** — abra no celular e use "Adicionar à tela inicial" para instalar como app (funciona sem internet). O site é publicado sozinho a cada merge na `main` (ADR-0013).

### Jogar num celular sem servidor (arquivo)

```bash
npm run celular
```

Gera `dist/top100-celular.html`: um arquivo só, com o modo passa-o-celular, as fontes e a
lista embutidas. Mande para o celular (WhatsApp, e-mail) e abra no Chrome. Funciona sem
internet.

---

## Modos de jogo

- **Online (sala):** um jogador cria a sala e recebe um **código**; os amigos entram pelo
  código, escolhem nome + avatar, e o host inicia a partida. Estado compartilhado em
  tempo real via WebSocket.
- **Offline (mesmo aparelho):** passa-o-celular. Todos escrevem na mesma tela, um de cada
  vez, e no fim revelamos tudo junto. É o que abre em `/` (escolha do modo → jogadores → categoria). O online fica em `/online` (em reformulação).

---

## Estrutura do projeto

```
top100/
├─ src/                      # backend (Node + Express + Socket.IO)
│  ├─ server.js              # HTTP + Socket.IO: sessão, rate limit, segurança
│  ├─ game.js                # regras do modo online (sala, rodada, revelação)
│  ├─ matcher.js             # reconhecimento de títulos (PT/EN, erro de digitação)
│  ├─ offline-rules.js       # regras do modo offline (rodam no navegador)
│  ├─ matching.js            # adaptador do matcher para o modo offline
│  ├─ categories.js          # registro de categorias
│  └─ data/categories/       # snapshots das listas em JSON (ex.: IMDb)
├─ public/                   # frontend estático (sem build step)
│  ├─ online.html, app.js, style.css        # modo online (/online)
│  └─ offline.html, offline.js, styles.css  # modo offline (passa-o-celular)
├─ docs/                     # documentação (arquitetura, ADRs, guias)
├─ devlog/                   # diário de bordo das sessões de trabalho
├─ CHANGELOG.md              # o que mudou, por versão (Keep a Changelog)
├─ STATUS.md                 # estado atual do projeto (briefing rápido)
├─ ROADMAP.md                # próximos passos
└─ CLAUDE.md                 # contexto para o Claude Code
```

---

## Documentação

- **Como trabalhar no projeto:** [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- **Estado atual / novidades:** [`STATUS.md`](./STATUS.md) e [`CHANGELOG.md`](./CHANGELOG.md)
- **Decisões de arquitetura:** [`docs/adr/`](./docs/adr/)
- **Arquitetura e dados:** [`docs/arquitetura.md`](./docs/arquitetura.md), [`docs/categorias.md`](./docs/categorias.md)
- **Guias:** [rodar local](./docs/guias/rodar-local.md), [**subir no GitHub**](./docs/guias/subir-no-github.md), [**entrar no projeto (parceiro)**](./docs/guias/entrar-no-projeto.md), [deploy](./docs/guias/deploy.md)
- **Scripts de conveniência (Windows):** [`ferramentas/`](./ferramentas/) — instalação e execução em um clique
