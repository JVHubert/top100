# Deploy

O app é um servidor Node único que serve o frontend estático e o Socket.IO. Qualquer
host que rode Node com suporte a **WebSocket** funciona. Requisitos: Node 20+, porta via
`PORT`, e **stickiness de conexão** (WebSocket não gosta de balanceadores sem sticky
session).

> Estado é em memória. **Rode uma única instância** enquanto não houver Redis/pub-sub.

## Opção A — Render (mais simples)

1. Suba o repositório no GitHub.
2. No Render: **New → Web Service**, conecte o repo.
3. Build: `npm install` · Start: `npm start` · Health check: `/api/health`.
4. Deploy. A URL pública já funciona com WebSocket.

## Opção B — Railway

1. **New Project → Deploy from GitHub**.
2. O `npm start` é detectado automaticamente.
3. Gere um domínio público em Settings → Networking.

## Opção C — Fly.io

```bash
fly launch          # cria o app; aceite gerar Dockerfile
fly deploy
```

## Opção D — VPS própria (Node + pm2 + Nginx)

```bash
git clone <repo> && cd top100
npm ci --omit=dev
pm2 start src/server.js --name top100
```

Nginx como proxy (essencial para WebSocket):

```nginx
server {
  listen 80;
  server_name seu-dominio.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## Testar com os amigos AGORA (antes de qualquer deploy)

Sem hospedagem, dá para expor a sua máquina com um túnel:

```bash
npx localtunnel --port 3000
# ou, com ngrok instalado:
ngrok http 3000
```

Compartilhe a URL gerada. **Só funciona enquanto a sua máquina estiver ligada.** Use só
para testes.

## Checklist antes de publicar

- [ ] `CHANGELOG.md` atualizado e versão em `package.json` batendo
- [ ] `npm test` passando
- [ ] `/api/health` respondendo
- [ ] WebSocket conectando (não só HTTP)
- [ ] Nenhum segredo commitado (`.env` no `.gitignore`)
- [ ] Teste real: duas pessoas em redes diferentes jogando uma rodada
