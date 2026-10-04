# Guia: subir o projeto no GitHub (passo a passo para iniciante)

> Feito para **duas pessoas, cada uma na sua casa**. Siga de cima para baixo.
> Só precisa ser feito **uma vez** na vida do projeto (na primeira máquina).
> A outra pessoa só faz a parte de **clonar** (seção 5).

---

## 0. Antes de começar

Você precisa de:

- Uma conta no **GitHub** (grátis): <https://github.com/signup>
- O **Git** instalado: <https://git-scm.com/download/win> (marque "Git from the command line")
- Anotado em algum lugar: **seu nome** e **seu e-mail** (de preferência o mesmo do GitHub)

Para conferir se o Git está instalado, abra o **PowerShell** e rode:

```powershell
git --version
```

Deve aparecer algo como `git version 2.55.0`. Se der erro, reinstale o Git e **feche e reabra** o VS Code.

---

## 1. Dizer ao Git quem você é (uma vez por máquina)

Isso assina seus commits. Troque pelos **seus** dados:

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Configurações de conforto (recomendadas nos dois PCs):

```powershell
git config --global pull.rebase true
git config --global fetch.prune true
git config --global rerere.enabled true
git config --global push.autoSetupRemote true
```

---

## 2. Escolher o caminho: GitHub CLI (fácil) ou site (manual)

### Caminho A — GitHub CLI (`gh`) — recomendado

Instale (uma vez):

```powershell
winget install --id GitHub.cli -e
```

**Feche e reabra o VS Code / PowerShell** (para o comando `gh` aparecer no PATH) e confira:

```powershell
gh --version
```

Faça login (vai abrir o navegador; siga as instruções e cole o código que aparecer):

```powershell
gh auth login
```

Depois, de dentro da pasta do projeto, **crie o repositório e já suba o código de uma vez**:

```powershell
cd C:\AI\top100
gh repo create top100 --private --source=. --remote=origin --push
```

Pronto — pule para a seção 4.

---

### Caminho B — Pelo site do GitHub (sem instalar nada)

1. Abra <https://github.com/new>
2. **Repository name:** `top100`
3. Marque **Private**
4. **NÃO** marque "Add a README file" nem ".gitignore" nem "license"
   (senão dá conflito com o que já existe na sua máquina)
5. Clique em **Create repository**
6. Copie a URL que aparece (algo como `https://github.com/SEU-USUARIO/top100.git`)

Agora, no PowerShell, dentro da pasta do projeto:

```powershell
cd C:\AI\top100
git remote add origin https://github.com/SEU-USUARIO/top100.git
git push -u origin main
```

Na primeira vez, vai abrir uma janela do navegador pedindo para **entrar no GitHub**
(Git Credential Manager). Autorize e pronto.

---

## 3. (Se algo der errado) conferir e corrigir o remote

Ver qual remote está configurado:

```powershell
git remote -v
```

Se estiver errado, troque:

```powershell
git remote set-url origin https://github.com/USUARIO-CERTO/top100.git
```

Se o remote **não existir** e você já tiver feito commit:

```powershell
git remote add origin https://github.com/SEU-USUARIO/top100.git
git push -u origin main
```

---

## 4. Adicionar o parceiro como colaborador

No site do GitHub, dentro do repositório:

**Settings** → **Collaborators** → **Add people** → digite o **usuário do GitHub** do parceiro.

Ele vai receber um convite por e-mail. Aceitando, ganha permissão de escrita (push).

> **O convite não bloqueia ninguém.** Você continua trabalhando normalmente enquanto ele
> não aceita. Quem *não* é colaborador simplesmente não consegue dar `push` — só isso.

### 4.1 Proteger a `main` (recomendado) — mas **sem exigir aprovação**

**Settings** → **Branches** → **Add branch protection rule**:

- **Branch name pattern:** `main`
- ✅ **Require a pull request before merging**
- ❌ **Require approvals** → deixe **DESMARCADO** (ou 0 aprovações)
- ❌ **Require review from Code Owners** → desmarcado
- ✅ (futuro) **Require status checks to pass** → só depois de termos CI configurado

> **Por que não exigir aprovação?** Se marcar "Require approvals", o GitHub **bloqueia o
> merge** até outra pessoa aprovar. Como vocês trabalham em ritmos diferentes, isso deixaria
> quem está com tempo livre travado esperando o outro voltar do fim de semana.
>
> Assim você mantém o histórico bonito (tudo entra via Pull Request) **sem depender de
> ninguém estar online**. Se quiser o olhar do parceiro, comente o link do PR no WhatsApp.

---

## 5. Na segunda máquina (o parceiro): só clonar

```powershell
cd C:\AI
git clone https://github.com/DONO-DO-REPO/top100.git
cd top100
npm install
npm start
```

> Se o repositório for **privado**, o Git vai pedir para autenticar (abre o navegador).

**O parceiro tem um guia só dele**, mais completo e pronto para copiar e colar:
[`entrar-no-projeto.md`](./entrar-no-projeto.md). Mande esse link para ele.

---

## 6. O fluxo do dia a dia (repetir sempre)

```powershell
# 1) atualizar a main com o que o outro publicou
git switch main
git pull

# 2) criar uma branch para a sua tarefa
git switch -c feat/minha-tarefa

# 3) trabalhar... depois salvar
git add -A
git commit -m "feat(escopo): descrição curta"

# 4) subir a branch
git push -u origin feat/minha-tarefa

# 5) abrir o Pull Request (PR)
gh pr create --fill          # com o GitHub CLI
#   ...ou pelo site, no link que o push mostra no terminal

# 6) depois do merge, limpar
git switch main
git pull
git branch -d feat/minha-tarefa
```

> Não quer esperar ninguém? Com o GitHub CLI, dá para aprovar e juntar o seu próprio PR
> em um comando: `gh pr merge --squash --delete-branch`

**Regras de ouro**

- A `main` **sempre** tem que funcionar.
- Branch vive **menos de 24h**.
- Nunca `git push --force`. Deu ruim? `git revert` (desfaz "para frente").
- PR pequeno (~400 linhas).
- Review do parceiro é **opcional** — não trave esperando alguém ficar online.

---

## 7. Erros mais comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `'git' não é reconhecido` | Git não está no PATH | Reinstalar Git e reabrir o terminal/VS Code |
| `'gh' não é reconhecido` | gh instalado mas terminal antigo | Fechar e reabrir o VS Code |
| `failed to push some refs` | Remote tem commits que você não tem | `git pull --rebase` e depois `git push` |
| `remote origin already exists` | Já existe um remote | `git remote set-url origin <URL>` |
| `Permission denied (publickey)` / pede senha | Autenticação | Use o login do navegador (Credential Manager) ou `gh auth login` |
| `src refspec main does not match any` | Não existe commit ainda | `git add -A && git commit -m "chore: commit inicial"` |
| `O termo 'C:\Program' não é reconhecido` | Caminho com **espaço** e sem aspas | Chame só `gh` (já está no PATH) ou use `& "C:\Program Files\GitHub CLI\gh.exe"` |

---

## 8. Referências

- Git rápido: <https://git-scm.com/book/pt-br/v2>
- GitHub Flow: <https://docs.github.com/pt/get-started/using-github/github-flow>
- GitHub CLI: <https://cli.github.com/manual/>
