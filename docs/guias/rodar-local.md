# Rodando localmente

## Pré-requisitos

- **Node.js 20 ou superior** — baixe em <https://nodejs.org> (instale a versão LTS).
- Confirme no terminal:

```bash
node --version
npm --version
```

## Passos

```bash
# na pasta do projeto
npm install     # só na primeira vez (baixa express e socket.io)
npm start       # sobe o servidor
```

Você verá algo como:

```
  🎬  Top 100
      Local:   http://localhost:3000
      Rede:    http://192.168.x.x:3000   (amigos na mesma rede)
```

Abra <http://localhost:3000>.

## Testando o multiplayer de verdade

### Na mesma máquina (jeito mais rápido)

1. Abra <http://localhost:3000> em uma aba, crie a sala (digite nome, escolha avatar, "Criar sala").
2. Copie o **código** mostrado no lobby.
3. Abra uma **segunda aba anônima** (ou outro navegador), entre com o mesmo código.
4. Vote: o host clica em **Começar partida**.
5. Cada aba escreve um filme e envia. Quando todos enviarem, o reveal acontece sozinho.

### Em celulares / outros PCs na mesma rede

1. Descubra o IP da máquina que roda o servidor (aparece no console ao iniciar, ou
   `ipconfig` no Windows).
2. Nos outros aparelhos, acesse `http://SEU-IP:3000` (ex.: `http://192.168.0.12:3000`).
3. Se não abrir, libere a porta 3000 no **Firewall do Windows** (permitir Node.js em redes
   privadas) e confirme que todos estão no mesmo Wi-Fi.

> Sem internet para os amigos de fora? Use um túnel rápido (ex.: `npx localtunnel --port 3000`
> ou `ngrok http 3000`) — veja `deploy.md`.

## Modo desenvolvedor

```bash
npm run dev     # reinicia sozinho quando você salva um arquivo (node --watch)
```

## Testes

```bash
npm test        # roda os testes das regras (node --test)
```

## Modo offline (passa-o-aparelho)

Acesse <http://localhost:3000/offline.html> — não precisa de outra pessoa nem de rede;
todos jogam no mesmo celular/navegador, um de cada vez.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `npm` não é reconhecido | Node não instalado / PATH | Reinstale o Node e reabra o terminal |
| Página não abre | porta ocupada | use `set PORT=4000 && npm start` (Windows) |
| Celular não conecta | firewall/rede diferente | libere a porta 3000, use o mesmo Wi-Fi |
| Sala "não encontrada" | código errado | código tem 4 caracteres, sem I/O/0/1 |
