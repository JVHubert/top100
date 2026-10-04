# Decisões de arquitetura

## Visão geral

```
 Navegador (public/app.js)                 Servidor Node (src/)
 ┌─────────────────────────┐   WebSocket   ┌──────────────────────────────┐
 │ envia intenções:        │ ────────────► │ index.js  (Socket.IO)        │
 │  room:create / join     │               │   valida sessão, rate limit  │
 │  round:submit ...       │               │        │                     │
 │                         │ ◄──────────── │ game.js   (Room)             │
 │ desenha o "state"       │  state por    │   regras + estado em memória │
 │ recebido                │  jogador      │        │                     │
 └─────────────────────────┘               │ matcher.js + data/categories/  │
                                           └──────────────────────────────┘
```

## 1. Node.js + Socket.IO, servidor autoritativo

**Escolha:** um único servidor Node com Express (arquivos estáticos) e Socket.IO (tempo real), na mesma porta.

**Por quê:**
- O jogo tem uma regra que exige servidor confiável: **os chutes precisam ficar escondidos até a revelação**. Em soluções onde o cliente lê o banco diretamente (Firebase/Supabase com assinatura de tabela), é fácil vazar os chutes dos outros pelo DevTools se as regras de acesso não forem perfeitas. Com servidor autoritativo, o cliente simplesmente nunca recebe o que não pode ver.
- A **lista do ranking também fica só no servidor**. O front não tem como "colar" consultando o JSON.
- O cronômetro é do servidor (`endsAt`); o cliente só desenha. Ninguém ganha tempo extra mexendo no relógio local.
- Socket.IO dá reconexão automática, fallback para long-polling em redes que bloqueiam WebSocket e acknowledgements (cada ação recebe `{ ok, error }`).
- Zero serviço externo: roda com `npm start`, sem conta em lugar nenhum.

**Troca aceita:** estado em memória. Reiniciar o servidor derruba as salas abertas — aceitável para partidas de poucos minutos.

## 2. Estado "por jogador", não broadcast único

`Room.viewFor(playerId)` monta o estado que **aquele** jogador pode ver: durante a rodada ele recebe só `answered: true/false` dos outros e o próprio chute. Na revelação, recebe tudo. Isso custa um `emit` por jogador (máximo 12 por sala), irrelevante em custo e muito mais seguro. Mudanças no mesmo tick são agrupadas (`setImmediate`) para não mandar vários estados seguidos.

O teste `test/e2e.test.js` verifica explicitamente que o texto do chute de um jogador não aparece no estado recebido pelos outros antes da revelação.

## 3. Regras separadas do transporte

`src/game.js` não conhece Socket.IO. Recebe chamadas (`submitAnswer`, `nextRound`…) e avisa via `onChange`. Vantagens: dá para testar as regras sem rede (`test/game.test.js`) e trocar o transporte no futuro (por exemplo, rodar como Discord Activity) sem reescrever o jogo.

Máquina de estados da sala:

```
lobby ──start──► round ──(todos responderam | tempo)──► reveal ──next──► round
  ▲                                                        │
  └──────────────── restart ◄──── final ◄──────end─────────┘
```

## 4. Sessão e reconexão

- Ao entrar, o servidor devolve `playerId` + `token` aleatório (144 bits). O cliente guarda em `sessionStorage` (por aba, para permitir vários jogadores no mesmo navegador durante testes).
- Ao reconectar (F5, queda de rede), o cliente manda `room:resume` com o token; o servidor compara com `timingSafeEqual`.
- Mesma sessão aberta em outra aba: a mais nova assume e a antiga é desconectada com aviso.
- No lobby, quem desconecta tem 20 s de tolerância antes de sair da lista. Durante a partida, o jogador fica (mantém a pontuação), mas a rodada não espera por quem está offline.
- Se o host cair, o jogador conectado mais antigo vira host.

## 5. Reconhecimento de títulos

