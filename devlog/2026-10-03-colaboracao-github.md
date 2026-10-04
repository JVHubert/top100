# 2026-10-03 — Colaboração no GitHub (publicação + política de review)

**Quem trabalhou:** JVHubert (sessão solo, com assistente de IA)
**Duração aproximada:** 2 h
**Ferramenta de IA usada:** assistente de DeepSeek para desenhar o processo; Claude Code
fica para a implementação em dupla.

## Objetivo da sessão

Tirar o projeto do "só existe no meu PC": publicar num repositório privado no GitHub e
fechar um processo de colaboração que **não dependa do parceiro estar online**.

## O que foi feito

- Instalado o **GitHub CLI** (`gh`) e autenticada a conta `JVHubert`.
- Identidade do Git configurada (nome + e-mail **noreply** do GitHub) e o autor do commit
  inicial corrigido.
- Publicado o repositório **privado** <https://github.com/JVHubert/top100>; a `main` já
  rastreia `origin/main`.
- Criado o guia [`docs/guias/subir-no-github.md`](../docs/guias/subir-no-github.md):
  passo a passo para iniciante (instalar, autenticar, clonar, subir, abrir PR) e uma
  tabela de erros comuns.
- `README.md` e `CONTRIBUTING.md` passaram a apontar para o guia.
- Política de review reescrita em `CONTRIBUTING.md`: **PR é registro, não porteira**.

## Decisões tomadas

- **ADR-0005** — Review de Pull Request é **opcional e não bloqueante**; a `main` exige
  Pull Request, mas **não** exige aprovação de terceiros.
- E-mail dos commits usa o endereço **noreply** do GitHub
  (`321052784+JVHubert@users.noreply.github.com`) para não expor e-mail pessoal.

## Arquivos principais alterados

- `docs/guias/subir-no-github.md` — novo guia de publicação/clonagem.
- `CONTRIBUTING.md` — seção "Revisão de PR: opcional, nunca bloqueante"; SLA ajustado;
  linguagem de "playtest" trocada por "teste funcional".
- `README.md` — links de documentação atualizados.
- `CHANGELOG.md`, `STATUS.md`, `docs/adr/0005-...` — este estado.

## Continuação (ainda na mesma sessão)

- Merge do **PR #1** (squash): a `main` passou a ter o guia de publicação e a política
  de review não bloqueante.
- Criado [`docs/guias/entrar-no-projeto.md`](../docs/guias/entrar-no-projeto.md): o
  onboarding do **parceiro** — o que *ele* roda na máquina dele (aceitar convite, clonar,
  rodar, fluxo diário, regras de convivência, como acompanhar mudanças sem reunião e o
  que fazer com uma versão antiga do jogo).
- `README.md` e `subir-no-github.md` passaram a apontar para o novo guia.
- Corrigido um erro no rascunho do guia novo: a porta padrão é `PORT || 3000`
  (`src/server.js`); o `3311` que apareceu no terminal era só do teste de integração.
- Criados os scripts de instalação em um clique para Windows (`ferramentas/`):
  `instalar-top100.cmd`, `jogar-top100.cmd` e `login-github.cmd`. A ideia é que o parceiro
  não precise digitar comando nenhum — ele recebe dois arquivos, dá dois cliques e pronto.
- Os scripts foram **validados de verdade** num sandbox em `C:\AI\_teste_artur`: clone
  real do repositório privado, `npm install`, 14/14 testes, servidor respondendo
  **HTTP 200** em `http://localhost:3000`, e o caminho "pasta já existe → `git pull`"
  também. O sandbox e os logs foram removidos depois.
- Aprendido na prática: a API do GitHub **não** convida colaborador por e-mail.
  `PUT /repos/{owner}/{repo}/collaborators/{username}` devolve **404** com um e-mail e
  **200** com um login existente (testado com `torvalds` — convite criado e cancelado).
  Convidar por e-mail só pela interface web em `Settings → Collaborators`.

## Pendências / próximo passo

- [ ] Ativar a proteção da `main` no GitHub (seção 4.1 do guia) — exige PR, **sem** aprovação.
- [ ] Convidar o Zambelli como colaborador (falta o nome de usuário do GitHub dele).
- [ ] Comparar esta versão com a que existe na máquina do Zambelli e consolidar a melhor.
- [ ] Testes automatizados de `matching.js` (apelidos e casos de borda).

## Atrito / o que doeu

- `gh` não estava instalado — resolvido com `winget install --id GitHub.cli -e`.
- Caminho com espaço (`C:\Program Files\GitHub CLI\gh.exe`) quebra quando não está entre
  aspas; virou linha na tabela de erros do guia.
- O terminal do VS Code não recarrega o PATH sozinho: depois de instalar o `gh` é preciso
  **fechar e reabrir**.
