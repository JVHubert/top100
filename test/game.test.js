import test from 'node:test';
import assert from 'node:assert/strict';
import { Room, GameError } from '../src/game.js';
import { Matcher } from '../src/matcher.js';
import { getCategory, DEFAULT_CATEGORY_ID } from '../src/categories.js';

const category = getCategory(DEFAULT_CATEGORY_ID);

function makeRoom() {
  return new Room({ code: 'TEST', category, matcher: new Matcher(category.items) });
}

test('fluxo completo: lobby -> rodada -> revelação -> final', () => {
  const room = makeRoom();
  const a = room.addPlayer({ name: 'Ana', avatar: '🍿', color: '#FF5A5F' });
  const b = room.addPlayer({ name: 'Beto', avatar: '🤖', color: '#2EC4B6' });
  assert.equal(room.hostId, a.id);
  assert.throws(() => room.startMatch(b.id), GameError);
  room.startMatch(a.id);
  assert.equal(room.phase, 'round');

  room.submitAnswer(a.id, 'Brilho eterno de uma mente sem lembranças');
  // chute de A não vaza para B antes da revelação
  const viewB = room.viewFor(b.id);
  assert.equal(viewB.me.answer, null);
  assert.equal(JSON.stringify(viewB).includes('Brilho'), false);
  assert.equal(viewB.players.find((p) => p.id === a.id).answered, true);

  room.submitAnswer(b.id, 'Titanic'); // fecha a rodada: todos responderam
  assert.equal(room.phase, 'reveal');
  const rev = room.lastReveal;
  assert.equal(rev.results.find((r) => r.playerId === a.id).points, 100);
  assert.equal(rev.results.find((r) => r.playerId === b.id).status, 'miss');
  assert.equal(rev.jackpot.playerId, a.id);

  room.nextRound(a.id);
  // filme revelado fica queimado
  assert.throws(() => room.submitAnswer(b.id, 'Eternal Sunshine of the Spotless Mind'), /já saiu/);
  room.submitAnswer(b.id, 'A Caça');
  room.submitAnswer(a.id, 'Coringa');
  assert.equal(room.players.get(b.id).score, 99);
  assert.equal(room.players.get(a.id).score, 191); // 100 (#100) + 91 (#91)

  room.endMatch(a.id);
  assert.equal(room.phase, 'final');
  assert.deepEqual(room.ranking().map((r) => r.name), ['Ana', 'Beto']);

  room.restart(a.id);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.get(a.id).score, 0);
  assert.equal(room.usedPositions.size, 0);
  room.dispose();
});

test('não permite responder duas vezes nem nomes repetidos', () => {
  const room = makeRoom();
  const a = room.addPlayer({ name: 'Ana' });
  room.addPlayer({ name: 'Bia' });
  assert.throws(() => room.addPlayer({ name: 'ana' }), /nome/);
  room.startMatch(a.id);
  room.submitAnswer(a.id, 'Matrix');
  assert.throws(() => room.submitAnswer(a.id, 'Coringa'), /já enviou/);
  room.dispose();
});

test('jogador desconectado não segura a rodada; host é repassado', () => {
  const room = makeRoom();
  const a = room.addPlayer({ name: 'Ana' });
  const b = room.addPlayer({ name: 'Beto' });
  room.startMatch(a.id);
  room.submitAnswer(b.id, 'Matrix');
  room.markDisconnected(a.id);
  assert.equal(room.hostId, b.id);
  assert.equal(room.phase, 'reveal');
  assert.equal(room.lastReveal.results.find((r) => r.playerId === a.id).status, 'no_answer');
  // reconexão com token correto funciona; com token errado não
  assert.throws(() => room.resume(a.id, 'errado'), GameError);
  room.resume(a.id, room.players.get(a.id).token);
  assert.equal(room.players.get(a.id).connected, true);
  room.dispose();
});

test('host troca a categoria no lobby e os textos acompanham', () => {
  const cidades = {
    id: 'teste-cidades',
    name: 'Cidades de teste',
    snapshot: { date: '2026-10-03', source: 'teste' },
    ui: { noun: 'cidade', empty: 'Digite o nome de uma cidade.', burned: '{item} já saiu. Escolha outra.' },
    items: [
      { pos: 1, title: 'São Paulo', detail: 'SP' },
      { pos: 2, title: 'Rio de Janeiro', aliases: ['Rio'], detail: 'RJ' },
    ],
  };
  const catalog = (id) => (id === cidades.id ? { category: cidades, matcher: new Matcher(cidades.items) } : null);
  const room = new Room({ code: 'TEST', category, matcher: new Matcher(category.items), catalog });
  const a = room.addPlayer({ name: 'Ana' });
  const b = room.addPlayer({ name: 'Beto' });

  assert.throws(() => room.updateSettings(b.id, { categoryId: cidades.id }), GameError); // só o host
  assert.throws(() => room.updateSettings(a.id, { categoryId: 'nao-existe' }), /Categoria inválida/);
  room.updateSettings(a.id, { categoryId: cidades.id });
  const view = room.viewFor(b.id);
  assert.equal(view.category.id, cidades.id);
  assert.equal(view.category.ui.noun, 'cidade');
  assert.equal(view.category.ui.prompt, 'Qual item está perto do fundo do top 100?'); // padrão

  room.startMatch(a.id);
  assert.throws(() => room.submitAnswer(a.id, '   '), /uma cidade/);
  room.submitAnswer(a.id, 'rio');
  room.submitAnswer(b.id, 'Curitiba');
  const hit = room.lastReveal.results.find((r) => r.name === 'Ana');
  assert.deepEqual([hit.pos, hit.pt, hit.detail], [2, 'Rio de Janeiro', 'RJ']);

  room.nextRound(a.id);
  assert.throws(() => room.submitAnswer(a.id, 'Rio de Janeiro'), /Rio de Janeiro já saiu\. Escolha outra\./);
  assert.throws(() => room.updateSettings(a.id, { categoryId: cidades.id }), /só mudam no lobby/);
});
