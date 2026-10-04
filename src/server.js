// Servidor: HTTP (arquivos estaticos) + Socket.IO (tempo real) + orquestracao das salas.
// As regras ficam em game.js (sem rede); aqui so validamos sessao e repassamos intencoes.

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';

import { listCategories, getCategory, DEFAULT_CATEGORY_ID } from './categories.js';
import { Matcher } from './matcher.js';
import { RoomManager, GameError, LIMITS, AVATARS, COLORS } from './game.js';
import { createRatingsStore, VOTES } from './ratings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const category = getCategory(DEFAULT_CATEGORY_ID);

export function createServer({ logger = console, ratingsFile = path.join(__dirname, '..', 'runtime', 'ratings.json') } = {}) {
  const ratings = createRatingsStore(ratingsFile);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // atrás do proxy do Render/Railway/Fly

  // Cabeçalhos de segurança básicos (sem dependência extra).
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    next();
  });

  app.get('/healthz', (req, res) => res.json({ ok: true, rooms: manager.rooms.size }));

  // Configuração pública consumida pelo front. Repare que a lista de filmes NÃO é exposta.
  app.get('/api/config', (req, res) => {
    res.json({
      avatars: AVATARS,
      colors: COLORS,
      roundSecondsOptions: LIMITS.ROUND_SECONDS_OPTIONS,
      defaultRoundSeconds: LIMITS.DEFAULT_ROUND_SECONDS,
      nameMax: LIMITS.NAME_MAX,
      answerMax: LIMITS.ANSWER_MAX,
      maxPlayers: LIMITS.MAX_PLAYERS,
      category: { name: category.name, snapshotDate: category.snapshot.date, source: category.snapshot.source },
      categories: listCategories(),
    });
  });

  // Modo offline (passa-o-celular): as regras rodam no navegador, entao ele precisa da
  // lista completa. A lista e publica no IMDb de qualquer forma; ver docs/adr/0007.
  app.get('/api/categories', (req, res) => res.json(listCategories()));

  // Avaliação das categorias (👍/👎 no fim da partida). Limite simples por IP contra spam.
  const voteBudget = new Map(); // ip -> { left, resetAt }
  app.get('/api/ratings', (req, res) => res.json(ratings.all()));
  app.post('/api/ratings', express.json({ limit: '1kb' }), (req, res) => {
    const { categoryId, vote } = req.body || {};
    if (!getCategory(categoryId) || !VOTES.includes(vote)) return res.status(400).json({ error: 'Voto inválido.' });
    const now = Date.now();
    let budget = voteBudget.get(req.ip);
    if (!budget || budget.resetAt < now) voteBudget.set(req.ip, (budget = { left: 30, resetAt: now + 10 * 60_000 }));
    if (budget.left-- <= 0) return res.status(429).json({ error: 'Muitos votos seguidos. Tente mais tarde.' });
    res.json({ categoryId, ...ratings.add(categoryId, vote) });
  });
  app.get('/api/categories/:id', (req, res) => {
    const found = getCategory(req.params.id);
    if (!found) return res.status(404).json({ error: 'Categoria nao encontrada.' });
    res.json(found);
  });
  for (const file of ['offline-rules.js', 'matching.js', 'matcher.js', 'look.js', 'category-ui.js', 'scoring.js']) {
    app.get(`/shared/${file}`, (req, res) => res.sendFile(path.join(__dirname, file)));
  }

  // Início: o jogo num celular só (escolha do modo -> jogadores -> categoria). O online fica
  // em /online; convites antigos (/?sala=ABCD) continuam funcionando.
  app.get('/', (req, res) => {
    const code = typeof req.query.sala === 'string' ? req.query.sala.replace(/[^A-Za-z]/g, '').slice(0, 4) : '';
    if (code) return res.redirect(302, `/online?sala=${encodeURIComponent(code)}`);
    res.sendFile(path.join(__dirname, '..', 'public', 'offline.html'));
  });

  app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'], maxAge: '1h', index: false }));

  const server = http.createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 10_000, // nenhuma mensagem legítima passa disso
    pingInterval: 10_000,
    pingTimeout: 8_000,
  });

  // roomCode -> Map(playerId -> socketId)
  const sockets = new Map();

  // Agrupa várias mudanças no mesmo tick em um único envio por sala.
  const pending = new Set();
  function broadcast(room) {
    if (pending.has(room.code)) return;
    pending.add(room.code);
    setImmediate(() => {
      pending.delete(room.code);
      const map = sockets.get(room.code);
      if (!map) return;
      for (const [playerId, socketId] of map) {
        if (!room.players.has(playerId)) {
          map.delete(playerId);
          continue;
        }
        io.to(socketId).emit('state', room.viewFor(playerId));
      }
    });
  }

  // Um matcher por categoria, criado na primeira vez que alguma sala usa a categoria.
  const matchers = new Map();
  function catalog(id) {
    const found = getCategory(id);
    if (!found) return null;
    if (!matchers.has(id)) matchers.set(id, new Matcher(found.items, found.match));
    return { category: found, matcher: matchers.get(id) };
  }
  const manager = new RoomManager({ ...catalog(DEFAULT_CATEGORY_ID), catalog, onChange: broadcast });

  function bind(socket, room, player) {
    let map = sockets.get(room.code);
    if (!map) sockets.set(room.code, (map = new Map()));
    const previous = map.get(player.id);
    if (previous && previous !== socket.id) {
      // Mesma sessão aberta em outra aba/aparelho: a mais recente assume.
      const old = io.sockets.sockets.get(previous);
      if (old) {
        old.data.session = null;
        old.emit('kicked', { message: 'Você abriu o jogo em outra aba.' });
        old.disconnect(true);
      }
    }
    map.set(player.id, socket.id);
    socket.data.session = { code: room.code, playerId: player.id };
    socket.join(`room:${room.code}`);
  }

  function unbind(socket) {
    const s = socket.data.session;
    if (!s) return null;
    socket.data.session = null;
    const map = sockets.get(s.code);
    if (map && map.get(s.playerId) === socket.id) map.delete(s.playerId);
    socket.leave(`room:${s.code}`);
    return s;
  }

  function currentRoom(socket) {
    const s = socket.data.session;
    if (!s) throw new GameError('Você não está em nenhuma sala.');
    const room = manager.get(s.code);
    if (!room || !room.players.has(s.playerId)) throw new GameError('Essa sala não existe mais.');
    return { room, playerId: s.playerId };
  }

  io.on('connection', (socket) => {
    // Rate limit simples por conexão: 40 eventos a cada 10s.
    let bucket = 40;
    const refill = setInterval(() => (bucket = 40), 10_000);
    refill.unref?.();

    function on(event, handler) {
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (--bucket < 0) return reply({ ok: false, error: 'Calma! Muitas ações em pouco tempo.' });
        try {
          const data = handler(payload && typeof payload === 'object' ? payload : {});
          reply({ ok: true, ...(data || {}) });
        } catch (err) {
          if (err instanceof GameError) return reply({ ok: false, error: err.message });
          logger.error(`[${event}]`, err);
          reply({ ok: false, error: 'Algo deu errado no servidor.' });
        }
      });
    }

    on('room:create', ({ name, avatar, color }) => {
      if (socket.data.session) leave();
      const room = manager.create();
      let player;
      try {
        player = room.addPlayer({ name, avatar, color });
      } catch (err) {
        manager.rooms.delete(room.code);
        room.dispose();
        throw err;
      }
      bind(socket, room, player);
      broadcast(room);
      return { code: room.code, playerId: player.id, token: player.token };
    });

    on('room:join', ({ code, name, avatar, color }) => {
      const room = manager.get(code);
      if (!room) throw new GameError('Não achei essa sala. Confira o código.');
      if (socket.data.session) leave();
      const player = room.addPlayer({ name, avatar, color });
      bind(socket, room, player);
      broadcast(room);
      return { code: room.code, playerId: player.id, token: player.token };
    });

    on('room:resume', ({ code, playerId, token }) => {
      const room = manager.get(code);
      if (!room) throw new GameError('Essa sala não existe mais.');
      const player = room.resume(playerId, token);
      bind(socket, room, player);
      broadcast(room);
      return { code: room.code, playerId: player.id };
    });

    on('room:settings', ({ roundSeconds, categoryId }) => {
      const { room, playerId } = currentRoom(socket);
      room.updateSettings(playerId, {
        roundSeconds: roundSeconds === undefined ? undefined : Number(roundSeconds),
        categoryId,
      });
    });

    on('game:start', () => {
      const { room, playerId } = currentRoom(socket);
      room.startMatch(playerId);
    });

    on('round:submit', ({ text }) => {
      const { room, playerId } = currentRoom(socket);
      return room.submitAnswer(playerId, text);
    });

    on('round:next', () => {
      const { room, playerId } = currentRoom(socket);
      room.nextRound(playerId);
    });

    on('game:end', () => {
      const { room, playerId } = currentRoom(socket);
      room.endMatch(playerId);
    });

    on('game:restart', () => {
      const { room, playerId } = currentRoom(socket);
      room.restart(playerId);
    });

    function leave() {
      const s = unbind(socket);
      if (!s) return;
      const room = manager.get(s.code);
      if (room) room.removePlayer(s.playerId);
    }
    on('room:leave', () => leave());

    socket.on('disconnect', () => {
      clearInterval(refill);
      const s = unbind(socket);
      if (!s) return;
      const room = manager.get(s.code);
      if (room) room.markDisconnected(s.playerId);
    });
  });

  const sweeper = setInterval(() => {
    const removed = manager.sweep();
    if (removed) {
      for (const code of [...sockets.keys()]) if (!manager.rooms.has(code)) sockets.delete(code);
      logger.log(`[sweep] ${removed} sala(s) abandonada(s) removida(s)`);
    }
  }, 60_000);
  sweeper.unref?.();

  return { app, server, io, manager };
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const { server } = createServer();
  server.listen(port, () => {
    console.log('\n  🍿  Top 100');
    console.log(`      Local:   http://localhost:${port}`);
    for (const ip of lanAddresses()) {
      console.log(`      Rede:    http://${ip}:${port}   (amigos na mesma rede)`);
    }
    console.log(`      Categoria: ${category.name} (snapshot de ${category.snapshot.date})\n`);
  });
}
