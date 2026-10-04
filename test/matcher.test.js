import test from 'node:test';
import assert from 'node:assert/strict';
import { Matcher } from '../src/matcher.js';
import { getCategory, DEFAULT_CATEGORY_ID } from '../src/categories.js';

const { items } = getCategory(DEFAULT_CATEGORY_ID);

const m = new Matcher(items);
const pos = (t) => { const r = m.match(t); return r.status === 'match' ? r.item.pos : r.status; };

test('snapshot tem 100 posições contíguas', () => {
  assert.equal(items.length, 100);
  items.forEach((it, i) => assert.equal(it.pos, i + 1));
});

test('aceita títulos em inglês, português e apelidos', () => {
  assert.equal(pos('The Shawshank Redemption'), 1);
  assert.equal(pos('um sonho de liberdade'), 1);
  assert.equal(pos('Clube da Luta'), 13);
  assert.equal(pos('Brilho Eterno'), 100);
  assert.equal(pos('Coco'), 76);
  assert.equal(pos('Viva: A Vida é uma Festa'), 76);
});

test('ignora acentos, caixa, artigos e pontuação', () => {
  assert.equal(pos('O PODEROSO CHEFAO'), 2);
  assert.equal(pos('lista de schindler'), 7);
  assert.equal(pos("Schindlers List"), 7);
  assert.equal(pos('de volta pro futuro'), 29);
  assert.equal(pos('wall-e'), 55);
});

test('números, romanos e por extenso são equivalentes', () => {
  assert.equal(pos('Poderoso Chefão 2'), 4);
  assert.equal(pos('Godfather Part II'), 4);
  assert.equal(pos('Duna parte dois'), 60);
  assert.equal(pos('doze homens e uma sentença'), 6);
  assert.equal(pos('Star Wars Episódio V'), 15);
  assert.equal(pos('star wars 6'), 94);
});

test('continuações com número diferente NÃO batem', () => {
  assert.equal(pos('Toy Story 2'), 'none');
  assert.equal(pos('Toy Story 3'), 92);
  assert.equal(pos('Kill Bill Vol. 1'), 'none');
  assert.equal(pos('Joker 2'), 'none');
  assert.equal(pos('Cidade de Deus 2'), 'none');
});

test('tolera erro de digitação leve', () => {
  assert.equal(pos('Interstelar'), 17);
  assert.equal(pos('Forest Gump'), 12);
  assert.equal(pos('O Silencio dos Inocentis'), 22);
});

test('título que serve para vários filmes é ambíguo', () => {
  assert.equal(pos('Batman'), 'ambiguous');
  assert.equal(pos('Vingadores'), 'ambiguous');
  assert.equal(pos('Senhor dos Anéis'), 'ambiguous');
});

test('filmes fora da lista e palavras soltas não pontuam', () => {
  assert.equal(pos('Titanic'), 'none');
  assert.equal(pos('Tropa de Elite'), 'none');
  assert.equal(pos('Leão'), 'none');
  assert.equal(pos(''), 'none');
  assert.equal(pos('   '), 'none');
});
