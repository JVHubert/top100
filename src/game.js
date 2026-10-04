import crypto from 'node:crypto';
import { AVATARS, COLORS } from './look.js';
import { categoryUi, fillText } from './category-ui.js';
import { pointsFor } from './scoring.js';

const LIMITS = Object.freeze({
  MAX_PLAYERS: 12,
  NAME_MAX: 16,
  ANSWER_MAX: 80,
  ROUND_SECONDS_OPTIONS: [30, 45, 60, 90],
  DEFAULT_ROUND_SECONDS: 45,
  JACKPOT_POSITION: 95, // regra da casa: quem crava 95+ praticamente fecha o tema
  LOBBY_GRACE_MS: 20_000, // tempo para dar F5 no lobby sem perder o lugar
});


const PHASES = Object.freeze({ LOBBY: 'lobby', ROUND: 'round', REVEAL: 'reveal', FINAL: 'final' });

class GameError extends Error {}

function newId() {
  return crypto.randomBytes(8).toString('hex');
}
function newToken() {
  return crypto.randomBytes(18).toString('base64url');
}
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function cleanName(raw) {
  if (typeof raw !== 'string') throw new GameError('Digite um nome.');
  // remove caracteres de controle e espaços repetidos
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!name) throw new GameError('Digite um nome.');
  if ([...name].length > LIMITS.NAME_MAX) throw new GameError(`O nome pode ter até ${LIMITS.NAME_MAX} caracteres.`);
  return name;
}

function cleanLook({ avatar, color }) {
  return {
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[0],
    color: COLORS.includes(color) ? color : COLORS[0],
  };
}

class Room {
  /**
   * @param {object} opts
   * @param {string} opts.code
   * @param {object} opts.category  { name, snapshot, items }
   * @param {import('./matcher').Matcher} opts.matcher
   * @param {(room: Room) => void} opts.onChange  chamado sempre que o estado público muda
   * @param {(id: string) => ({ category, matcher } | null)} [opts.catalog]  troca de categoria no lobby
   * @param {() => number} [opts.now]
   */
  constructor({ code, category, matcher, onChange, catalog = null, now = Date.now }) {
    this.code = code;
    this.category = category;
    this.matcher = matcher;
    this.catalog = catalog;
    this.onChange = onChange || (() => {});
    this.now = now;
    this.createdAt = now();
    this.lastActivityAt = this.createdAt;

    this.phase = PHASES.LOBBY;
    this.hostId = null;
    this.settings = { roundSeconds: LIMITS.DEFAULT_ROUND_SECONDS };
    this.players = new Map(); // id -> player
    this.roundNumber = 0;
    this.round = null; // { number, startedAt, endsAt, participants:Set, answers: Map }
    this.lastReveal = null;
    this.usedPositions = new Map(); // pos -> { pos, title, pt, year, round }
    this.timers = { round: null, lobby: new Map() };
  }

  // ---------- jogadores ----------

  addPlayer({ name, avatar, color }) {
    const clean = cleanName(name);
    if (this.players.size >= LIMITS.MAX_PLAYERS) throw new GameError('A sala está cheia.');
    const taken = [...this.players.values()].some((p) => p.name.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'));
    if (taken) throw new GameError('Já tem alguém com esse nome na sala. Escolha outro.');

    const player = {
      id: newId(),
      token: newToken(),
      name: clean,
      ...cleanLook({ avatar, color }),
      score: 0,
      best: null,
      connected: true,
      joinedAt: this.now(),
    };
    this.players.set(player.id, player);
    if (!this.hostId) this.hostId = player.id;
    if (this.phase === PHASES.ROUND && this.round) this.round.participants.add(player.id);
    this.touch();
    this.onChange(this);
    return player;
  }

  /** Reconecta um jogador existente (F5, queda de rede). */
  resume(playerId, token) {
    const p = this.players.get(playerId);
    if (!p || !safeEqual(p.token, token)) throw new GameError('Sessão expirada. Entre na sala de novo.');
    const pending = this.timers.lobby.get(playerId);
    if (pending) {
      clearTimeout(pending);
      this.timers.lobby.delete(playerId);
    }
    p.connected = true;
    if (!this.hostId || !this.players.get(this.hostId)?.connected) this.hostId = p.id;
    this.touch();
    this.onChange(this);
    return p;
  }

  markDisconnected(playerId) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.connected = false;
    if (this.hostId === playerId) this.reassignHost();

    if (this.phase === PHASES.LOBBY) {
      // No lobby, quem sumiu sai da lista depois de um tempinho (dá tempo de um F5).
      const t = setTimeout(() => {
        this.timers.lobby.delete(playerId);
        const still = this.players.get(playerId);
        if (still && !still.connected && this.phase === PHASES.LOBBY) this.removePlayer(playerId);
      }, LIMITS.LOBBY_GRACE_MS);
      t.unref?.();
      this.timers.lobby.set(playerId, t);
    } else if (this.phase === PHASES.ROUND) {
      // Durante a partida o jogador fica (mantém a pontuação), mas não seguramos a rodada por ele.
      this.maybeCloseRoundEarly();
    }
    this.onChange(this);
  }

