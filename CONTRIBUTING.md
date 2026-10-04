# Como trabalhamos (CONTRIBUTING)

Projeto de **duas pessoas**, assíncrono, cada uma na sua casa. Poucas formalidades —
o objetivo é não pisar no pé do outro e não perder o histórico do que mudou.

> **Primeira vez no projeto?** Siga o guia passo a passo:
> [`docs/guias/subir-no-github.md`](./docs/guias/subir-no-github.md) (instalar, autenticar,
> clonar, subir e abrir o primeiro Pull Request).

## Modelo de Git (GitHub Flow, branches curtas)

1. **`main` está sempre funcionando.** Se quebrar, é prioridade máxima.
2. **Branches vivem menos de 24h.** Começou de manhã, junta antes de fechar o notebook.
3. **Toda mudança passa por Pull Request** — inclusive as suas, trabalhando sozinho.
4. **Merge com squash** (vira 1 commit na `main`).
5. **Nunca reescreva histórico na `main`.** Deu errado? `git revert` (desfaz pra frente),
   nunca `git push --force`.
6. **PR pequeno** (~400 linhas de mudança real no máximo).

### Revisão de PR: opcional, **nunca bloqueante**

Nós dois trabalhamos em ritmos diferentes (na prática, um toca o projeto bem mais que o
outro). Por isso o Pull Request aqui é **registro**, não porteira:

- O PR serve para deixar rastro do *que* mudou e *por quê*. Não é pedido de permissão.
- **Você pode aprovar e juntar o seu próprio PR.** Não fique esperando o outro.
- A `main` **não** tem "required reviewers" ligado. É de propósito: ninguém fica travado
  esperando o parceiro estar online.
- Se o parceiro estiver online, ele comenta. Se não, seguimos em frente e ele lê depois
  — o `CHANGELOG.md` e o `devlog/` contam o que aconteceu.

### Nomes de branch

- `feat/<assunto>` — funcionalidade nova
- `fix/<assunto>` — correção
- `docs/<assunto>` — documentação
- `refactor/<assunto>`, `chore/<assunto>`

## Commits (Conventional Commits)

Formato: `tipo(escopo): descrição`

- `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`
- Ex.: `feat(rodada): ocultar respostas até o timer zerar`

## Passo a passo do dia

```bash
git switch main
git pull                       # traz o que o outro publicou
git switch -c feat/minha-tarefa
# ... trabalha ...
git add -A
git commit -m "feat(escopo): descrição curta"
git push -u origin feat/minha-tarefa
# abre o Pull Request (VS Code ou GitHub) — review é opcional, não bloqueia
```

Depois do merge:

```bash
git switch main
git pull
git branch -d feat/minha-tarefa
```

## Briefing automático (como o outro fica sabendo)

Sem reuniões: **o repositório é o briefing.** Sempre que você fizer algo relevante,
atualize em 3 lugares:

1. `CHANGELOG.md` (seção `[Unreleased]`) — *o que* mudou.
2. `docs/adr/` — *por que* mudou (decisões de arquitetura).
3. `devlog/AAAA-MM-DD.md` — *o que aconteceu na sessão* (o que ficou pendente).

E no topo do `STATUS.md` deixe a foto do momento: o que está pronto, o que está em
andamento, o que travou.

**O aviso é automático:** a cada merge na `main`, o GitHub comenta na issue fixa
**"📣 Novidades da main"** (label `novidades`) com o PR, as linhas novas do `CHANGELOG`
e os arquivos alterados, e manda e-mail para quem está inscrito nela. Por isso o
`CHANGELOG` bem escrito é o que o outro vai ler. Ver `docs/adr/0008`.

## SLA de resposta (combinado)

| Canal | Tempo esperado |
|---|---|
| Comentário em Pull Request | até 1 dia útil — **opcional, não bloqueia o merge** |
| Comentário em doc/ADR | até 2 dias úteis |
| "Estou travado!" | no mesmo dia |

## Rituais

- **Daily escrito** (opcional, quando houver trabalho paralelo): `Ontem / Hoje / Bloqueios`.
- **Nenhuma reunião que poderia virar um documento.**
- **Ligação ocasional** só para testar se o MVP está funcional de ponta a ponta.

## Configuração recomendada do Git (uma vez por máquina)

```bash
git config --global user.name  "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
git config --global pull.rebase true
git config --global fetch.prune true
git config --global rerere.enabled true
git config --global push.autoSetupRemote true
```
