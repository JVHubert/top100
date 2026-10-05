// Regras do modo offline (passa-o-celular). Puro (sem I/O, sem sockets): recebe e muta um
// objeto de sala. Roda no navegador; o reconhecimento de titulos e o mesmo do online.

import { matchAnswer, suggestItems } from './matching.js';
import { pointsFor } from './scoring.js';

export const DEFAULT_ROUND_SECONDS = 30;
export const CONCEDE_THRESHOLD = 95; // a partir daqui oferecemos o "concede"
export const MAX_PLAYERS = 12;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 10;
export const DEFAULT_ROUNDS = 5;

// Tipos de jogo (ADR-0016):
//   classic: cada acerto soma a propria posicao; perto do 100 vale mais.
//   target:  a cada rodada sorteamos um alvo de 1 a 100; quem chegar mais perto vence a
//            rodada e leva 1 ponto. Empate entre os mais perto: ninguem pontua.
export const GAME_MODES = ['classic', 'target'];
export const DEFAULT_GAME_MODE = 'classic';

/** Numero de rodadas valido (1 a 10); qualquer coisa estranha vira o padrao. */
export function clampRounds(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_ROUNDS;
  return Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, n));
}

export function makeRoom({ code, hostId, categoryId, roundSeconds = DEFAULT_ROUND_SECONDS, maxRounds = DEFAULT_ROUNDS, gameMode = DEFAULT_GAME_MODE }) {
  return {
    code,
    hostId,
    categoryId,
    roundSeconds,
    gameMode: GAME_MODES.includes(gameMode) ? gameMode : DEFAULT_GAME_MODE,
    maxRounds: clampRounds(maxRounds), // rodadas combinadas; "Mais um round..." pode passar disso
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

/** `rng` so para testes: devolve [0, 1), como Math.random. */
export function startRound(room, { rng = Math.random } = {}) {
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
    pending: {}, // "qual voce quis dizer?" aberto: { playerId: { text, options: [pos] } }
    target: room.gameMode === 'target' ? 1 + Math.floor(rng() * 100) : null, // alvo da rodada (1 a 100)
  };
  return room.round;
}

/**
 * Registra o chute de um jogador. Com o chute incerto, devolve `reason: 'choose'` e as opcoes
 * parecidas ("Qual voce quis dizer?", ADR-0015). A partir dai a pergunta fica presa: so vale
 * `{ pick: pos }` (uma das opcoes) ou `{ asTyped: true }` (o texto original, sem trocar).
 * Assim ninguem cancela e redigita para sondar a lista.
 */
export function submitAnswer(room, category, playerId, text, { pick = null, asTyped = false } = {}) {
  if (room.phase !== 'round' || !room.round) return { ok: false, reason: 'not-in-round' };
  if (room.round.answers[playerId]) return { ok: false, reason: 'already-answered' };

  const burned = (pos) => room.used.some((u) => u.pos === pos);
  const pending = room.round.pending[playerId];
  let raw;
  let status;
  let item = null;

  if (pending) {
    raw = pending.text;
    if (pick != null) {
      if (!pending.options.includes(pick)) return { ok: false, reason: 'must-choose', options: optionItems(category, pending.options) };
      status = 'hit';
      item = category.items.find((it) => it.pos === pick);
    } else if (asTyped) {
      status = matchAnswer(category, raw).status === 'ambiguous' ? 'ambiguous' : 'miss';
    } else {
      return { ok: false, reason: 'must-choose', options: optionItems(category, pending.options) };
    }
  } else {
    raw = String(text ?? '').trim().slice(0, 60);
    if (!raw) return { ok: false, reason: 'empty' };
    ({ status, item } = matchAnswer(category, raw));
    if (status === 'hit' && burned(item.pos)) return { ok: false, reason: 'burned', item };
    if (status !== 'hit') {
      const found = suggestItems(category, raw, { exclude: room.used.map((u) => u.pos) });
      // Parecidos demais para caber na pergunta: pede o nome completo, sem gastar a vez.
      if (found.tooMany) return { ok: false, reason: 'ambiguous' };
      if (found.items.length) {
        room.round.pending[playerId] = { text: raw, options: found.items.map((it) => it.pos) };
        return { ok: false, reason: 'choose', options: found.items };
      }
      // Ambiguo curto demais para sugerir (ex.: 3 letras): pede o nome completo, como antes.
      if (status === 'ambiguous') return { ok: false, reason: 'ambiguous' };
    }
  }
  delete room.round.pending[playerId];

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
    // classico: = posicao (scoring.js). Alvo: decidido na revelacao, comparando todos.
    points: hit && room.gameMode === 'classic' ? pointsFor(item.pos) : 0,
  };
  room.round.answers[playerId] = entry;
  room.round.order.push(playerId);
  return { ok: true, entry };
}

function optionItems(category, positions) {
  return positions.map((pos) => category.items.find((it) => it.pos === pos));
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

  const target = room.round.target;
  let winnerId = null;
  if (room.gameMode === 'target') {
    for (const r of results) r.distance = r.status === 'hit' ? Math.abs(r.pos - target) : null;
    const closest = Math.min(...results.filter((r) => r.distance != null).map((r) => r.distance));
    const winners = results.filter((r) => r.distance === closest);
    if (winners.length === 1) {
      winnerId = winners[0].playerId;
      winners[0].points = 1;
    }
  }

  for (const r of results) {
    const p = room.players.find((x) => x.id === r.playerId);
    if (!p) continue;
    // melhor palpite ANTES desta rodada: fica marcado no painel até ser superado
    r.prevBest = p.best ? { ...p.best } : null;
    p.score += r.points;
    // "melhor chute" = o mais perto do 100; so faz sentido no classico
    if (room.gameMode === 'classic' && r.status === 'hit' && (!p.best || r.pos > p.best.pos)) p.best = { pos: r.pos, pt: r.pt };
    if (r.status === 'hit' && !room.used.some((u) => u.pos === r.pos)) {
      room.used.push({ pos: r.pos, pt: r.pt, title: r.title });
    }
  }
  room.used.sort((a, b) => a.pos - b.pos);

  // melhor POSICAO da rodada (o aviso de 95+ olha a posicao)
  const best = results.reduce((m, r) => (r.status === 'hit' ? Math.max(m, r.pos) : m), 0);
  // 95+ (concede / morte subita) so existe no classico
  const classic = room.gameMode === 'classic';
  room.concedeOffered = classic && best >= CONCEDE_THRESHOLD;
  const top = results.filter((r) => r.status === 'hit').sort((a, b) => b.pos - a.pos)[0];
  const jackpot = classic && top && top.pos >= CONCEDE_THRESHOLD ? { playerId: top.playerId, name: top.name, pos: top.pos, pt: top.pt } : null;

  room.lastReveal = { number: room.round.number, results, best, jackpot, target, winnerId };
  room.history.push({ number: room.round.number, results });
  room.round = null;
  return room.lastReveal;
}

/** A rodada atual e a ultima combinada (ou uma extra, depois dela)? */
export function isLastRound(room) {
  return room.roundNumber >= room.maxRounds;
}

/** Empate no primeiro lugar (com 2+ jogadores): o fim de partida oferece desempate. */
export function tiedForFirst(room) {
  const r = ranking(room);
  return r.length > 1 && r[0].score === r[1].score;
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
    maxRounds: room.maxRounds,
    gameMode: room.gameMode,
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
      target: room.round.target,
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
