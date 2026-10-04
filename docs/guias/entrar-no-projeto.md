# Guia: entrar no projeto (para o parceiro)

> Você já tem conta no GitHub. Estes são os passos que **você** faz na **sua** máquina.
> Leva uns 15 minutos e só precisa ser feito **uma vez**.
>
> (Se você usa Mac ou Linux, os comandos do Git são idênticos — só troque `C:\projetos`
> por `~/projetos`.)

---

## Caminho rápido: 2 cliques (Windows)

Se o JVHubert te mandou os arquivos **`instalar-top100.cmd`** e **`jogar-top100.cmd`**:

1. Salve os **dois** na mesma pasta (ex.: `Downloads` ou a Área de Trabalho).
2. Dois cliques em **`instalar-top100.cmd`**. Ele:
   - confere se o Git e o Node.js estão instalados;
   - configura seu nome e e-mail no Git;
   - baixa o projeto para `%USERPROFILE%\projetos\top100`;
   - instala as dependências e roda os testes.
3. Para jogar, dois cliques em **`jogar-top100.cmd`** — ele atualiza o projeto, sobe o
   servidor e abre o navegador.

Não precisa editar nem entender nada: se faltar Git ou Node, o próprio script abre a
página de download, explica o passo a passo e você roda ele de novo depois de instalar.

> Os dois arquivos também ficam versionados em [`ferramentas/`](../../ferramentas/) —
> mas você só os enxerga lá **depois** de aceitar o convite e clonar o projeto.
> Se preferir fazer na mão, ou se estiver no Mac/Linux, siga as seções abaixo.

---

## 0. O que você vai precisar

- Sua conta no GitHub
- **Node.js 20 ou mais novo (LTS)** — <https://nodejs.org> (marque para adicionar ao PATH)
- **Git** — <https://git-scm.com/download/win>
- Seu **nome de usuário** do GitHub (ex.: `josedasilva`) — mande para o JVHubert para ele
  te convidar

Confira abrindo o **PowerShell**:

```powershell
git --version
node --version
```

Deu erro em algum? Instale e **feche e reabra** o VS Code (o PATH só recarrega assim).

---

## 1. Aceitar o convite

Você vai receber um e-mail ("*... invited you to collaborate...*") e uma notificação em
<https://github.com/notifications>. **Aceite.**

> Sem aceitar, você não vê o repositório — ele é **privado**.

---

## 2. Clonar o projeto

```powershell
cd C:\
mkdir projetos
cd projetos
git clone https://github.com/JVHubert/top100.git
cd top100
```

Na primeira vez abre uma janela do navegador pedindo para entrar no GitHub (é o
*Git Credential Manager*). Autorize — acontece só uma vez.

---

## 3. Rodar o jogo

```powershell
npm install
npm start
```

Abra <http://localhost:3000>. Para testar com dois jogadores, abra uma **janela anônima**
e entre também por `http://localhost:3000`.

Rodar os testes:

```powershell
npm test
```

Deve aparecer `pass 14`, `fail 0`.

---

## 4. O fluxo do dia a dia (é sempre este)

```powershell
# 1) atualizar a main com o que o outro publicou
git switch main
git pull

# 2) criar a sua branch
git switch -c feat/minha-tarefa

# 3) trabalhar... depois salvar
git add -A
git commit -m "feat(escopo): descrição curta"

# 4) subir a branch
git push -u origin feat/minha-tarefa

# 5) abrir o Pull Request
gh pr create --fill
#   ...ou clique no link que o próprio push mostrou no terminal
```

Depois é só dar **Squash and merge** no Pull Request. A `main` volta a ficar atualizada.

> Não quer esperar ninguém? Você pode aprovar e juntar o **seu próprio** PR:
> `gh pr merge --squash --delete-branch`

---

## 5. Regras de convivência (só cinco)

1. **Nunca commite direto na `main`.** Sempre branch + Pull Request.
2. **A `main` sempre tem que funcionar.** Quebrou? Consertar é prioridade máxima.
3. **`git pull` antes de começar.** Evita quase todo conflito.
4. **Deu ruim? `git revert`.** Nunca `git push --force`.
5. **PR pequeno** (~400 linhas de mudança real).

E o principal: **review é opcional**. Se você estiver online, comente o link no WhatsApp.
Se não, seguimos — ninguém trava esperando o outro (`docs/adr/0005`).

---

## 6. Como saber o que mudou (sem reunião nenhuma)

Leia **nesta ordem**, tudo dentro do repositório:

1. **`STATUS.md`** — a foto do momento: pronto / em andamento / travado. 2 minutos.
2. **`CHANGELOG.md`** — o que mudou.
3. **`docs/adr/`** — por que decidimos assim.
4. **`devlog/`** — o diário de cada sessão (o que ficou pendente).

Quando **você** fizer algo relevante, atualize os mesmos arquivos. É assim que o outro
fica sabendo sem você precisar explicar nada.

---

## 7. Se você já tem uma versão do jogo na sua máquina

**Não sobrescreva a `main`.** Faça assim:

```powershell
git switch -c zambelli/versao-antiga
# copie seus arquivos para dentro da pasta do projeto
git add -A
git commit -m "feat: versao inicial que eu ja tinha"
git push -u origin zambelli/versao-antiga
```

Aí a gente compara as duas versões lado a lado e fica com a melhor.

---

## 8. Deu ruim? Erros comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `'git' não é reconhecido` | Git fora do PATH | Reinstalar e reabrir o VS Code |
| `'npm' não é reconhecido` | Node fora do PATH | Reinstalar o Node (LTS) e reabrir |
| `Repository not found` | Convite não aceito | Aceite em <https://github.com/notifications> |
| `failed to push some refs` | A `main` andou na sua frente | `git pull --rebase` e depois `git push` |
| Pede senha o tempo todo | Credencial não salva | Entre pelo navegador (Credential Manager) |
| `Permission denied` | Você está no repo errado ou sem convite | Confira `git remote -v` |
| `src refspec main does not match any` | Não existe commit ainda | `git add -A && git commit -m "chore: inicial"` |

---

## 9. Referências

- Guia completo de publicação: [`subir-no-github.md`](./subir-no-github.md)
- Como trabalhamos: [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)
- GitHub Flow: <https://docs.github.com/pt/get-started/using-github/github-flow>