  removePlayer(playerId) {
    if (!this.players.delete(playerId)) return;
    if (this.round) this.round.participants.delete(playerId);
    if (this.hostId === playerId) this.reassignHost();
    this.onChange(this);
  }

  reassignHost() {
    const next = [...this.players.values()]
      .filter((p) => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt)[0];
    this.hostId = next ? next.id : this.hostId && this.players.has(this.hostId) ? this.hostId : null;
  }

  connectedCount() {
    let n = 0;
    for (const p of this.players.values()) if (p.connected) n++;
    return n;
  }

  // ---------- ações do host ----------

  assertHost(playerId) {
    if (playerId !== this.hostId) throw new GameError('Só o host pode fazer isso.');
  }

  updateSettings(playerId, { roundSeconds, categoryId }) {
    this.assertHost(playerId);
    if (this.phase !== PHASES.LOBBY) throw new GameError('As configurações só mudam no lobby.');
    if (roundSeconds !== undefined) {
      if (!LIMITS.ROUND_SECONDS_OPTIONS.includes(roundSeconds)) throw new GameError('Tempo de rodada inválido.');
      this.settings.roundSeconds = roundSeconds;
    }
    if (categoryId !== undefined) {
      const found = typeof categoryId === 'string' && this.catalog ? this.catalog(categoryId) : null;
      if (!found) throw new GameError('Categoria inválida.');
      this.category = found.category;
      this.matcher = found.matcher;
    }
    this.touch();
    this.onChange(this);
  }

  startMatch(playerId) {
    this.assertHost(playerId);
    if (this.phase !== PHASES.LOBBY) throw new GameError('A partida já começou.');
    this.startRound();
  }

  nextRound(playerId) {
    this.assertHost(playerId);
    if (this.phase !== PHASES.REVEAL) throw new GameError('Espere a revelação terminar.');
    this.startRound();
  }

  endMatch(playerId) {
    this.assertHost(playerId);
    if (this.phase !== PHASES.REVEAL) throw new GameError('Dá pra encerrar ao fim de uma rodada.');
    this.phase = PHASES.FINAL;
    this.touch();
    this.onChange(this);
  }

  /** Volta ao lobby com placar zerado, mantendo os jogadores. */
  restart(playerId) {
    this.assertHost(playerId);
    if (this.phase !== PHASES.FINAL) throw new GameError('Encerre a partida antes de recomeçar.');
    this.phase = PHASES.LOBBY;
    this.roundNumber = 0;
    this.round = null;
    this.lastReveal = null;
    this.usedPositions.clear();
    for (const p of this.players.values()) {
      p.score = 0;
      p.best = null;
    }
    // quem estava offline sai agora
    for (const p of [...this.players.values()]) if (!p.connected) this.players.delete(p.id);
    if (!this.players.has(this.hostId)) this.reassignHost();
    this.touch();
    this.onChange(this);
  }

  // ---------- rodada ----------

