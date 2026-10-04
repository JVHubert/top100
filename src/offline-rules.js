// Regras do modo offline (passa-o-celular). Puro (sem I/O, sem sockets): recebe e muta um
// objeto de sala. Roda no navegador; o reconhecimento de titulos e o mesmo do online.

import { matchAnswer } from './matching.js';
import { pointsFor } from './scoring.js';

export const DEFAULT_ROUND_SECONDS = 30;
export const CONCEDE_THRESHOLD = 95; // a partir daqui oferecemos o "concede"
export const MAX_PLAYERS = 12;

export function makeRoom({ code, hostId, categoryId, roundSeconds = DEFAULT_ROUND_SECONDS }) {
  return {
    code,
    hostId,
    categoryId,
    roundSeconds,
    phase: 'lobby', // lobby | round | reveal | ended
    players: [], // { id, name, avatar, connected, score }
    round: null, // { number, endsAt, answers: {playerId: entry}, order: [] }
    roundNumber: 0,
    lastReveal: null,
    history: [], // uma entrada por rodada revelada
    used: [], // filmes ja revelados na partida ("queimados"): { pos, pt, title }
    ratings: { up: 0, down: 0 },
    concedeOffered: false,
    createdAt: Date.now(),
  };
}

function uniqueName(room, base) {
  let name = base;
  let i = 2;
  while (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    name = `${base} (${i++})`;
  }
  return name;
}

export function addPlayer(room, { id, name, avatar, color }) {
  if (room.phase !== 'lobby') return { ok: false, reason: 'in-progress' };
  if (room.players.length >= MAX_PLAYERS) return { ok: false, reason: 'full' };

  const clean = String(name || '').trim().slice(0, 20) || 'Jogador';
  const player = {
    id,
    name: uniqueName(room, clean),
    avatar: avatar || '🙂',
    color: color || '#FFC93C',
    connected: true,
    best: null, // melhor chute da partida: { pos, pt }
    score: 0,
  };
  room.players.push(player);
  return { ok: true, player };
}

export function setConnected(room, id, connected) {
  const p = room.players.find((x) => x.id === id);
  if (p) p.connected = connected;
  return p;
}

export function removePlayer(room, id) {
  const before = room.players.length;
  room.players = room.players.filter((p) => p.id !== id);
  if (room.hostId === id && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }
  return room.players.length !== before;
}

export function activePlayerIds(room) {
  return room.players.filter((p) => p.connected).map((p) => p.id);
}

export function allSubmitted(room) {
  const active = activePlayerIds(room);
  return active.length > 0 && active.every((id) => room.round?.answers[id]);
}

export function startRound(room) {
  room.roundNumber += 1;
  room.phase = 'round';
  room.concedeOffered = false;
  room.lastReveal = null;
  room.round = {
    number: room.roundNumber,
    startedAt: Date.now(),
    endsAt: Date.now() + room.roundSeconds * 1000,
    answers: {},
    order: [],
  };
  return room.round;
}

export function submitAnswer(room, category, playerId, text) {
  if (room.phase !== 'round' || !room.round) return { ok: false, reason: 'not-in-round' };
  if (room.round.answers[playerId]) return { ok: false, reason: 'already-answered' };

  const raw = String(text ?? '').trim().slice(0, 60);
  if (!raw) return { ok: false, reason: 'empty' };

  const { status, item } = matchAnswer(category, raw);
  // Nome que serve para mais de um item: pede para especificar, sem gastar a vez.
  if (status === 'ambiguous') return { ok: false, reason: 'ambiguous' };
  if (status === 'hit' && room.used.some((u) => u.pos === item.pos)) {
    return { ok: false, reason: 'burned', item };
  }
  const hit = status === 'hit';
  const entry = {
    playerId,
    text: raw,
    status, // hit | ambiguous | miss
    pos: hit ? item.pos : null,
    title: hit ? item.title : null,
    pt: hit ? item.pt || item.title : null,
    year: hit ? item.year ?? null : null,
    detail: hit ? item.detail ?? null : null,
    matched: hit ? item.pt || item.title : null,
    rank: hit ? item.pos : null,
    points: hit ? pointsFor(item.pos) : 0, // quadratico (scoring.js); fora da lista = 0
  };
  room.round.answers[playerId] = entry;
  room.round.order.push(playerId);
  return { ok: true, entry };
}