Texto livre é mais divertido que múltipla escolha (e uma lista de sugestões entregaria quais filmes estão no ranking). O custo é interpretar o que as pessoas digitam. `src/matcher.js`:

1. Normaliza: minúsculas, sem acento, sem pontuação, sem artigos/preposições (PT e EN), romanos e números por extenso viram dígitos ("Parte II" = "Parte Dois" = "2").
2. Compara com título original, título brasileiro e apelidos cadastrados.
3. Aceita erro de digitação leve (similaridade ≥ 0,8), **mas só entre títulos com os mesmos números** — sequências nunca se confundem.
4. Aceita correspondência parcial ("Pulp Fiction Tempo de Violência") quando aponta para um único filme e tem pelo menos 2 palavras; se aponta para vários ("Vingadores"), o chute é marcado como **ambíguo** e vale zero, com explicação na revelação.

Decisão importante: o resultado do reconhecimento **não** é mostrado na hora do envio, só na revelação. Mostrar "ambíguo" ou "não reconhecido" ao enviar vazaria informação sobre a lista.

Única exceção deliberada: se o filme já saiu numa rodada anterior, o envio é recusado na hora (essa informação já é pública).

## 5b. Modo offline (passa-o-celular)

`/` (e `/offline`) roda 100% no navegador, com as regras de `src/offline-rules.js` e o mesmo
`src/matcher.js` do servidor (servidos em `/shared/`). Por isso a lista completa fica
acessível em `GET /api/categories/:id`: é o preço do modo offline (ver ADR-0007).

## 6. Front sem build step

HTML + CSS + JS puro, servido estaticamente. Motivos: rodar com `npm start` sem toolchain, carregamento rápido no celular, e o escopo (5 telas) não pede framework. Todo texto vindo de jogadores entra via `textContent` (sem `innerHTML`), o que elimina XSS por nome ou chute.

## 7. Segurança e abuso (proporcional a um jogo casual)

- Validação no servidor de tudo que chega: nome (1–16 caracteres, sem caracteres de controle, único na sala), personagem e cor de uma lista fechada, chute até 80 caracteres, tempo de rodada de uma lista fechada.
- Rate limit por conexão (40 eventos / 10 s) e `maxHttpBufferSize` de 10 kB.
- Cabeçalhos: CSP restritiva (scripts só do próprio domínio), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.
- Códigos de sala sem I/O para não confundir quem lê em voz alta. Com 4 letras há ~330 mil combinações; como as salas duram minutos e não guardam nada sensível, adivinhar um código só permite entrar num jogo. Se virar público, aumentar para 5 letras e adicionar "host pode remover jogador".
- Nenhum dado pessoal é armazenado: sem contas, sem banco, nada em disco.
- Faxina automática: salas sem ninguém conectado há 10 min ou com mais de 12 h são removidas.

## 8. Como escalar quando precisar

Hoje: 1 processo aguenta com folga milhares de conexões simultâneas para esse volume de mensagens. Quando precisar de mais de uma instância:

1. **Afinidade por sala:** rotear pelo código da sala (ex.: `fly-replay` no Fly.io, ou um proxy com hash do código) para que todos da mesma sala caiam na mesma instância. É a mudança mais barata, e o código atual funciona sem alteração.
2. **Alternativa:** mover o estado da `Room` para Redis e usar `@socket.io/redis-adapter`. Mais trabalho (timers de rodada viram jobs), só compensa em escala grande.

## 9. Observabilidade

- `GET /healthz` devolve `{ ok, rooms }` para o health check da hospedagem.
- Erros inesperados são logados com o nome do evento; erros de regra (`GameError`) viram mensagens amigáveis para o jogador e não poluem o log.
- Próximo passo: contar eventos de funil (sala criada, partida iniciada, rodadas por partida, partidas por sala). Planos de negócio ficam fora deste repositório público (ver ADR-0013).
