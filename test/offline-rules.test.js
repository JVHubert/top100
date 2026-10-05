// Testes das regras do modo offline (node --test). Rode com: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { findItem } from '../src/matching.js';
import {
  makeRoom,
  addPlayer,
  startRound,
  submitAnswer,
  revealRound,
  ranking,
  endGame,
  oneMoreRound,
  suddenDeathResult,
  publicState,
  CONCEDE_THRESHOLD,
} from '../src/offline-rules.js';
import { getCategory, DEFAULT_CATEGORY_ID } from '../src/categories.js';

const category = getCategory(DEFAULT_CATEGORY_ID);

test('findItem: titulo em ingles, em portugues e com erro de digitacao', () => {
  assert.equal(findItem(category, 'The Matrix').rank, 16);
  assert.equal(findItem(category, 'o poderoso chefao').rank, 2);
  assert.equal(findItem(category, 'Intersteller').rank, 17);
});

test('findItem: nome que serve para varios filmes nao pontua', () => {
  assert.equal(findItem(category, 'batman'), null);
});

test('findItem: fora da lista retorna null', () => {
  assert.equal(findItem(category, 'Avatar 3'), null);
});

test('pontuacao: pontos = posicao', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  const res = submitAnswer(room, category, 'p1', 'The Matrix');
  assert.equal(res.ok, true);
  assert.equal(res.entry.points, 16); // #16 -> 16
});

test('pontuacao: item fora da lista vale zero', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  const res = submitAnswer(room, category, 'p1', 'Avatar 3');
  assert.equal(res.entry.rank, null);
  assert.equal(res.entry.points, 0);
});

test('nao permite responder duas vezes na mesma rodada', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'The Matrix');
  const again = submitAnswer(room, category, 'p1', 'Requiem for a Dream');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'already-answered');
});

test('reveal: acumula pontos e monta o placar', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'The Matrix'); // #16 -> 16 pts
  submitAnswer(room, category, 'p2', 'Requiem for a Dream'); // #96 -> 96 pts
  revealRound(room);

  assert.equal(room.phase, 'reveal');
  const board = ranking(room);
  assert.equal(board[0].name, 'Bia');
  assert.equal(board[0].score, 96);
  assert.equal(board[1].score, 16);
});

test('concede e oferecido quando alguem faz 95+', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'Ikiru'); // rank 98
  const reveal = revealRound(room);
  assert.equal(reveal.best, 98);
  assert.equal(room.concedeOffered, true);
  assert.ok(CONCEDE_THRESHOLD <= reveal.best);
});

test('publicState: esconde as respostas dos outros durante a rodada', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'The Matrix');

  const viewForP2 = publicState(room, 'p2');
  assert.deepEqual(viewForP2.round.submitted, ['p1']);
  assert.equal(viewForP2.round.youAnswered, false);
  assert.equal(viewForP2.round.youAnswer, null);
  assert.equal(JSON.stringify(viewForP2).includes('The Matrix'), false);
  assert.equal(viewForP2.reveal, undefined);
});

test('endGame: encerra e devolve o ranking final', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'The Matrix');
  revealRound(room);
  const final = endGame(room);
  assert.equal(room.phase, 'ended');
  assert.equal(final[0].position, 1);
  assert.equal(final[0].score, 16);
});

test('filme ja revelado fica queimado na partida', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'Clube da Luta');
  revealRound(room);
  assert.deepEqual(room.used.map((u) => u.pos), [13]);

  startRound(room);
  const again = submitAnswer(room, category, 'p1', 'fight club');
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'burned');
});

test('nome ambiguo e recusado sem gastar a vez', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  const vague = submitAnswer(room, category, 'p1', 'batman');
  assert.equal(vague.ok, false);
  assert.equal(vague.reason, 'ambiguous');
  assert.equal(room.round.answers.p1, undefined);
  assert.equal(submitAnswer(room, category, 'p1', 'cavaleiro das trevas ressurge').entry.pos, 78);
});

test('revelacao marca fora e o jackpot de 95+', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  addPlayer(room, { id: 'p3', name: 'Caio', avatar: '🐸' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'Clube da Luta');
  submitAnswer(room, category, 'p2', 'Avatar 3');
  submitAnswer(room, category, 'p3', 'brilho eterno');
  const reveal = revealRound(room);
  const byName = Object.fromEntries(reveal.results.map((r) => [r.name, r]));
  assert.equal(byName.Ana.pos, 13);
  assert.equal(byName.Bia.status, 'miss');
  assert.equal(byName.Caio.status, 'hit');
  assert.deepEqual(reveal.jackpot, { playerId: 'p3', name: 'Caio', pos: 100, pt: 'Brilho Eterno de uma Mente sem Lembranças' });
  assert.equal(ranking(room)[0].best.pos, 100);
});

import { pointsFor } from '../src/scoring.js';

test('pontuacao linear: cada posicao vale o proprio numero (ADR-0014)', () => {
  for (const pos of [1, 10, 20, 37, 50, 90, 95, 99, 100]) assert.equal(pointsFor(pos), pos, `#${pos}`);
});

test('mais um round: reabre a partida encerrada mantendo placar e queimados', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'brilho eterno'); // #100
  const rev = revealRound(room);
  assert.equal(rev.jackpot.pos, 100);
  endGame(room);
  assert.equal(oneMoreRound(room).number, 2);
  assert.equal(room.phase, 'round');
  assert.equal(room.players[0].score, 100);
  assert.equal(submitAnswer(room, category, 'p1', 'brilho eterno').reason, 'burned');
  assert.equal(oneMoreRound(room), null); // só reabre partida encerrada
});

test('revelação guarda o melhor palpite anterior de cada jogador', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'Clube da Luta'); // #13
  assert.equal(revealRound(room).results[0].prevBest, null);
  startRound(room);
  submitAnswer(room, category, 'p1', 'Avatar 3'); // fora
  assert.equal(revealRound(room).results[0].prevBest.pos, 13);
});

test('morte súbita: só supera quem passar da posição alvo', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  startRound(room);
  submitAnswer(room, category, 'p1', 'Ikiru'); // #98
  submitAnswer(room, category, 'p2', 'Clube da Luta');
  const target = revealRound(room).jackpot.pos;
  assert.equal(target, 98);

  startRound(room); // rodada de morte súbita
  submitAnswer(room, category, 'p1', 'Matrix');
  submitAnswer(room, category, 'p2', 'A Caça'); // #99
  assert.deepEqual(suddenDeathResult(revealRound(room), target), { beaten: true, best: 99 });

  startRound(room);
  submitAnswer(room, category, 'p1', 'Incêndios'); // #97
  submitAnswer(room, category, 'p2', 'Avatar 3');
  assert.equal(suddenDeathResult(revealRound(room), 99).beaten, false);
});