  startRound() {
    this.roundNumber += 1;
    const startedAt = this.now();
    const durationMs = this.settings.roundSeconds * 1000;
    this.round = {
      number: this.roundNumber,
      startedAt,
      durationMs,
      endsAt: startedAt + durationMs,
      participants: new Set([...this.players.keys()]),
      answers: new Map(), // playerId -> { text, result, submittedAt }
    };
    this.phase = PHASES.ROUND;
    clearTimeout(this.timers.round);
    this.timers.round = setTimeout(() => this.closeRound('timeout'), durationMs + 250); // folga de rede
    this.timers.round.unref?.();
    this.touch();
    this.onChange(this);
  }

  submitAnswer(playerId, rawText) {
    if (this.phase !== PHASES.ROUND || !this.round) throw new GameError('Não tem rodada aberta agora.');
    if (!this.players.has(playerId)) throw new GameError('Você não está nesta sala.');
    if (this.now() > this.round.endsAt + 250) throw new GameError('O tempo acabou.');
    if (this.round.answers.has(playerId)) throw new GameError('Você já enviou seu chute nesta rodada.');
    const ui = categoryUi(this.category);
    if (typeof rawText !== 'string') throw new GameError(ui.empty);
    const text = rawText.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
    if (!text) throw new GameError(ui.empty);
    if ([...text].length > LIMITS.ANSWER_MAX) throw new GameError('Resposta comprida demais.');

    const result = this.matcher.match(text);
    // Nome que serve para mais de um item ("Batman"): pede para especificar em vez de
    // gastar a vez. Revela só que existe mais de um parecido na lista (ver docs/adr/0009).
    if (result.status === 'ambiguous') throw new GameError(ui.ambiguous);
    // Item já revelado numa rodada anterior não vale de novo: todo mundo já sabe a posição dele.
    if (result.status === 'match' && this.usedPositions.has(result.item.pos)) {
      throw new GameError(fillText(ui.burned, { item: result.item.pt || result.item.title }));
    }

    this.round.participants.add(playerId);
    this.round.answers.set(playerId, { text, result, submittedAt: this.now() });
    this.touch();
    this.onChange(this);
    this.maybeCloseRoundEarly();
    return { text };
  }

  maybeCloseRoundEarly() {
    if (this.phase !== PHASES.ROUND || !this.round) return;
    const waitingOn = [...this.round.participants].filter((id) => {
      const p = this.players.get(id);
      return p && p.connected && !this.round.answers.has(id);
    });
    if (waitingOn.length === 0) this.closeRound('all_answered');
  }

  closeRound(reason) {
    if (this.phase !== PHASES.ROUND || !this.round) return;
    clearTimeout(this.timers.round);
    const round = this.round;
    const results = [];

    for (const id of round.participants) {
      const p = this.players.get(id);
      if (!p) continue;
      const answer = round.answers.get(id);
      const base = { playerId: id, name: p.name, avatar: p.avatar, color: p.color };
      if (!answer) {
        results.push({ ...base, text: null, status: 'no_answer', points: 0 });
        continue;
      }
      const r = answer.result;
      if (r.status === 'match') {
        const { pos, title, year, detail } = r.item;
        const pt = r.item.pt || title;
        results.push({ ...base, text: answer.text, status: 'hit', pos, title, pt, year, detail, points: pointsFor(pos) });
      } else {
        results.push({ ...base, text: answer.text, status: r.status === 'ambiguous' ? 'ambiguous' : 'miss', points: 0 });
      }
    }

    // aplica pontos e marca itens como "queimados"
    for (const res of results) {
      const p = this.players.get(res.playerId);
      p.score += res.points;
      if (res.status === 'hit') {
        if (!p.best || res.pos > p.best.pos) p.best = { pos: res.pos, pt: res.pt, title: res.title, round: round.number };
        if (!this.usedPositions.has(res.pos)) {
          this.usedPositions.set(res.pos, { pos: res.pos, title: res.title, pt: res.pt, year: res.year, round: round.number });
        }
      }
    }

    // ordem de revelação: do pior para o melhor (suspense)
    results.sort((a, b) => a.points - b.points || a.name.localeCompare(b.name, 'pt-BR'));
    const top = results.filter((r) => r.status === 'hit').sort((a, b) => b.points - a.points)[0];
    const jackpot = top && top.pos >= LIMITS.JACKPOT_POSITION ? { playerId: top.playerId, name: top.name, pos: top.pos, pt: top.pt } : null;

    this.lastReveal = { number: round.number, reason, results, jackpot };
    this.round = null;
    this.phase = PHASES.REVEAL;
    this.touch();
    this.onChange(this);
  }

