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
  isLastRound,
  clampRounds,
  DEFAULT_ROUNDS,
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

test('nome ambiguo vira "qual voce quis dizer?" sem gastar a vez (ADR-0015)', () => {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: category.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  const vague = submitAnswer(room, category, 'p1', 'batman');
  assert.equal(vague.ok, false);
  assert.equal(vague.reason, 'choose');
  assert.deepEqual(vague.options.map((it) => it.pos).sort((a, b) => a - b), [3, 78]);
  assert.equal(room.round.answers.p1, undefined);
  assert.equal(submitAnswer(room, category, 'p1', null, { pick: 78 }).entry.pos, 78);
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

test('numero de rodadas: padrao, limites de 1 a 10 e entrada estranha', () => {
  assert.equal(makeRoom({ code: 'T', hostId: 'p1', categoryId: category.id }).maxRounds, DEFAULT_ROUNDS);
  assert.equal(clampRounds(3), 3);
  assert.equal(clampRounds(0), 1);
  assert.equal(clampRounds(42), 10);
  assert.equal(clampRounds('7'), 7);
  assert.equal(clampRounds('abc'), DEFAULT_ROUNDS);
  assert.equal(clampRounds(2.6), 3);
});

test('numero de rodadas: a ultima rodada e reconhecida, e "mais um round" passa do limite', () => {
  const room = makeRoom({ code: 'T', hostId: 'p1', categoryId: category.id, maxRounds: 2 });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  startRound(room);
  assert.equal(isLastRound(room), false);
  revealRound(room);
  startRound(room);
  assert.equal(isLastRound(room), true);
  revealRound(room);
  endGame(room);
  oneMoreRound(room);
  assert.equal(room.roundNumber, 3);
  assert.equal(isLastRound(room), true); // extra: termina de novo no resultado final
  assert.equal(publicState(room, 'p1').maxRounds, 2);
});

// ---------- "Qual voce quis dizer?" (ADR-0015) ----------
const clubs = getCategory('top100-clubes-cbf');
function clubRoom() {
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: clubs.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  startRound(room);
  return room;
}
const titles = (res) => res.options.map((it) => it.title);

test('sugestao: erro de digitacao e palavras a mais ("villa nova de goias") oferecem o item', () => {
  const room = clubRoom();
  const res = submitAnswer(room, clubs, 'p1', 'villa nova de goias');
  assert.equal(res.reason, 'choose');
  assert.equal(titles(res)[0], 'Vila Nova');
  const ok = submitAnswer(room, clubs, 'p1', null, { pick: 29 });
  assert.equal(ok.entry.pos, 29);
  assert.equal(ok.entry.points, 29);
  assert.equal(ok.entry.text, 'villa nova de goias');
  assert.deepEqual(titles(submitAnswer(room, clubs, 'p2', 'Vila Nova-GO')), ['Vila Nova']);
});

test('sugestao: nome que serve para varios lista as opcoes ("atletico")', () => {
  const res = submitAnswer(clubRoom(), clubs, 'p1', 'atletico');
  assert.equal(res.reason, 'choose');
  assert.deepEqual([...titles(res)].sort(), ['Athletico-PR', 'Atlético-GO', 'Atlético-MG']);
});

test('sugestao: aberta a pergunta, nao da para redigitar; so escolher ou enviar como escreveu', () => {
  const room = clubRoom();
  submitAnswer(room, clubs, 'p1', 'atletico');
  const retype = submitAnswer(room, clubs, 'p1', 'flamengo');
  assert.equal(retype.reason, 'must-choose');
  assert.equal(retype.options.length, 3);
  assert.equal(submitAnswer(room, clubs, 'p1', null, { pick: 1 }).reason, 'must-choose'); // fora das opcoes
  const sent = submitAnswer(room, clubs, 'p1', null, { asTyped: true });
  assert.equal(sent.ok, true);
  assert.equal(sent.entry.status, 'ambiguous');
  assert.equal(sent.entry.points, 0);
  assert.equal(sent.entry.text, 'atletico');
});

test('sugestao: nome certo passa direto; nada parecido vale fora sem perguntar', () => {
  const room = clubRoom();
  assert.equal(submitAnswer(room, clubs, 'p1', 'Palmeiras').entry.pos, 3);
  const far = submitAnswer(room, clubs, 'p2', 'Real Madrid');
  assert.equal(far.ok, true);
  assert.equal(far.entry.status, 'miss');
});

test('sugestao: menos de 4 letras nao sugere; item queimado nao aparece como opcao', () => {
  const room = clubRoom();
  const short = submitAnswer(room, clubs, 'p1', 'atl');
  assert.equal(short.ok, true); // sem pergunta: vale como foi digitado
  assert.equal(short.entry.status, 'miss');
  room.used.push({ pos: 4, pt: 'Atlético-MG', title: 'Atlético-MG' });
  const res = submitAnswer(room, clubs, 'p2', 'atletico');
  assert.equal(res.reason, 'choose');
  assert.equal(titles(res).includes('Atlético-MG'), false);
});

test('sugestao: nomes de fora parecidos nao pontuam sozinhos (Mario, Luiza)', () => {
  const names = getCategory('top100-nomes-brasil');
  const room = makeRoom({ code: 'TEST', hostId: 'p1', categoryId: names.id });
  addPlayer(room, { id: 'p1', name: 'Ana', avatar: '🦊' });
  addPlayer(room, { id: 'p2', name: 'Bia', avatar: '🐼' });
  startRound(room);
  assert.equal(submitAnswer(room, names, 'p1', 'Mario').entry.points, 0);
  const luiza = submitAnswer(room, names, 'p2', 'Luiza');
  assert.equal(luiza.reason, 'choose'); // pergunta, mas so pontua se o jogador escolher
  assert.equal(room.round.answers.p2, undefined);
});