export function revealRound(room) {
  if (room.phase !== 'round' || !room.round) return null;

  room.phase = 'reveal';
  const results = room.players.map((p) => {
    const a = room.round.answers[p.id];
    return {
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      text: a ? a.text : null,
      status: a ? a.status : 'no_answer',
      pos: a ? a.pos : null,
      title: a ? a.title : null,
      pt: a ? a.pt : null,
      year: a ? a.year : null,
      detail: a ? a.detail : null,
      matched: a ? a.matched : null,
      rank: a ? a.rank : null,
      points: a ? a.points : 0,
      noAnswer: !a,
    };
  });

  for (const r of results) {
    const p = room.players.find((x) => x.id === r.playerId);
    if (!p) continue;
    // melhor palpite ANTES desta rodada: fica marcado no painel até ser superado
    r.prevBest = p.best ? { ...p.best } : null;
    p.score += r.points;
    if (r.status === 'hit' && (!p.best || r.pos > p.best.pos)) p.best = { pos: r.pos, pt: r.pt };
    if (r.status === 'hit' && !room.used.some((u) => u.pos === r.pos)) {
      room.used.push({ pos: r.pos, pt: r.pt, title: r.title });
    }
  }
  room.used.sort((a, b) => a.pos - b.pos);

  // melhor POSICAO da rodada (os pontos sao quadraticos; o aviso de 95+ olha a posicao)
  const best = results.reduce((m, r) => (r.status === 'hit' ? Math.max(m, r.pos) : m), 0);
  room.concedeOffered = best >= CONCEDE_THRESHOLD;
  const top = results.filter((r) => r.status === 'hit').sort((a, b) => b.pos - a.pos)[0];
  const jackpot = top && top.pos >= CONCEDE_THRESHOLD ? { playerId: top.playerId, name: top.name, pos: top.pos, pt: top.pt } : null;

  room.lastReveal = { number: room.round.number, results, best, jackpot };
  room.history.push({ number: room.round.number, results });
  room.round = null;
  return room.lastReveal;
}

export function ranking(room) {
  return [...room.players]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, i) => ({
      position: i + 1,
      id: p.id,
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      score: p.score,
      best: p.best,
    }));
}

export function endGame(room) {
  room.phase = 'ended';
  room.round = null;
  return ranking(room);
}

/**
 * "Mais um round...": reabre uma partida encerrada mantendo placar e filmes queimados.
 * Pode ser pedido quantas vezes quiserem.
 */
export function oneMoreRound(room) {
  if (room.phase !== 'ended') return null;
  return startRound(room);
}

export function rateCategory(room, value) {
  if (value === 'up') room.ratings.up += 1;
  else if (value === 'down') room.ratings.down += 1;
  return room.ratings;
}

/**
 * Visao do estado especifica de UM jogador. Durante a rodada, as respostas dos outros
 * ficam ocultas: so expomos quem ja respondeu, nunca o texto. Nunca vaze
 * `room.round.answers` num broadcast sem passar por aqui.
 */
export function publicState(room, viewerId) {
  const base = {
    code: room.code,
    hostId: room.hostId,
    categoryId: room.categoryId,
    phase: room.phase,
    roundSeconds: room.roundSeconds,
    roundNumber: room.roundNumber,
    concedeOffered: room.concedeOffered,
    ratings: { ...room.ratings },
    youId: viewerId ?? null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      connected: p.connected,
      score: p.score,
    })),
  };

  if (room.phase === 'round' && room.round) {
    base.round = {
      number: room.round.number,
      endsAt: room.round.endsAt,
      submitted: Object.keys(room.round.answers),
      youAnswered: Boolean(room.round.answers[viewerId]),
      youAnswer: room.round.answers[viewerId]?.text ?? null,
      // permite ao cliente corrigir diferenca de relogio entre navegador e servidor
      serverNow: Date.now(),
    };
  }

  if (room.phase === 'reveal' && room.lastReveal) {
    base.reveal = {
      number: room.lastReveal.number,
      best: room.lastReveal.best,
      results: room.lastReveal.results.map((r) => ({ ...r })),
    };
  }

  if (room.phase === 'ended') {
    base.ranking = ranking(room);
  }

  return base;
}

/**
 * Morte súbita: depois de alguém cravar 95+, uma rodada extra em que só vale superar a
 * posição `targetPos`. Diz se alguém superou (a partida segue) ou não (acabou).
 */
export function suddenDeathResult(reveal, targetPos) {
  const best = reveal.results.reduce((m, r) => (r.status === 'hit' ? Math.max(m, r.pos) : m), 0);
  return { beaten: best > targetPos, best };
}