  // ---------- visões ----------

  ranking() {
    return [...this.players.values()]
      .map((p) => ({ playerId: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, best: p.best, connected: p.connected }))
      .sort((a, b) => b.score - a.score || (b.best?.pos || 0) - (a.best?.pos || 0) || a.name.localeCompare(b.name, 'pt-BR'));
  }

  /**
   * Estado que um jogador específico pode ver. Nunca inclui os chutes dos outros
   * antes da revelação, nem a lista do ranking (ficam só no servidor).
   */
  viewFor(viewerId) {
    const inRound = this.phase === PHASES.ROUND && this.round;
    const players = [...this.players.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        score: p.score,
        connected: p.connected,
        isHost: p.id === this.hostId,
        answered: inRound ? this.round.answers.has(p.id) : false,
      }));
    const myAnswer = inRound ? this.round.answers.get(viewerId) : null;

    return {
      code: this.code,
      phase: this.phase,
      hostId: this.hostId,
      settings: { ...this.settings },
      limits: { maxPlayers: LIMITS.MAX_PLAYERS, answerMax: LIMITS.ANSWER_MAX, jackpot: LIMITS.JACKPOT_POSITION },
      category: { id: this.category.id, name: this.category.name, snapshotDate: this.category.snapshot.date, ui: categoryUi(this.category) },
      players,
      roundNumber: this.roundNumber,
      round: inRound ? { number: this.round.number, endsAt: this.round.endsAt, durationMs: this.round.durationMs } : null,
      lastReveal: this.phase === PHASES.REVEAL || this.phase === PHASES.FINAL ? this.lastReveal : null,
      used: [...this.usedPositions.values()].sort((a, b) => a.pos - b.pos),
      ranking: this.ranking(),
      me: { id: viewerId, answer: myAnswer ? myAnswer.text : null },
      serverNow: this.now(),
    };
  }

  touch() {
    this.lastActivityAt = this.now();
  }

  dispose() {
    clearTimeout(this.timers.round);
    for (const t of this.timers.lobby.values()) clearTimeout(t);
    this.timers.lobby.clear();
  }
}

// Sem I, O, 0 e 1 para não confundir quem lê o código em voz alta.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

class RoomManager {
  /**
   * @param {object} opts
   * @param {object} opts.category  categoria padrao das salas novas
   * @param {object} opts.matcher   matcher dessa categoria
   * @param {(id: string) => ({ category, matcher } | null)} [opts.catalog]  permite trocar no lobby
   */
  constructor({ category, matcher, onChange, catalog = null, codeLength = 4 }) {
    this.category = category;
    this.matcher = matcher;
    this.catalog = catalog;
    this.onChange = onChange;
    this.codeLength = codeLength;
    this.rooms = new Map();
  }

  generateCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < this.codeLength; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new GameError('Não consegui criar uma sala agora. Tente de novo.');
  }

  create() {
    const code = this.generateCode();
    const room = new Room({ code, category: this.category, matcher: this.matcher, catalog: this.catalog, onChange: this.onChange });
    this.rooms.set(code, room);
    return room;
  }

  get(code) {
    if (typeof code !== 'string') return null;
    return this.rooms.get(code.trim().toUpperCase()) || null;
  }

  /** Remove salas abandonadas. */
  sweep({ idleMs = 10 * 60_000, maxAgeMs = 12 * 3_600_000 } = {}) {
    const now = Date.now();
    let removed = 0;
    for (const [code, room] of this.rooms) {
      const abandoned = room.connectedCount() === 0 && now - room.lastActivityAt > idleMs;
      if (abandoned || now - room.createdAt > maxAgeMs) {
        room.dispose();
        this.rooms.delete(code);
        removed++;
      }
    }
    return removed;
  }
}

export { Room, RoomManager, GameError, LIMITS, AVATARS, COLORS, PHASES, cleanName };
